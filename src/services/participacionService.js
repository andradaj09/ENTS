import { supabase } from '../supabase/client'

// Seguimiento, comentarios, barrios seguidos, logros y áreas.
// Las reglas de quién puede hacer qué viven en la base (RLS y funciones):
// la app solo pide y muestra.

async function rpc(nombre, parametros) {
  const { data, error } = await supabase.rpc(nombre, parametros)

  if (error) {
    throw error
  }

  return data
}

// ---------- Seguimiento de una petición ----------

export const getSeguimiento = (peticionId) =>
  rpc('seguimiento_peticion', { p_peticion: Number(peticionId) })

// Solo funcionarios (de su área) y admins; la foto ya viene comprimida
export async function actualizarSeguimiento({ peticionId, usuarioId, estado, mensaje, foto }) {
  let ruta = null

  if (foto) {
    ruta = `${usuarioId}/${crypto.randomUUID()}.jpg`

    const { error } = await supabase.storage
      .from('peticiones')
      .upload(ruta, foto, { contentType: 'image/jpeg' })

    if (error) throw error
  }

  try {
    await rpc('actualizar_seguimiento', {
      p_peticion: Number(peticionId),
      p_estado: estado,
      p_mensaje: mensaje || null,
      p_foto: ruta,
    })
  } catch (err) {
    if (ruta) await supabase.storage.from('peticiones').remove([ruta])
    throw err
  }
}

// ---------- Comentarios anónimos ----------

export const getComentarios = (peticionId) =>
  rpc('comentarios_peticion', { p_peticion: Number(peticionId) })

export async function crearComentario({ peticionId, usuarioId, texto }) {
  const { error } = await supabase
    .from('comentarios')
    .insert({ peticion_id: Number(peticionId), usuario_id: usuarioId, texto })

  if (error) {
    throw error
  }
}

// Por función de la base: verifica autor o permiso de moderación y, si no
// puede borrar, devuelve un error en lugar de no hacer nada en silencio
export const borrarComentario = (comentarioId) =>
  rpc('borrar_comentario', { p_comentario: Number(comentarioId) })

export async function denunciarComentario({ comentarioId, usuarioId, motivo }) {
  const { error } = await supabase
    .from('denuncias')
    .insert({ comentario_id: comentarioId, usuario_id: usuarioId, motivo: motivo || null })

  // Ya lo había denunciado: no es un error para la persona
  if (error && error.code !== '23505') {
    throw error
  }
}

export const moderarComentario = (comentarioId, oculto) =>
  rpc('moderar_comentario', { p_comentario: comentarioId, p_oculto: oculto })

export const getComentariosARevisar = () => rpc('comentarios_a_revisar')

// ---------- Peticiones parecidas (para no repetir pedidos) ----------

export const buscarSimilares = (texto, ubicacion) =>
  rpc('peticiones_similares', {
    p_texto: texto,
    p_lat: ubicacion?.lat ?? null,
    p_lng: ubicacion?.lng ?? null,
  })

// ---------- Barrios seguidos ----------

export async function getBarriosSeguidos() {
  const { data, error } = await supabase.from('barrios_seguidos').select('zona_id')

  if (error) {
    throw error
  }

  return data.map((fila) => fila.zona_id)
}

export async function seguirBarrio(usuarioId, zonaId) {
  const { error } = await supabase
    .from('barrios_seguidos')
    .insert({ usuario_id: usuarioId, zona_id: zonaId })

  if (error && error.code !== '23505') {
    throw error
  }
}

export async function dejarDeSeguirBarrio(usuarioId, zonaId) {
  const { error } = await supabase
    .from('barrios_seguidos')
    .delete()
    .eq('usuario_id', usuarioId)
    .eq('zona_id', zonaId)

  if (error) {
    throw error
  }
}

// ---------- Logros y áreas ----------

export const getLogros = () => rpc('mis_logros')

export async function getAreas() {
  const { data, error } = await supabase.from('areas').select('id, nombre').order('nombre')

  if (error) {
    throw error
  }

  return data
}

export const asignarArea = (usuarioId, areaId) =>
  rpc('asignar_area', { p_usuario: usuarioId, p_area: areaId })

// ---------- Roles (solo el dueño del proyecto; lo verifica la base) ----------

export const soyDueno = () => rpc('soy_dueno')

export const cambiarRol = (usuarioId, rol) =>
  rpc('cambiar_rol', { p_usuario: usuarioId, p_rol: rol })

// ---------- Documentos del proyecto (bucket privado; solo el dueño) ----------

const BUCKET_DOCUMENTOS = 'documentos'

export async function listarDocumentos() {
  const { data, error } = await supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .list('', { sortBy: { column: 'name', order: 'asc' } })

  if (error) {
    throw error
  }

  return data.filter((archivo) => archivo.name.toLowerCase().endsWith('.pdf'))
}

export async function subirDocumento(archivo) {
  const { error } = await supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .upload(archivo.name, archivo, { contentType: 'application/pdf', upsert: true })

  if (error) {
    throw error
  }
}

// Enlace temporal (5 minutos): el archivo nunca queda público
export async function enlaceDocumento(nombre) {
  const { data, error } = await supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .createSignedUrl(nombre, 300)

  if (error) {
    throw error
  }

  return data.signedUrl
}

export async function borrarDocumento(nombre) {
  const { error } = await supabase.storage.from(BUCKET_DOCUMENTOS).remove([nombre])

  if (error) {
    throw error
  }
}

// Estadísticas del área: el funcionario ve la suya; el admin elige (o todas)
export const getEstadisticasArea = (areaId) =>
  rpc('estadisticas_area', { p_area: areaId ? Number(areaId) : null })

// ---------- Permisos por panel (los define el dueño) ----------

export const getMisPermisos = () => rpc('mis_permisos')

export async function getPermisosPanel() {
  const { data, error } = await supabase.from('permisos_panel').select('rol, panel, ver, modificar')

  if (error) {
    throw error
  }

  return data
}

export const guardarPermiso = (rol, panel, ver, modificar) =>
  rpc('guardar_permiso', { p_rol: rol, p_panel: panel, p_ver: ver, p_modificar: modificar })

// ---------- Barrio del vecino ----------
// La base valida el barrio y el límite de un cambio cada 30 días

export const elegirMiBarrio = (zonaId) => rpc('elegir_mi_barrio', { p_zona: Number(zonaId) })

export const mostrarMiBarrio = (mostrar) => rpc('mostrar_mi_barrio', { p_mostrar: mostrar })

export const getResumenMiBarrio = () => rpc('resumen_mi_barrio')

export const getRankingBarrios = () => rpc('ranking_barrios')
