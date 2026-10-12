import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  createPeticion,
  getCategorias,
  getZonas,
} from '../services/petitionService'
import { sugerirCategoria } from '../utils/clasificador'
import { detectarBarrio } from '../utils/barrios'
import SelectorUbicacion from '../components/SelectorUbicacion'
import SelectorFotos from '../components/SelectorFotos'
import Icon from '../components/Icon'
import OpcionesBarrios from '../components/OpcionesBarrios'
import PeticionesSimilares from '../components/PeticionesSimilares'
import { describirAlertas, revisarTexto, tieneDatosPersonales } from '../utils/moderacion'

// Etiqueta que indica si el campo se completó solo o lo eligió la persona
function EtiquetaAuto({ automatico, manual, onRestablecer, sugerencia }) {
  if (manual && sugerencia) {
    return (
      <button type="button" className="etiqueta-auto etiqueta-volver" onClick={onRestablecer}>
        Usar la detectada ({sugerencia})
      </button>
    )
  }

  if (automatico) {
    return (
      <span className="etiqueta-auto">
        <Icon name="check" size={12} />
        Detectada automáticamente
      </span>
    )
  }

  return null
}

function CreatePetition() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [categorias, setCategorias] = useState([])
  const [zonas, setZonas] = useState([])

  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    categoriaId: '',
    zonaId: '',
  })

  const [ubicacion, setUbicacion] = useState(null)
  const [fotos, setFotos] = useState([])

  // Mientras la persona no elija a mano, la categoría y el barrio se completan solos
  const [categoriaManual, setCategoriaManual] = useState(false)
  const [zonaManual, setZonaManual] = useState(false)

  const [loading, setLoading] = useState(false)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [error, setError] = useState('')
  const [errorUbicacion, setErrorUbicacion] = useState('')

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [categoriasData, zonasData] = await Promise.all([
          getCategorias(),
          getZonas(),
        ])

        setCategorias(categoriasData)
        setZonas(zonasData)
      } catch (err) {
        setError('No se pudieron cargar las categorías y zonas.')
        console.error(err)
      } finally {
        setLoadingOptions(false)
      }
    }

    loadOptions()
  }, [])

  // Al abrir el formulario se intenta ubicar a la persona para que el barrio
  // se complete solo. Si no da permiso, se marca la ubicación en el mapa.
  // Primero una ubicación rápida (red o caché de los últimos 5 minutos) para
  // completar el barrio al instante; después se afina con el GPS si responde.
  useEffect(() => {
    if (!navigator.geolocation) return

    let afinada = false

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (afinada) return
        setUbicacion((actual) => actual ?? { lat: coords.latitude, lng: coords.longitude, auto: true })
      },
      () => {},
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 4000 }
    )

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        afinada = true
        // Solo reemplaza la ubicación automática, nunca la que marcó la persona
        setUbicacion((actual) =>
          !actual || actual.auto
            ? { lat: coords.latitude, lng: coords.longitude, auto: true }
            : actual
        )
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 15000 }
    )
  }, [])

  // Categoría sugerida según el texto: se recalcula en cada tecla (es instantáneo)
  const categoriaSugerida = sugerirCategoria(form.titulo, form.descripcion, categorias)

  // Barrio detectado según la ubicación marcada
  const zonaDetectada = detectarBarrio(ubicacion, zonas)

  const categoriaId = categoriaManual
    ? form.categoriaId
    : String(categoriaSugerida?.id ?? form.categoriaId)

  const zonaId = zonaManual
    ? form.zonaId
    : String(zonaDetectada?.id ?? form.zonaId)

  // Revisión automática (la base hace la misma y se la muestra a los moderadores)
  const alertasTexto = revisarTexto(`${form.titulo} ${form.descripcion}`)

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  const elegirCategoria = (e) => {
    setCategoriaManual(true)
    handleChange(e)
  }

  const elegirZona = (e) => {
    setZonaManual(true)
    handleChange(e)
  }

  const usarMiUbicacion = () => {
    setErrorUbicacion('')

    if (!navigator.geolocation) {
      setErrorUbicacion('Tu navegador no permite obtener la ubicación.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setUbicacion({ lat: coords.latitude, lng: coords.longitude }),
      () => setErrorUbicacion('No se pudo obtener tu ubicación. Marcala en el mapa.'),
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 8000 }
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    setError('')
    setLoading(true)

    try {
      const peticion = await createPeticion({
        usuarioId: user.id,
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        categoriaId: Number(categoriaId),
        zonaId: Number(zonaId),
        ubicacion,
        fotos,
      })

      navigate(`/peticiones/${peticion.id}`)
    } catch (err) {
      console.error(err)
      setError('No se pudo crear la petición. Revisá los datos y probá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-9">

          <span className="eyebrow">Nueva petición</span>
          <h1 className="page-title mt-3 mb-2">Crear petición</h1>

          <p className="text-muted mb-4">
            Describí una problemática de tu barrio. La categoría y el barrio
            se completan solos a partir de lo que escribas y de la ubicación.
          </p>

          <div className="card">
          <div className="card-body">

          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            <div className="mb-3">
              <label className="form-label">
                Título
              </label>

              <input
                type="text"
                name="titulo"
                className="form-control"
                value={form.titulo}
                onChange={handleChange}
                maxLength="200"
                placeholder="Ej: Bache peligroso en Av. Colón al 1200"
                required
              />
            </div>

            <div className="mb-4">
              <label className="form-label">
                Descripción
              </label>

              <textarea
                name="descripcion"
                className="form-control"
                rows="5"
                value={form.descripcion}
                onChange={handleChange}
                placeholder="Contá qué pasa, desde cuándo y a quiénes afecta."
                required
              />

              {alertasTexto.length > 0 && (
                <p className="small text-danger mt-2 mb-0">
                  {tieneDatosPersonales(alertasTexto)
                    ? `Tu petición tiene ${describirAlertas(alertasTexto)}. Es pública: mejor no incluyas datos personales.`
                    : `Tu petición podría tener ${describirAlertas(alertasTexto)}. Un moderador la va a revisar con más atención.`}
                </p>
              )}

              <PeticionesSimilares
                texto={`${form.titulo} ${form.descripcion}`}
                ubicacion={ubicacion}
              />
            </div>

            <div className="mb-4">
              <label className="form-label">
                Fotos (opcional, hasta 3)
              </label>

              <SelectorFotos onChange={setFotos} />
            </div>

            <div className="mb-4">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                <label className="form-label mb-0">
                  Ubicación
                </label>

                <button type="button" className="btn btn-ghost btn-sm" onClick={usarMiUbicacion}>
                  <Icon name="map" size={16} className="me-2" />
                  Usar mi ubicación
                </button>
              </div>

              <SelectorUbicacion
                valor={ubicacion}
                onChange={setUbicacion}
              />

              {errorUbicacion && (
                <p className="text-danger small mt-2 mb-0">{errorUbicacion}</p>
              )}
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <div className="campo-auto-head">
                  <label className="form-label mb-0">
                    Categoría
                  </label>

                  <EtiquetaAuto
                    automatico={!categoriaManual && Boolean(categoriaSugerida)}
                    manual={categoriaManual}
                    sugerencia={categoriaSugerida && String(categoriaSugerida.id) !== categoriaId
                      ? categoriaSugerida.nombre
                      : null}
                    onRestablecer={() => setCategoriaManual(false)}
                  />
                </div>

                <select
                  name="categoriaId"
                  className="form-select"
                  value={categoriaId}
                  onChange={elegirCategoria}
                  disabled={loadingOptions}
                  required
                >
                  <option value="">
                    {categoriaManual ? 'Seleccionar categoría' : 'Se detecta al escribir...'}
                  </option>

                  {categorias.map((categoria) => (
                    <option
                      key={categoria.id}
                      value={categoria.id}
                    >
                      {categoria.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6 mb-4">
                <div className="campo-auto-head">
                  <label className="form-label mb-0">
                    Barrio
                  </label>

                  <EtiquetaAuto
                    automatico={!zonaManual && Boolean(zonaDetectada)}
                    manual={zonaManual}
                    sugerencia={zonaDetectada && String(zonaDetectada.id) !== zonaId
                      ? zonaDetectada.nombre
                      : null}
                    onRestablecer={() => setZonaManual(false)}
                  />
                </div>

                <select
                  name="zonaId"
                  className="form-select"
                  value={zonaId}
                  onChange={elegirZona}
                  disabled={loadingOptions}
                  required
                >
                  <option value="">
                    {zonaManual ? 'Seleccionar barrio' : 'Se detecta con la ubicación...'}
                  </option>

                  <OpcionesBarrios zonas={zonas} />
                </select>

                {ubicacion && !zonaDetectada && !zonaManual && (
                  <p className="text-muted small mt-2 mb-0">
                    La ubicación está lejos de los barrios cargados: elegilo a mano.
                  </p>
                )}
              </div>
            </div>

            <hr className="mt-0 mb-4" />

            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
              <p className="text-muted small mb-0">
                Tu petición será revisada antes de publicarse.
              </p>

              <button
                type="submit"
                className="btn btn-dark"
                disabled={loading || loadingOptions}
              >
                {loading
                  ? (fotos.length ? 'Subiendo fotos...' : 'Creando petición...')
                  : 'Crear petición'}
              </button>
            </div>

          </form>

          </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default CreatePetition
