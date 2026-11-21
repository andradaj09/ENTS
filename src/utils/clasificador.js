// Clasificación automática de peticiones por palabras clave.
// Cada categoría tiene raíces de palabras (sin acentos) que cuentan solo al
// comienzo de una palabra: "rio" coincide con "río" o "ríos" pero no con "barrio".
// Las palabras del título valen el doble que las de la descripción.

const PALABRAS_CLAVE = {
  salud: [
    'salud', 'hospital', 'dispensario', 'clinica', 'medic', 'pediatr', 'enfermer',
    'ambulancia', 'vacun', 'guardia', 'remedio', 'dengue', 'sanitari', 'odontolog',
    'consultorio', 'atencion primaria',
  ],
  seguridad: [
    'segur', 'robo', 'roban', 'robaron', 'asalt', 'delincu', 'delito', 'policia',
    'patrull', 'arrebat', 'violencia', 'drogas', 'vandal', 'oscur', 'peligro',
    'camara', 'motochorro', 'tiroteo',
  ],
  vivienda: [
    'vivienda', 'casa', 'hogar', 'alquiler', 'desalojo', 'asentamiento', 'lote',
    'terreno', 'hacinamiento', 'habitacional', 'familias sin', 'escritura',
  ],
  educacion: [
    'escuela', 'colegio', 'jardin de infantes', 'aula', 'docente', 'maestr',
    'alumno', 'estudiant', 'clases', 'educa', 'universidad', 'biblioteca',
    'comedor escolar', 'secundario', 'primaria',
  ],
  ambiente: [
    'basur', 'residuo', 'contamin', 'arbol', 'poda', 'espacio verde',
    'rio', 'canal', 'olor', 'humo', 'quema', 'reciclaj', 'ruido', 'microbasural',
    'roedor', 'ratas', 'animales sueltos', 'perros sueltos', 'ambiente',
  ],
  infraestructura: [
    'bache', 'calle', 'asfalt', 'pavimento', 'vereda', 'cordon', 'rampa', 'puente',
    'desague', 'cloaca', 'inunda', 'alcantarill', 'obra', 'pozo', 'cuneta',
    'accesibilidad', 'adoquin',
  ],
  transporte: [
    'colectivo', 'omnibus', 'parada', 'transporte', 'semaforo', 'transito',
    'trafico', 'velocidad', 'ciclovia', 'estacionamiento', 'taxi', 'linea',
    'frecuencia', 'cruce', 'senda peatonal', 'lomo de burro', 'reductor',
  ],
  'servicios publicos': [
    'agua', 'electric', 'corte de luz', 'sin luz', 'gas', 'luminaria', 'alumbrado',
    'iluminacion', 'recoleccion', 'internet', 'poste', 'medidor', 'cable',
    'servicio',
  ],
}

export const normalizar = (texto) =>
  (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const patrones = new Map()

// Coincide si la raíz aparece al inicio de una palabra
function patron(raiz) {
  if (!patrones.has(raiz)) {
    patrones.set(raiz, new RegExp(`(^|[^a-z])${raiz}`))
  }

  return patrones.get(raiz)
}

function contar(texto, raices) {
  return raices.reduce((total, raiz) => total + (patron(raiz).test(texto) ? 1 : 0), 0)
}

// Devuelve la categoría (de la lista recibida) que mejor coincide, o null.
export function sugerirCategoria(titulo, descripcion, categorias) {
  const tituloNormal = normalizar(titulo)
  const descripcionNormal = normalizar(descripcion)

  if ((tituloNormal + descripcionNormal).trim().length < 4) return null

  let mejor = null
  let mejorPuntaje = 0
  let mejorTitulo = 0
  let empate = false

  for (const categoria of categorias) {
    const raices = PALABRAS_CLAVE[normalizar(categoria.nombre)]
    if (!raices) continue

    const enTitulo = contar(tituloNormal, raices)
    const puntaje = enTitulo * 2 + contar(descripcionNormal, raices)

    // A igual puntaje, gana la que coincide más en el título
    const supera =
      puntaje > mejorPuntaje ||
      (puntaje === mejorPuntaje && enTitulo > mejorTitulo)

    if (puntaje > 0 && supera) {
      mejor = categoria
      mejorPuntaje = puntaje
      mejorTitulo = enTitulo
      empate = false
    } else if (puntaje > 0 && puntaje === mejorPuntaje && enTitulo === mejorTitulo) {
      empate = true
    }
  }

  // Con un empate total no hay una sugerencia clara: mejor que elija la persona
  return empate ? null : mejor
}
