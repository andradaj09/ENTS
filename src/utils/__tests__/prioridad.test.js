import { describe, expect, it } from 'vitest'
import {
  META_FIRMAS,
  nombreEtapa,
  ordenarPorPrioridad,
  prioridadPorFirmas,
  proximoNivel,
} from '../prioridad'

describe('prioridad por firmas', () => {
  it.each([
    [0, 'nueva'],
    [4, 'nueva'],
    [5, 'baja'],
    [9, 'baja'],
    [10, 'media'],
    [19, 'media'],
    [20, 'alta'],
    [49, 'alta'],
    [50, 'maxima'],
    [500, 'maxima'],
  ])('%i firmas → %s', (firmas, nivel) => {
    expect(prioridadPorFirmas(firmas).clave).toBe(nivel)
  })

  it('tolera valores vacíos', () => {
    expect(prioridadPorFirmas(null).clave).toBe('nueva')
    expect(prioridadPorFirmas(undefined).clave).toBe('nueva')
  })

  it('el azul se oscurece a medida que sube la prioridad', () => {
    const luminancia = (hex) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const colores = [5, 10, 20, 50].map((f) => luminancia(prioridadPorFirmas(f).color))
    expect([...colores].sort((a, b) => b - a)).toEqual(colores)
  })

  it('la meta coincide con el nivel máximo', () => {
    expect(prioridadPorFirmas(META_FIRMAS).clave).toBe('maxima')
    expect(prioridadPorFirmas(META_FIRMAS - 1).clave).not.toBe('maxima')
  })

  it('calcula cuántas firmas faltan para el próximo nivel', () => {
    expect(proximoNivel(0)).toMatchObject({ faltan: 5, nivel: { clave: 'baja' } })
    expect(proximoNivel(12)).toMatchObject({ faltan: 8, nivel: { clave: 'alta' } })
    expect(proximoNivel(50)).toBeNull()
  })
})

describe('orden del inicio', () => {
  const p = (id, firmas, urgencia = 0, fecha = '2026-10-01') => ({
    id, firmas_count: firmas, score_urgencia: urgencia, created_at: fecha,
  })

  it('más firmas primero, después más urgente, después más nueva', () => {
    const ordenadas = ordenarPorPrioridad([
      p(1, 3, 90),
      p(2, 25),
      p(3, 3, 95),
      p(4, 3, 95, '2026-10-05'),
      p(5, 60),
    ])
    expect(ordenadas.map((x) => x.id)).toEqual([5, 2, 4, 3, 1])
  })

  it('no modifica la lista original', () => {
    const lista = [p(1, 1), p(2, 2)]
    ordenarPorPrioridad(lista)
    expect(lista.map((x) => x.id)).toEqual([1, 2])
  })
})

describe('etapas de seguimiento', () => {
  it('traduce la clave a un nombre legible', () => {
    expect(nombreEtapa('en_obra')).toBe('En obra')
    expect(nombreEtapa(undefined)).toBe('Recibida')
  })
})
