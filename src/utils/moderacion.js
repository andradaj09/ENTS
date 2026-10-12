// Revisión automática de textos (la misma que hace la base en revisar_texto):
// avisa antes de enviar si hay datos personales o lenguaje ofensivo.

const normalizarTexto = (texto) =>
  (texto ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const REGLAS = [
  ['correo', /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/],
  ['telefono', /(\+?54[\s-]*)?(9[\s-]*)?(0?351|0?3543)?[\s-]*(15)?[\s-]*\d{3}[\s-]?\d{4}/],
  ['dni', /\b\d{1,2}\.\d{3}\.\d{3}\b|\bdni\b.*\d{7,8}|\d{7,8}.*\bdni\b/],
  ['lenguaje', /\b(boludo|boluda|pelotud[oa]s?|forros?|forras?|hdp|hij[oa] de puta|put[oa]s?|mierda|concha|pajer[oa]|idiotas?|imbeciles?|tarad[oa]s?|mogolic[oa]s?|chot[oa]|garcas?|trolos?|basura humana)\b/],
]

export function revisarTexto(texto) {
  const t = normalizarTexto(texto)
  return REGLAS.filter(([, regla]) => regla.test(t)).map(([alerta]) => alerta)
}

export const DESCRIPCION_ALERTA = {
  correo: 'un correo electrónico',
  telefono: 'un número de teléfono',
  dni: 'un número de documento',
  lenguaje: 'lenguaje ofensivo',
}

export const tieneDatosPersonales = (alertas) =>
  alertas.some((a) => a === 'correo' || a === 'telefono' || a === 'dni')

// "un número de teléfono y lenguaje ofensivo"
export function describirAlertas(alertas) {
  const partes = alertas.map((a) => DESCRIPCION_ALERTA[a] ?? a)
  if (partes.length <= 1) return partes[0] ?? ''
  return `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}`
}
