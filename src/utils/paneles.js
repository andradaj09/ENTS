// Paneles cuyo acceso define el dueño en "Permisos" (tabla permisos_panel).
// "modificar" describe qué habilita además de ver; null = panel de solo lectura.
// Inicio y Permisos no están en la lista: Inicio lo ven todos y Permisos solo el dueño.
export const PANELES = [
  { clave: 'dashboard', nombre: 'Mis solicitudes', ruta: '/dashboard', icono: 'file', modificar: 'Crear peticiones' },
  { clave: 'mapa', nombre: 'Mapa vecinal', ruta: '/mapa', icono: 'map', modificar: null },
  { clave: 'comunidad', nombre: 'Comunidad', ruta: '/comunidad', icono: 'users', modificar: 'Publicar en el muro' },
  { clave: 'estadisticas', nombre: 'Estadísticas', ruta: '/estadisticas', icono: 'chart', modificar: null },
  { clave: 'eventos', nombre: 'Eventos', ruta: '/eventos', icono: 'calendar', modificar: 'Crear y borrar eventos' },
  { clave: 'perfil', nombre: 'Perfil', ruta: '/perfil', icono: 'user', modificar: 'Editar sus datos' },
  { clave: 'bandeja', nombre: 'Bandeja del área', ruta: '/bandeja', icono: 'list', modificar: 'Responder y cambiar la etapa' },
  { clave: 'moderacion', nombre: 'Revisar contenido', ruta: '/admin/peticiones', icono: 'shield', modificar: 'Aprobar, ocultar y borrar' },
  { clave: 'usuarios', nombre: 'Usuarios', ruta: '/admin/usuarios', icono: 'users', modificar: 'Asignar áreas y aprobar funcionarios' },
  { clave: 'panel', nombre: 'Panel analítico', ruta: '/admin/estadisticas', icono: 'chart', modificar: null },
  { clave: 'documentos', nombre: 'Documentos', ruta: '/documentos', icono: 'lock', modificar: 'Subir y borrar documentos' },
]

export const panelPorClave = (clave) => PANELES.find((p) => p.clave === clave)
