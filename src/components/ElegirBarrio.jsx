import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getZonas } from '../services/petitionService'
import { elegirMiBarrio } from '../services/participacionService'
import { detectarBarrio } from '../utils/barrios'
import Icon from './Icon'
import OpcionesBarrios from './OpcionesBarrios'

// Elegir el barrio donde vive el vecino: a mano o con la ubicación del
// dispositivo. Se usa en la ventana del primer ingreso y en el perfil.
// La base valida el barrio y el límite de un cambio cada 30 días.
function ElegirBarrio({ onListo, textoBoton = 'Guardar mi barrio' }) {
  const { profile, setProfile } = useAuth()
  const [zonas, setZonas] = useState([])
  const [zonaId, setZonaId] = useState(profile?.zona_id ? String(profile.zona_id) : '')
  const [ubicando, setUbicando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getZonas().then(setZonas).catch((err) => console.error('Error cargando barrios:', err))
  }, [])

  const usarUbicacion = () => {
    if (!navigator.geolocation) {
      setError('Tu navegador no permite obtener la ubicación. Elegí el barrio de la lista.')
      return
    }

    setUbicando(true)
    setError('')
    setAviso('')

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const barrio = detectarBarrio({ lat: coords.latitude, lng: coords.longitude }, zonas)
        setUbicando(false)
        if (barrio) {
          setZonaId(String(barrio.id))
          setAviso(`Detectamos ${barrio.nombre}. Si no es tu barrio, cambialo en la lista.`)
        } else {
          setError('Tu ubicación está lejos de los barrios cargados. Elegilo de la lista.')
        }
      },
      () => {
        setUbicando(false)
        setError('No pudimos obtener tu ubicación. Elegí el barrio de la lista.')
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (!zonaId) return

    setGuardando(true)
    setError('')

    try {
      const resultado = await elegirMiBarrio(zonaId)
      setProfile((actual) => ({ ...actual, zona_id: resultado.zona_id, zona_cambiada_at: resultado.zona_cambiada_at }))
      onListo?.(resultado.zona_id)
    } catch (err) {
      console.error('Error guardando el barrio:', err)
      setError(err.hint === 'limite_cambio' ? err.message : 'No se pudo guardar el barrio. Probá de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form className="elegir-barrio" onSubmit={guardar}>
      <div className="elegir-barrio-fila">
        <select
          className="form-select"
          value={zonaId}
          onChange={(e) => { setZonaId(e.target.value); setAviso('') }}
          aria-label="Tu barrio"
          required
        >
          <option value="">Elegí tu barrio</option>
          <OpcionesBarrios zonas={zonas} />
        </select>

        <button type="button" className="btn btn-ghost" onClick={usarUbicacion} disabled={ubicando || zonas.length === 0}>
          <Icon name="map" size={16} className="me-2" />
          {ubicando ? 'Buscando...' : 'Usar mi ubicación'}
        </button>
      </div>

      {aviso && <p className="text-muted small mb-2">{aviso}</p>}
      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      <button className="btn btn-dark" disabled={!zonaId || guardando}>
        {guardando ? 'Guardando...' : textoBoton}
      </button>
    </form>
  )
}

export default ElegirBarrio
