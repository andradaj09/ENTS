// Detección automática del barrio a partir de la ubicación marcada.
// Se elige el barrio cargado cuyo centro está más cerca (hasta 3 km).
// Nota: OpenStreetMap no tiene los barrios de Córdoba cargados, así que no
// sirve preguntarle el nombre; para mayor precisión habría que cargar los
// polígonos oficiales de cada barrio (datos abiertos de la Municipalidad).

const DISTANCIA_MAXIMA_KM = 3

function distanciaKm(a, b) {
  const rad = (grados) => (grados * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2

  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

// Devuelve el barrio más cercano o null si ninguno está a menos de 3 km
export function detectarBarrio(ubicacion, zonas) {
  if (!ubicacion) return null

  let masCercana = null
  let menorDistancia = Infinity

  for (const zona of zonas) {
    if (zona.lat == null || zona.lng == null) continue

    const distancia = distanciaKm(ubicacion, { lat: Number(zona.lat), lng: Number(zona.lng) })

    if (distancia < menorDistancia) {
      masCercana = zona
      menorDistancia = distancia
    }
  }

  return menorDistancia <= DISTANCIA_MAXIMA_KM ? masCercana : null
}
