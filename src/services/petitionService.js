import { supabase } from '../supabase/client'

export async function getPeticionById(id) {
  const { data, error } = await supabase
    .from('peticiones')
    .select(`
      id,
      titulo,
      descripcion,
      estado,
      score_urgencia,
      fotos,
      created_at,
      usuario_id,
      categorias (
        id,
        nombre
      ),
      zonas (
        id,
        nombre
      ),
      profiles (
        nombre,
        apellido
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function getCategorias() {
  const { data, error } = await supabase
    .from('categorias')
    .select('id, nombre')
    .eq('activa', true)
    .order('nombre')

  if (error) {
    throw error
  }

  return data
}

export async function getZonas() {
  const { data, error } = await supabase
    .from('zonas')
    .select('*')
    .eq('activa', true)
    .order('nombre')

  if (error) {
    throw error
  }

  return data
}

const BUCKET_FOTOS = 'peticiones'

// URL pública de una foto guardada en el bucket (la base guarda solo la ruta)
export function urlFotoPeticion(ruta) {
  return supabase.storage.from(BUCKET_FOTOS).getPublicUrl(ruta).data.publicUrl
}

// Sube las fotos (ya comprimidas) a peticiones/<usuario>/<id>.jpg
// y devuelve sus rutas. Si una falla, borra las que ya se habían subido.
async function subirFotosPeticion(usuarioId, fotos) {
  const rutas = []

  try {
    for (const foto of fotos) {
      const ruta = `${usuarioId}/${crypto.randomUUID()}.jpg`

      const { error } = await supabase.storage
        .from(BUCKET_FOTOS)
        .upload(ruta, foto, { contentType: 'image/jpeg' })

      if (error) throw error

      rutas.push(ruta)
    }
  } catch (error) {
    await borrarFotosPeticion(rutas)
    throw error
  }

  return rutas
}

async function borrarFotosPeticion(rutas) {
  if (rutas.length === 0) return

  const { error } = await supabase.storage.from(BUCKET_FOTOS).remove(rutas)

  if (error) {
    console.error('No se pudieron borrar fotos huérfanas:', error)
  }
}

export async function createPeticion({
  usuarioId,
  titulo,
  descripcion,
  categoriaId,
  zonaId,
  ubicacion,
  fotos = [],
}) {
  const rutasFotos = await subirFotosPeticion(usuarioId, fotos)

  const fila = {
    usuario_id: usuarioId,
    titulo,
    descripcion,
    categoria_id: categoriaId,
    zona_id: zonaId,
    estado: 'pendiente',
    fotos: rutasFotos,
  }

  if (ubicacion) {
    fila.lat = ubicacion.lat
    fila.lng = ubicacion.lng
  }

  const { data, error } = await supabase
    .from('peticiones')
    .insert(fila)
    .select()
    .single()

  if (error) {
    // Sin petición, las fotos subidas quedarían huérfanas
    await borrarFotosPeticion(rutasFotos)
    throw error
  }

  return data
}

// ---------- Moderación (solo admins; lo garantizan los permisos de la base) ----------

const CAMPOS_EDITABLES_PETICION = ['titulo', 'descripcion', 'categoria_id', 'zona_id', 'estado']

export async function updatePeticion(peticionId, cambios) {
  const fila = Object.fromEntries(
    Object.entries(cambios).filter(([campo]) => CAMPOS_EDITABLES_PETICION.includes(campo))
  )

  const { error } = await supabase
    .from('peticiones')
    .update({ ...fila, updated_at: new Date().toISOString() })
    .eq('id', peticionId)

  if (error) {
    throw error
  }

  // Se vuelve a leer completa (con categoría, barrio y autor actualizados)
  return getPeticionById(peticionId)
}

// Borra la petición (sus firmas se borran en cascada) y después sus fotos
export async function deletePeticion(peticion) {
  const { error } = await supabase
    .from('peticiones')
    .delete()
    .eq('id', peticion.id)

  if (error) {
    throw error
  }

  await borrarFotosPeticion(peticion.fotos ?? [])
}

export async function getFirmasPeticion(peticionId) {
  const { data, error } = await supabase
    .from('firmas')
    .select('id, usuario_id, created_at')
    .eq('peticion_id', peticionId)

  if (error) {
    throw error
  }

  return data
}

export async function firmarPeticion(peticionId, usuarioId) {
  const { data, error } = await supabase
    .from('firmas')
    .insert({
      peticion_id: peticionId,
      usuario_id: usuarioId,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function retirarFirma(peticionId, usuarioId) {
  const { error } = await supabase
    .from('firmas')
    .delete()
    .eq('peticion_id', peticionId)
    .eq('usuario_id', usuarioId)

  if (error) {
    throw error
  }
}

export async function getMisPeticiones(usuarioId) {
  const { data, error } = await supabase
    .from('peticiones')
    .select(`
      id,
      titulo,
      descripcion,
      estado,
      score_urgencia,
      fotos,
      created_at,
      categorias (
        id,
        nombre
      ),
      zonas (
        id,
        nombre
      ),
      firmas (
        id
      )
    `)
    .eq('usuario_id', usuarioId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}

// `*` incluye lat/lng cuando existen esas columnas, sin fallar si todavía no se crearon
export async function getPeticionesPublicadas() {
  const { data, error } = await supabase
    .from('peticiones')
    .select(`
      *,
      categorias (
        id,
        nombre
      ),
      zonas (*),
      firmas (
        id
      )
    `)
    .eq('estado', 'publicada')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}

// Notificaciones derivadas de la actividad sobre las peticiones del usuario:
// cambios de estado (publicada / rechazada) y firmas recibidas.
export async function getNotificaciones(usuarioId) {
  const [peticionesRes, firmasRes] = await Promise.all([
    supabase
      .from('peticiones')
      .select('id, titulo, estado, created_at, updated_at')
      .eq('usuario_id', usuarioId)
      .in('estado', ['publicada', 'rechazada']),
    supabase
      .from('firmas')
      .select('id, created_at, peticion_id, peticiones!inner ( titulo, usuario_id )')
      .eq('peticiones.usuario_id', usuarioId)
      .neq('usuario_id', usuarioId)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (peticionesRes.error) {
    throw peticionesRes.error
  }

  if (firmasRes.error) {
    throw firmasRes.error
  }

  const cambiosEstado = peticionesRes.data.map((peticion) => ({
    id: `estado-${peticion.id}`,
    tipo: peticion.estado,
    peticionId: peticion.id,
    titulo: peticion.titulo,
    fecha: peticion.updated_at ?? peticion.created_at,
  }))

  const firmas = firmasRes.data.map((firma) => ({
    id: `firma-${firma.id}`,
    tipo: 'firma',
    peticionId: firma.peticion_id,
    titulo: firma.peticiones?.titulo,
    fecha: firma.created_at,
  }))

  return [...cambiosEstado, ...firmas].sort(
    (a, b) => new Date(b.fecha) - new Date(a.fecha)
  )
}

// Los eventos requieren la tabla `eventos` (ver supabase/schema.sql).
export async function getProximosEventos(limite = 50) {
  const { data, error } = await supabase
    .from('eventos')
    .select(`
      id,
      titulo,
      descripcion,
      fecha,
      lugar,
      zonas (
        id,
        nombre
      )
    `)
    .gte('fecha', new Date().toISOString())
    .order('fecha')
    .limit(limite)

  if (error) {
    throw error
  }

  return data
}

export async function createEvento({
  usuarioId,
  titulo,
  descripcion,
  fecha,
  lugar,
  zonaId,
}) {
  const { data, error } = await supabase
    .from('eventos')
    .insert({
      creado_por: usuarioId,
      titulo,
      descripcion,
      fecha,
      lugar,
      zona_id: zonaId || null,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deleteEvento(eventoId) {
  const { error } = await supabase
    .from('eventos')
    .delete()
    .eq('id', eventoId)

  if (error) {
    throw error
  }
}

// Feed de la comunidad. Requiere la tabla `publicaciones`
// (ver supabase/schema.sql).
export async function getPublicaciones() {
  const { data, error } = await supabase
    .from('publicaciones')
    .select(`
      id,
      tipo,
      contenido,
      created_at,
      usuario_id,
      profiles (
        nombre,
        apellido,
        avatar_url
      ),
      zonas (
        id,
        nombre
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    throw error
  }

  return data
}

export async function createPublicacion({
  usuarioId,
  tipo,
  contenido,
  zonaId,
}) {
  const { data, error } = await supabase
    .from('publicaciones')
    .insert({
      usuario_id: usuarioId,
      tipo,
      contenido,
      zona_id: zonaId || null,
    })
    .select(`
      id,
      tipo,
      contenido,
      created_at,
      usuario_id,
      profiles (
        nombre,
        apellido,
        avatar_url
      ),
      zonas (
        id,
        nombre
      )
    `)
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function deletePublicacion(publicacionId) {
  const { error } = await supabase
    .from('publicaciones')
    .delete()
    .eq('id', publicacionId)

  if (error) {
    throw error
  }
}

export async function getPeticionesPendientes() {
  const { data, error } = await supabase
    .from('peticiones')
    .select(`
      id,
      titulo,
      descripcion,
      estado,
      score_urgencia,
      fotos,
      created_at,
      profiles (
        nombre,
        apellido
      ),
      categorias (
        id,
        nombre
      ),
      zonas (
        id,
        nombre
      ),
      firmas (
        id
      )
    `)
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}

export async function cambiarEstadoPeticion(peticionId, nuevoEstado) {
  const { data, error } = await supabase
    .from('peticiones')
    .update({
      estado: nuevoEstado,
      updated_at: new Date().toISOString(),
    })
    .eq('id', peticionId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}
