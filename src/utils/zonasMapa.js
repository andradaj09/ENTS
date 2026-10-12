import { Delaunay } from 'd3-delaunay'

// Divide la ciudad en áreas a partir del punto central de cada barrio:
// cada lugar del mapa pertenece al barrio más cercano (diagrama de Voronoi).
// Cada área se recorta a un círculo alrededor de su centro para que los
// barrios del borde no se estiren hasta el infinito.

const RADIO_KM = 2.6
const LADOS_CIRCULO = 28
const KM_POR_GRADO = 111.32

// Recorte de un polígono convexo por otro convexo (Sutherland–Hodgman)
function recortar(sujeto, recorte) {
  let salida = sujeto

  for (let i = 0; i < recorte.length; i++) {
    const a = recorte[i]
    const b = recorte[(i + 1) % recorte.length]
    const adentro = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= 0

    const cruce = (p, q) => {
      const a1 = b[1] - a[1]
      const b1 = a[0] - b[0]
      const c1 = a1 * a[0] + b1 * a[1]
      const a2 = q[1] - p[1]
      const b2 = p[0] - q[0]
      const c2 = a2 * p[0] + b2 * p[1]
      const det = a1 * b2 - a2 * b1
      return [(b2 * c1 - b1 * c2) / det, (a1 * c2 - a2 * c1) / det]
    }

    const entrada = salida
    salida = []
    if (entrada.length === 0) break

    let previo = entrada[entrada.length - 1]
    for (const actual of entrada) {
      if (adentro(actual)) {
        if (!adentro(previo)) salida.push(cruce(previo, actual))
        salida.push(actual)
      } else if (adentro(previo)) {
        salida.push(cruce(previo, actual))
      }
      previo = actual
    }
  }

  return salida
}

// Polígonos en orden antihorario (el recorte asume esa orientación)
function antihorario(poligono) {
  let area = 0
  for (let i = 0; i < poligono.length; i++) {
    const [x1, y1] = poligono[i]
    const [x2, y2] = poligono[(i + 1) % poligono.length]
    area += x1 * y2 - x2 * y1
  }
  return area < 0 ? [...poligono].reverse() : poligono
}

export function areasDeBarrios(zonas) {
  const validas = zonas.filter((z) => Number.isFinite(Number(z.lat)) && Number.isFinite(Number(z.lng)))
  if (validas.length < 2) return []

  // Proyección plana simple: a esta escala alcanza con corregir la longitud
  const lat0 = validas.reduce((t, z) => t + Number(z.lat), 0) / validas.length
  const escalaX = Math.cos((lat0 * Math.PI) / 180)
  const aPlano = (lat, lng) => [lng * escalaX, lat]
  const aLatLng = ([x, y]) => [y, x / escalaX]

  const puntos = validas.map((z) => aPlano(Number(z.lat), Number(z.lng)))
  const radio = RADIO_KM / KM_POR_GRADO
  const xs = puntos.map((p) => p[0])
  const ys = puntos.map((p) => p[1])
  const caja = [
    Math.min(...xs) - radio, Math.min(...ys) - radio,
    Math.max(...xs) + radio, Math.max(...ys) + radio,
  ]

  const voronoi = Delaunay.from(puntos).voronoi(caja)

  return validas.map((zona, i) => {
    const celda = voronoi.cellPolygon(i)
    if (!celda) return null

    const [cx, cy] = puntos[i]
    const circulo = Array.from({ length: LADOS_CIRCULO }, (_, k) => {
      const angulo = (k / LADOS_CIRCULO) * Math.PI * 2
      return [cx + Math.cos(angulo) * radio, cy + Math.sin(angulo) * radio]
    })

    const area = recortar(antihorario(celda.slice(0, -1)), antihorario(circulo))
    if (area.length < 3) return null

    return { zona, contorno: area.map(aLatLng) }
  }).filter(Boolean)
}

// Escala secuencial azul (claro = poco, oscuro = mucho), hasta 5 clases.
// Con valores enteros chicos (por ejemplo, 3 peticiones como máximo) se usan
// tantas clases como valores posibles, así cada color es un número exacto.
const ESCALA_AZUL = ['#cde2fb', '#86b6ef', '#5598e7', '#256abf', '#104281']
const COLORES_POR_CANTIDAD = {
  1: ['#3987e5'],
  2: ['#86b6ef', '#256abf'],
  3: ['#9ec5f4', '#3987e5', '#104281'],
  4: ['#b7d3f6', '#5598e7', '#256abf', '#104281'],
  5: ESCALA_AZUL,
}
export const SIN_DATOS = '#f0efec'

export function clasesEscala(maximo, enteros) {
  if (maximo <= 0) return []
  const cantidad = enteros ? Math.min(5, Math.ceil(maximo)) : 5
  const paso = maximo / cantidad

  return COLORES_POR_CANTIDAD[cantidad].map((color, i) => {
    const desde = enteros ? Math.floor(paso * i) + 1 : Math.round(paso * i)
    const hasta = enteros ? Math.floor(paso * (i + 1)) : Math.round(paso * (i + 1))
    return { color, etiqueta: desde >= hasta ? String(hasta) : `${desde}–${hasta}` }
  })
}

export function colorPara(valor, maximo, enteros) {
  if (!valor || maximo <= 0) return SIN_DATOS
  const clases = clasesEscala(maximo, enteros)
  const indice = Math.min(clases.length - 1, Math.ceil((valor / maximo) * clases.length) - 1)
  return clases[Math.max(0, indice)].color
}
