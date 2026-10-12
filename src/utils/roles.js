// Roles de la plataforma (la base de datos aplica las mismas reglas):
// - ciudadano (vecino/a): participa; para los demás vecinos es anónimo.
// - funcionario: responde las peticiones de SU área (lo aprueba un admin);
//   solo de esas ve quién las creó y quién las firmó.
// - moderador: revisa peticiones antes de publicarlas y modera comentarios
//   y publicaciones; no gestiona usuarios ni ve el panel analítico.
// - admin: todo lo del moderador, más usuarios, áreas, eventos, aprobación
//   de funcionarios y panel analítico completo.
// - dueño: un admin (una sola cuenta, fijada en la base) que además cambia
//   roles y accede a los documentos privados del proyecto.

const NOMBRES = {
  ciudadano: 'Vecino/a',
  funcionario: 'Funcionario/a',
  moderador: 'Moderador/a',
  admin: 'Administrador/a',
}

export const ROLES_ASIGNABLES = [
  ['ciudadano', 'Vecino/a'],
  ['funcionario', 'Funcionario/a'],
  ['moderador', 'Moderador/a'],
  ['admin', 'Administrador/a'],
]

export function nombreRol(rol, esDueno = false) {
  if (esDueno) return 'CEO'
  return NOMBRES[rol] ?? NOMBRES.ciudadano
}

export function esAdmin(perfil) {
  return perfil?.rol === 'admin'
}

// Moderan peticiones, comentarios y publicaciones: moderadores y admins
export function esModerador(perfil) {
  return perfil?.rol === 'moderador' || perfil?.rol === 'admin'
}

// Tienen bandeja de gestión: funcionarios y admins
export function tieneBandeja(perfil) {
  return perfil?.rol === 'funcionario' || perfil?.rol === 'admin'
}

// ¿Ve quién creó y firmó ESTA petición? Admins siempre; funcionarios solo
// si no tienen área o si es la de la categoría (privado.puede_ver_identidades_de).
export function puedeVerIdentidades(perfil, peticion) {
  if (perfil?.rol === 'admin') return true
  if (perfil?.rol !== 'funcionario') return false
  return !perfil.area_id || perfil.area_id === peticion?.categorias?.area_id
}

// ¿Puede actualizar el seguimiento de esta petición? Misma regla por área.
// (La base lo vuelve a verificar en actualizar_seguimiento.)
export function puedeResponder(perfil, peticion) {
  return puedeVerIdentidades(perfil, peticion)
}

// Qué puede hacer cada rol (se muestra en el perfil)
export const PERMISOS_POR_ROL = {
  ciudadano: [
    'Crear peticiones con fotos y ubicación',
    'Firmar y comentar en forma anónima',
    'Seguir barrios y recibir avisos',
    'Ver el mapa y las estadísticas públicas',
  ],
  funcionario: [
    'Todo lo del vecino',
    'Bandeja y estadísticas de tu área',
    'Responder y cambiar la etapa de las peticiones de tu área',
    'Ver quién creó y firmó las peticiones de tu área',
  ],
  moderador: [
    'Todo lo del vecino',
    'Aprobar, rechazar, editar o borrar peticiones',
    'Revisar comentarios ocultos y denunciados',
    'Borrar publicaciones del muro vecinal',
  ],
  admin: [
    'Todo lo del moderador',
    'Directorio de usuarios, áreas y aprobación de funcionarios',
    'Crear eventos de la agenda',
    'Panel analítico completo y exportes',
  ],
  dueno: [
    'Todo lo del administrador',
    'Cambiar el rol de cualquier cuenta',
    'Documentos privados del proyecto',
  ],
}
