export function tiempoRelativo(fecha) {
  const minutos = Math.floor((Date.now() - new Date(fecha)) / 60000)

  if (minutos < 1) return 'Recién'
  if (minutos < 60) return `Hace ${minutos} min`

  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `Hace ${horas} h`

  const dias = Math.floor(horas / 24)
  if (dias < 30) return `Hace ${dias} ${dias === 1 ? 'día' : 'días'}`

  return new Date(fecha).toLocaleDateString('es-AR')
}

// Solo la primera letra en mayúscula ("Martes, 13 de octubre"),
// a diferencia de text-capitalize, que la pone en cada palabra
export function capitalizar(texto) {
  return texto ? texto[0].toUpperCase() + texto.slice(1) : texto
}

// Umbrales de urgencia compartidos por el inicio, el mapa y la comunidad
export const UMBRAL_URGENTE = 70
export const UMBRAL_MEDIO = 40

// 'alta' | 'media' | 'baja': define el color de tarjetas, puntos y marcadores
export function nivelUrgencia(score) {
  const valor = Number(score) || 0

  if (valor >= UMBRAL_URGENTE) return 'alta'
  if (valor >= UMBRAL_MEDIO) return 'media'
  return 'baja'
}

const CLASE_POR_NIVEL = {
  alta: 'dot-red',
  media: 'dot-yellow',
  baja: 'dot-green',
}

export function claseUrgencia(score) {
  return CLASE_POR_NIVEL[nivelUrgencia(score)]
}
