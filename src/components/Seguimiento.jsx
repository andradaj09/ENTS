import { useEffect, useState } from 'react'
import { actualizarSeguimiento, getSeguimiento } from '../services/participacionService'
import { urlFotoPeticion } from '../services/petitionService'
import { ETAPAS_SEGUIMIENTO, nombreEtapa } from '../utils/prioridad'
import { comprimirImagen } from '../utils/imagenes'
import { tiempoRelativo } from '../utils/format'
import Icon from './Icon'

// Línea de tiempo de una petición publicada: en qué etapa está y qué
// respondió el municipio. Los funcionarios del área (y los admins) pueden
// sumar una actualización con mensaje y foto del avance.
function Seguimiento({ peticion, usuarioId, puedeResponder, onCambio }) {
  const [historial, setHistorial] = useState([])
  const [version, setVersion] = useState(0)
  const [error, setError] = useState('')

  const [estado, setEstado] = useState(peticion.seguimiento ?? 'recibida')
  const [mensaje, setMensaje] = useState('')
  const [foto, setFoto] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [errorForm, setErrorForm] = useState('')

  useEffect(() => {
    let activo = true

    getSeguimiento(peticion.id)
      .then((datos) => activo && setHistorial(datos))
      .catch((err) => {
        console.error('Error cargando el seguimiento:', err)
        if (activo) setError('No se pudo cargar el seguimiento.')
      })

    return () => {
      activo = false
    }
  }, [peticion.id, version])

  const etapaActual = ETAPAS_SEGUIMIENTO.findIndex((e) => e.clave === (peticion.seguimiento ?? 'recibida'))

  const elegirFoto = async (e) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return

    try {
      setFoto(await comprimirImagen(archivo))
    } catch {
      setErrorForm('No se pudo procesar la foto.')
    }
  }

  const enviar = async (e) => {
    e.preventDefault()
    setErrorForm('')
    setEnviando(true)

    try {
      await actualizarSeguimiento({ peticionId: peticion.id, usuarioId, estado, mensaje: mensaje.trim(), foto })
      setMensaje('')
      setFoto(null)
      setVersion((v) => v + 1)
      onCambio?.(estado)
    } catch (err) {
      console.error('Error actualizando el seguimiento:', err)
      setErrorForm(
        err.message?.includes('otra área')
          ? 'Esta petición corresponde a otra área.'
          : 'No se pudo guardar la actualización.'
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="card mb-4">
      <div className="card-body">
        <p className="line-label">Seguimiento</p>

        <ol className="etapas" aria-label="Etapas de la petición">
          {ETAPAS_SEGUIMIENTO.map((etapa, i) => (
            <li
              key={etapa.clave}
              className={i < etapaActual ? 'hecha' : i === etapaActual ? 'actual' : ''}
              aria-current={i === etapaActual ? 'step' : undefined}
            >
              <span className="etapa-punto">{i < etapaActual ? <Icon name="check" size={13} /> : i + 1}</span>
              <strong>{etapa.nombre}</strong>
              <small>{etapa.descripcion}</small>
            </li>
          ))}
        </ol>

        {error && <p className="text-muted small">{error}</p>}

        {historial.length === 0 && !error && (
          <p className="text-muted small mb-0">
            Todavía no hay respuestas oficiales. Te avisamos apenas el municipio actualice esta petición.
          </p>
        )}

        {historial.length > 0 && (
          <ul className="historial">
            {[...historial].reverse().map((item) => (
              <li key={item.id}>
                <span className={`badge seguimiento-badge etapa-${item.estado}`}>{nombreEtapa(item.estado)}</span>
                <div>
                  <strong>
                    <Icon name="shield" size={14} className="me-1" />
                    {item.responsable}
                    {item.nombre && <span className="text-muted fw-normal"> · {item.nombre}</span>}
                  </strong>
                  <small>{tiempoRelativo(item.fecha)}</small>
                  {item.mensaje && <p>{item.mensaje}</p>}
                  {item.foto && (
                    <a href={urlFotoPeticion(item.foto)} target="_blank" rel="noreferrer">
                      <img src={urlFotoPeticion(item.foto)} alt="Foto del avance" loading="lazy" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {puedeResponder && peticion.estado === 'publicada' && (
          <form className="respuesta-oficial" onSubmit={enviar}>
            <p className="small fw-semibold mb-2">
              <Icon name="pen" size={14} className="me-1" />
              Respuesta oficial
            </p>

            {errorForm && <div className="alert alert-danger py-2 small">{errorForm}</div>}

            <select
              className="form-select form-select-sm mb-2"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              aria-label="Nueva etapa"
            >
              {ETAPAS_SEGUIMIENTO.map((etapa) => (
                <option key={etapa.clave} value={etapa.clave}>{etapa.nombre}</option>
              ))}
            </select>

            <textarea
              className="form-control form-control-sm mb-2"
              rows="3"
              maxLength="1000"
              placeholder="Contale a los vecinos qué se está haciendo (opcional)"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
            />

            <div className="d-flex flex-wrap align-items-center gap-2">
              <label className="btn btn-ghost btn-sm mb-0">
                <Icon name="image" size={15} className="me-1" />
                {foto ? 'Cambiar foto' : 'Foto del avance'}
                <input type="file" accept="image/*" hidden onChange={elegirFoto} />
              </label>
              {foto && (
                <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setFoto(null)}>
                  Quitar foto
                </button>
              )}
              <button className="btn btn-dark btn-sm ms-auto" disabled={enviando}>
                {enviando ? 'Guardando...' : 'Publicar actualización'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default Seguimiento
