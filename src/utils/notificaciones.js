// Guarda en el navegador cuándo vio el usuario sus notificaciones por última vez.
// Es por dispositivo; una tabla `notificaciones` en Supabase lo haría global.
const clave = (usuarioId) => `ents-notif-vistas-${usuarioId}`

export function getUltimaVista(usuarioId) {
  try {
    return Number(localStorage.getItem(clave(usuarioId))) || 0
  } catch {
    return 0
  }
}

export function marcarNotificacionesVistas(usuarioId) {
  try {
    localStorage.setItem(clave(usuarioId), String(Date.now()))
  } catch {
    // Sin almacenamiento disponible: el contador simplemente no se reinicia
  }
}
