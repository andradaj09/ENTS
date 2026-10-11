export const CENTRO_CORDOBA = { lat: -31.4167, lng: -64.1833 }

// Mapa base de OpenStreetMap (libre, sin clave). Se desatura con CSS
// para que combine con la paleta de la app (ver styles/mapa.css).
export const MAPA_BASE = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19,
}

// Ubicación de una petición en el mapa.
// 1. Coordenadas propias (lat/lng) si la petición las tiene.
// 2. Si no, cerca del centro de su barrio (zonas.lat/lng), marcada como aproximada.
// 3. Si el barrio tampoco tiene coordenadas, alrededor del centro de Córdoba.
// El desplazamiento es determinístico (según el id) para que el marcador no salte.
export function ubicacionPeticion(peticion) {
  if (peticion.lat != null && peticion.lng != null) {
    return { lat: Number(peticion.lat), lng: Number(peticion.lng), aproximada: false }
  }

  const zona = peticion.zonas
  const base = zona?.lat != null && zona?.lng != null
    ? { lat: Number(zona.lat), lng: Number(zona.lng) }
    : CENTRO_CORDOBA

  const angulo = (peticion.id * 137.508 * Math.PI) / 180
  const radio = 0.0015 + (peticion.id % 5) * 0.0007

  return {
    lat: base.lat + Math.sin(angulo) * radio,
    lng: base.lng + Math.cos(angulo) * radio,
    aproximada: true,
  }
}
