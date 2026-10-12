import { supabase } from '../supabase/client'

// ---------- Anonimato ----------
// Entre vecinos, el autor y los firmantes de una petición son anónimos:
// la base no expone la columna usuario_id de las peticiones ni las firmas
// ajenas. Por eso las consultas listan las columnas visibles (no `*`) y el
// total de firmas sale del contador `firmas_count`. Las identidades solo las
// devuelve identidades_peticion(), y solo a funcionarios y admins.

const COLUMNAS_PETICION = `
  id,
  titulo,
  descripcion,
  estado,
  score_urgencia,
  lat,
  lng,
  fotos,
  firmas_count,
  created_at,
  updated_at
`

const CATEGORIA_Y_BARRIO = `
  categorias (
    id,
    nombre
  ),
  zonas (
    id,
    nombre,
    lat,
    lng
  )
`

export async function getPeticionById(id) {
  const { data, error } = await supabase
    .from('peticiones')
    .select(`${COLUMNAS_PETICION}, ${CATEGORIA_Y_BARRIO}`)
    .eq('id', id)
    .single()

  if (error) {
    throw error
  }

  return data
}

// Autor y firmantes de una petición: solo funcionarios y admins (lo verifica la base)
export async function getIdentidadesPeticion(peticionId) {
  const { data, error } = await supabase.rpc('identidades_peticion', {
    p_peticion: Number(peticionId),
  })

  if (error) {
    throw error
  }

  return data
}

// Categorías y zonas casi nunca cambian: se piden una vez por sesión y se
// reutilizan, así los formularios y el mapa abren sin esperar a la red.
const cache = new Map()

function cachear(clave, consulta) {
  if (!cache.has(clave)) {
    const promesa = consulta().catch((err) => {
      cache.delete(clave)
      throw err
    })
    cache.set(clave, promesa)
  }

  return cache.get(clave)
}

export function getCategorias() {
  return cachear('categorias', async () => {
    const { data, error } = await supabase
      .from('categorias')
      .select('id, nombre')
      .eq('activa', true)
      .order('nombre')

    if (error) {
      throw error
    }

    return data
  })
}

export function getZonas() {
  return cachear('zonas', async () => {
    const { data, error } = await supabase
      .from('zonas')
      .select('*')
      .eq('activa', true)
      .order('nombre')

    if (error) {
      throw error
    }

    return data
  })
}

// Precarga en segundo plano (por ejemplo, al pasar por "Nueva petición")
export function precargarOpciones() {
  getCategorias().catch(() => {})
  getZonas().catch(() => {})
}

export async function getEstadisticasPublicas() {
  const { data, error } = await supabase.rpc('estadisticas_publicas')

  if (error) {
    throw error
  }

  return data
}

// Solo administradores: la base rechaza la llamada para cualquier otro rol
export async function getEstadisticasAdmin() {
  const { data, error } = await supabase.rpc('estadisticas_admin')

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

  // Se devuelve solo el id: el autor no es una columna visible
  const { data, error } = await supabase
    .from('peticiones')
    .insert(fila)
    .select('id')
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

  // Se vuelve a leer completa (con categoría y barrio actualizados)
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

export async function getPeticionesPendientes() {
  const { data, error } = await supabase
    .rpc('peticiones_pendientes')
    .select(`
      ${COLUMNAS_PETICION},
      ${CATEGORIA_Y_BARRIO},
      profiles (
        nombre,
        apellido
      )
    `)

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
    .select('id, estado')
    .single()

  if (error) {
    throw error
  }

  return data
}

// ---------- Firmas ----------

// ¿El usuario ya firmó? (cada vecino solo puede ver su propia firma)
export async function usuarioFirmo(peticionId, usuarioId) {
  const { data, error } = await supabase
    .from('firmas')
    .select('id')
    .eq('peticion_id', peticionId)
    .eq('usuario_id', usuarioId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean(data)
}

export async function firmarPeticion(peticionId, usuarioId) {
  const { error } = await supabase
    .from('firmas')
    .insert({
      peticion_id: peticionId,
      usuario_id: usuarioId,
    })

  if (error) {
    throw error
  }
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

// ---------- Listados ----------

// Peticiones propias en cualquier estado (función de la base: la columna del autor no es visible)
export async function getMisPeticiones() {
  const { data, error } = await supabase
    .rpc('mis_peticiones')
    .select(`${COLUMNAS_PETICION}, ${CATEGORIA_Y_BARRIO}`)

  if (error) {
    throw error
  }

  return data
}

export async function getPeticionesPublicadas() {
  const { data, error } = await supabase
    .from('peticiones')
    .select(`${COLUMNAS_PETICION}, ${CATEGORIA_Y_BARRIO}`)
    .eq('estado', 'publicada')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}

// Cambios de estado y firmas recibidas en las peticiones propias
// (la base no revela quién firmó)
export async function getNotificaciones() {
  const { data, error } = await supabase.rpc('mis_notificaciones')

  if (error) {
    throw error
  }

  return data.map((notificacion) => ({
    id: notificacion.id,
    tipo: notificacion.tipo,
    peticionId: notificacion.peticion_id,
    titulo: notificacion.titulo,
    fecha: notificacion.fecha,
  }))
}

// ---------- Eventos ----------

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

// ---------- Feed de la comunidad ----------
// También es anónimo: la base no expone el autor. Cada publicación llega con
// `propia` (para mostrar "Vos" y permitir borrarla) y, solo para admins, con
// `autor` (nombre y correo).

const COLUMNAS_PUBLICACION = `
  id,
  tipo,
  contenido,
  created_at,
  zonas (
    id,
    nombre
  )
`

export async function getPublicaciones({ conAutores = false } = {}) {
  const [publicacionesRes, propiasRes, autoresRes] = await Promise.all([
    supabase
      .from('publicaciones')
      .select(COLUMNAS_PUBLICACION)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.rpc('mis_publicaciones_ids'),
    conAutores ? supabase.rpc('autores_publicaciones') : Promise.resolve({ data: [] }),
  ])

  const error = publicacionesRes.error ?? propiasRes.error ?? autoresRes.error

  if (error) {
    throw error
  }

  const propias = new Set(propiasRes.data)
  const autores = new Map(autoresRes.data.map((autor) => [autor.publicacion_id, autor]))

  return publicacionesRes.data.map((publicacion) => ({
    ...publicacion,
    propia: propias.has(publicacion.id),
    autor: autores.get(publicacion.id) ?? null,
  }))
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
    .select(COLUMNAS_PUBLICACION)
    .single()

  if (error) {
    throw error
  }

  return { ...data, propia: true, autor: null }
}

// ---------- Directorio de usuarios (solo admins; lo verifica la base) ----------

export async function getUsuariosAdmin() {
  const { data, error } = await supabase.rpc('usuarios_admin')

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

// ---------- Solicitudes de funcionario (solo admins) ----------

export async function getSolicitudesFuncionario() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nombre, apellido, cargo, organizacion, created_at')
    .eq('rol_solicitado', 'funcionario')
    .order('created_at')

  if (error) {
    throw error
  }

  return data
}

export async function resolverSolicitudFuncionario(usuarioId, aprobar) {
  const { error } = await supabase.rpc('resolver_solicitud_funcionario', {
    p_usuario: usuarioId,
    p_aprobar: aprobar,
  })

  if (error) {
    throw error
  }
}
