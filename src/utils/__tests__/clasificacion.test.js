import { describe, expect, it } from 'vitest'
import { sugerirCategoria } from '../clasificador'
import { detectarBarrio } from '../barrios'
import { describirAlertas, revisarTexto, tieneDatosPersonales } from '../moderacion'
import { aCSV } from '../exportar'

const CATEGORIAS = [
  'Salud', 'Seguridad', 'Vivienda', 'Educación', 'Ambiente', 'Infraestructura', 'Transporte',
  'Servicios públicos', 'Animales', 'Accesibilidad', 'Espacios públicos', 'Cultura y deporte',
  'Desarrollo social', 'Niñez y adolescencia', 'Adultos mayores', 'Género y diversidad',
].map((nombre, id) => ({ id, nombre }))

describe('categoría automática', () => {
  it.each([
    ['Perros abandonados en la plaza', 'hay una jauría que muerde', 'Animales'],
    ['Faltan rampas para sillas de ruedas', '', 'Accesibilidad'],
    ['Juegos rotos en la plaza Colón', 'las hamacas están rotas', 'Espacios públicos'],
    ['Colectivo línea 30 no pasa', 'frecuencia malísima', 'Transporte'],
    ['Merendero sin alimentos', 'los chicos no tienen merienda', 'Desarrollo social'],
    ['Centro de jubilados cerrado', '', 'Adultos mayores'],
    ['Punto violeta en el barrio', 'por violencia de género', 'Género y diversidad'],
    ['Arreglar la cancha del club', '', 'Cultura y deporte'],
    ['Baches en la calle Duarte Quirós', '', 'Infraestructura'],
    ['Dispensario sin pediatra', '', 'Salud'],
  ])('"%s" → %s', (titulo, descripcion, esperada) => {
    expect(sugerirCategoria(titulo, descripcion, CATEGORIAS)?.nombre).toBe(esperada)
  })

  it('"barrio" no cuenta como "río" (solo coincide al inicio de palabra)', () => {
    expect(sugerirCategoria('Mi barrio', '', CATEGORIAS)).toBeNull()
  })

  it('con poco texto no sugiere nada', () => {
    expect(sugerirCategoria('ab', '', CATEGORIAS)).toBeNull()
  })
})

describe('barrio automático', () => {
  const zonas = [
    { id: 1, nombre: 'Centro', lat: -31.4167, lng: -64.1833 },
    { id: 2, nombre: 'Nueva Córdoba', lat: -31.4262, lng: -64.1874 },
    { id: 3, nombre: 'Lomas Este', lat: -31.2957, lng: -64.2831 },
  ]

  it('elige el barrio más cercano', () => {
    expect(detectarBarrio({ lat: -31.425, lng: -64.188 }, zonas)?.nombre).toBe('Nueva Córdoba')
    expect(detectarBarrio({ lat: -31.297, lng: -64.284 }, zonas)?.nombre).toBe('Lomas Este')
  })

  it('fuera de la zona (más de 3 km) no elige ninguno', () => {
    expect(detectarBarrio({ lat: -38.87, lng: -62.07 }, zonas)).toBeNull()
  })

  it('sin ubicación no elige ninguno', () => {
    expect(detectarBarrio(null, zonas)).toBeNull()
  })
})

describe('revisión automática de textos', () => {
  it('detecta datos personales', () => {
    expect(revisarTexto('llamame al 351 555-1234')).toContain('telefono')
    expect(revisarTexto('escribime a vecino@mail.com')).toContain('correo')
    expect(revisarTexto('mi dni es 30.123.456')).toContain('dni')
    expect(tieneDatosPersonales(revisarTexto('351 4567890'))).toBe(true)
  })

  it('detecta lenguaje ofensivo sin importar acentos ni mayúsculas', () => {
    expect(revisarTexto('Qué IMBÉCIL')).toContain('lenguaje')
  })

  it('no marca textos normales con números de calle', () => {
    expect(revisarTexto('Bache en Av. Colón 1234, frente a la plaza')).toEqual([])
    expect(revisarTexto('Hace 3 semanas que no pasa el colectivo 30')).toEqual([])
  })

  it('describe las alertas en castellano', () => {
    expect(describirAlertas(['telefono', 'lenguaje'])).toBe('un número de teléfono y lenguaje ofensivo')
  })
})

describe('exportación a Excel', () => {
  it('usa ; como separador, escapa comillas y agrega BOM', () => {
    const csv = aCSV(['Título', 'Firmas'], [['Plaza "Colón"; oscura', 3]])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('Título;Firmas')
    expect(csv).toContain('"Plaza ""Colón""; oscura";3')
  })
})
