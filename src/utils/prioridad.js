// Prioridad según las firmas: cuanto más apoyo tiene una petición, más arriba
// aparece en el inicio y más fuerte es su azul. Al llegar a la META la
// petición se eleva al área del municipio que corresponde (lo hace la base).
//
// Niveles (de mayor a menor), en una escala de un solo tono:
//   50 o más  → Máxima  (azul muy oscuro) · meta alcanzada, elevada
//   20 a 49   → Alta    (azul fuerte)
//   10 a 19   → Media   (azul medio)
//    5 a 9    → Baja    (azul claro)
//    0 a 4    → Nueva   (sin color: recién empieza a juntar apoyo)

export const META_FIRMAS = 50

export const NIVELES_PRIORIDAD = [
  { clave: 'maxima', nombre: 'Prioridad máxima', corto: 'Máxima', desde: 50, color: '#0d366b', texto: '#ffffff' },
  { clave: 'alta', nombre: 'Prioridad alta', corto: 'Alta', desde: 20, color: '#1c5cab', texto: '#ffffff' },
  { clave: 'media', nombre: 'Prioridad media', corto: 'Media', desde: 10, color: '#3987e5', texto: '#ffffff' },
  { clave: 'baja', nombre: 'Prioridad baja', corto: 'Baja', desde: 5, color: '#9ec5f4', texto: '#0b0b0b' },
  { clave: 'nueva', nombre: 'Juntando apoyo', corto: 'Nueva', desde: 0, color: '#e1e0d9', texto: '#0b0b0b' },
]

export function prioridadPorFirmas(firmas) {
  const cantidad = Number(firmas) || 0
  return NIVELES_PRIORIDAD.find((nivel) => cantidad >= nivel.desde)
}

// Próximo escalón: cuántas firmas faltan para subir de nivel
export function proximoNivel(firmas) {
  const cantidad = Number(firmas) || 0
  const siguiente = [...NIVELES_PRIORIDAD].reverse().find((nivel) => nivel.desde > cantidad)
  return siguiente ? { nivel: siguiente, faltan: siguiente.desde - cantidad } : null
}

// Orden del inicio: más firmas primero; a igual firmas, más urgente y más nueva
export function ordenarPorPrioridad(peticiones) {
  return [...peticiones].sort((a, b) =>
    (b.firmas_count ?? 0) - (a.firmas_count ?? 0) ||
    (Number(b.score_urgencia) || 0) - (Number(a.score_urgencia) || 0) ||
    new Date(b.created_at) - new Date(a.created_at)
  )
}

// Etapas del seguimiento después de publicada
export const ETAPAS_SEGUIMIENTO = [
  { clave: 'recibida', nombre: 'Recibida', descripcion: 'Publicada y visible para el municipio' },
  { clave: 'en_revision', nombre: 'En revisión', descripcion: 'El área la está analizando' },
  { clave: 'derivada', nombre: 'Derivada', descripcion: 'Se envió al equipo que la resuelve' },
  { clave: 'en_obra', nombre: 'En obra', descripcion: 'Se está trabajando en el lugar' },
  { clave: 'resuelta', nombre: 'Resuelta', descripcion: 'El problema quedó solucionado' },
]

export const nombreEtapa = (clave) =>
  ETAPAS_SEGUIMIENTO.find((etapa) => etapa.clave === clave)?.nombre ?? 'Recibida'
