import { describe, expect, it } from 'vitest'
import { areasDeBarrios, clasesEscala, colorPara, SIN_DATOS } from '../zonasMapa'

describe('áreas de barrios en el mapa', () => {
  const zonas = [
    { id: 1, nombre: 'A', lat: -31.40, lng: -64.20 },
    { id: 2, nombre: 'B', lat: -31.40, lng: -64.17 },
    { id: 3, nombre: 'C', lat: -31.43, lng: -64.185 },
  ]

  it('arma un polígono por barrio', () => {
    const areas = areasDeBarrios(zonas)
    expect(areas).toHaveLength(3)
    for (const { contorno } of areas) expect(contorno.length).toBeGreaterThanOrEqual(3)
  })

  it('cada centro queda dentro de su propia área', () => {
    const dentro = ([lat, lng], poligono) => {
      let adentro = false
      for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
        const [yi, xi] = poligono[i]
        const [yj, xj] = poligono[j]
        if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) adentro = !adentro
      }
      return adentro
    }

    for (const { zona, contorno } of areasDeBarrios(zonas)) {
      expect(dentro([zona.lat, zona.lng], contorno)).toBe(true)
    }
  })

  it('con menos de dos barrios no hay áreas', () => {
    expect(areasDeBarrios(zonas.slice(0, 1))).toEqual([])
  })
})

describe('escala de colores', () => {
  it('con pocos valores enteros usa un color por valor', () => {
    expect(clasesEscala(3, true).map((c) => c.etiqueta)).toEqual(['1', '2', '3'])
  })

  it('agrupa en hasta 5 clases', () => {
    expect(clasesEscala(40, true)).toHaveLength(5)
  })

  it('cero es "sin datos" y el máximo es el azul más oscuro', () => {
    expect(colorPara(0, 10, true)).toBe(SIN_DATOS)
    expect(colorPara(10, 10, true)).toBe(clasesEscala(10, true).at(-1).color)
  })
})
