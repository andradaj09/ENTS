import { distanciaKm } from './barrios'

// Barrio del vecino: "Elegir después" en la bienvenida y barrios cercanos

const clave = (usuarioId) => `ents-barrio-omitido-${usuarioId}`

// ¿Ya eligió "Elegir después"? (se recuerda en este navegador)
export function barrioOmitido(usuarioId) {
  try {
    return localStorage.getItem(clave(usuarioId)) === '1'
  } catch {
    return false
  }
}

export function omitirBarrio(usuarioId) {
  try {
    localStorage.setItem(clave(usuarioId), '1')
  } catch {
    // Sin almacenamiento: la bienvenida vuelve a aparecer en la próxima visita
  }
}

const DISTANCIA_CERCA_KM = 3

// Barrios cuyo centro está a menos de 3 km del barrio propio (sin incluirlo)
export function barriosCercanos(zonaId, zonas, km = DISTANCIA_CERCA_KM) {
  const propia = zonas.find((z) => z.id === zonaId)
  if (!propia?.lat) return new Set()

  const centro = { lat: Number(propia.lat), lng: Number(propia.lng) }
  return new Set(
    zonas
      .filter((z) => z.id !== zonaId && z.lat != null &&
        distanciaKm(centro, { lat: Number(z.lat), lng: Number(z.lng) }) <= km)
      .map((z) => z.id)
  )
}
