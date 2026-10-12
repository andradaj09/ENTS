import { useEffect, useState } from 'react'
import { getZonas } from '../services/petitionService'
import {
  dejarDeSeguirBarrio,
  getBarriosSeguidos,
  seguirBarrio,
} from '../services/participacionService'
import OpcionesBarrios from './OpcionesBarrios'
import Icon from './Icon'

// Barrios de los que la persona quiere recibir avisos (no solo el suyo):
// cada petición nueva que se publique ahí le llega a la campanita.
function BarriosSeguidos({ usuarioId }) {
  const [zonas, setZonas] = useState([])
  const [seguidos, setSeguidos] = useState([])
  const [elegido, setElegido] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getZonas(), getBarriosSeguidos()])
      .then(([zonasData, seguidosData]) => {
        setZonas(zonasData)
        setSeguidos(seguidosData)
      })
      .catch((err) => {
        console.error('Error cargando barrios seguidos:', err)
        setError('No se pudieron cargar tus barrios.')
      })
  }, [])

  const seguir = async (e) => {
    e.preventDefault()
    if (!elegido) return

    const zonaId = Number(elegido)

    try {
      await seguirBarrio(usuarioId, zonaId)
      setSeguidos((actuales) => [...new Set([...actuales, zonaId])])
      setElegido('')
    } catch (err) {
      console.error('Error siguiendo barrio:', err)
      setError('No se pudo seguir el barrio.')
    }
  }

  const dejar = async (zonaId) => {
    try {
      await dejarDeSeguirBarrio(usuarioId, zonaId)
      setSeguidos((actuales) => actuales.filter((id) => id !== zonaId))
    } catch (err) {
      console.error('Error dejando de seguir:', err)
      setError('No se pudo dejar de seguir el barrio.')
    }
  }

  const nombre = (id) => zonas.find((z) => z.id === id)?.nombre ?? '...'
  const disponibles = zonas.filter((z) => !seguidos.includes(z.id))

  return (
    <>
      <p className="text-muted small">
        Te avisamos cuando se publique una petición nueva en estos barrios.
      </p>

      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      {seguidos.length > 0 && (
        <ul className="chips-barrios">
          {seguidos.map((id) => (
            <li key={id}>
              {nombre(id)}
              <button type="button" onClick={() => dejar(id)} aria-label={`Dejar de seguir ${nombre(id)}`}>
                <Icon name="close" size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="d-flex gap-2" onSubmit={seguir}>
        <select
          className="form-select form-select-sm"
          value={elegido}
          onChange={(e) => setElegido(e.target.value)}
          aria-label="Barrio para seguir"
        >
          <option value="">Elegí un barrio...</option>
          <OpcionesBarrios zonas={disponibles} />
        </select>
        <button className="btn btn-dark btn-sm text-nowrap" disabled={!elegido}>
          Seguir
        </button>
      </form>
    </>
  )
}

export default BarriosSeguidos
