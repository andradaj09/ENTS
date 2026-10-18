import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getZonas } from '../services/petitionService'
import { mostrarMiBarrio } from '../services/participacionService'
import ElegirBarrio from './ElegirBarrio'

const DIAS_ENTRE_CAMBIOS = 30
const formatoFecha = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long' })

// Sección "Mi barrio" del perfil: barrio actual, cambio (una vez cada 30 días)
// y la opción de mostrar "Vecino/a de X" en los comentarios propios.
function MiBarrioPerfil() {
  const { profile, setProfile } = useAuth()
  const [zonas, setZonas] = useState([])
  const [cambiando, setCambiando] = useState(false)
  const [guardandoOpcion, setGuardandoOpcion] = useState(false)
  // Hora tomada una vez al abrir la sección (para saber si ya puede cambiar)
  const [ahora] = useState(() => Date.now())

  useEffect(() => {
    getZonas().then(setZonas).catch((err) => console.error('Error cargando barrios:', err))
  }, [])

  // Desde "Cambiar" en el inicio se llega con #mi-barrio: se baja hasta acá
  useEffect(() => {
    if (window.location.hash === '#mi-barrio') {
      document.getElementById('mi-barrio')?.scrollIntoView({ block: 'center' })
    }
  }, [])

  const barrio = zonas.find((z) => z.id === profile?.zona_id)
  const proximoCambio = profile?.zona_cambiada_at
    ? new Date(new Date(profile.zona_cambiada_at).getTime() + DIAS_ENTRE_CAMBIOS * 86400000)
    : null
  const puedeCambiar = !profile?.zona_id || !proximoCambio || proximoCambio.getTime() <= ahora

  const alternarMostrar = async () => {
    const nuevo = !profile?.mostrar_barrio
    setGuardandoOpcion(true)
    try {
      await mostrarMiBarrio(nuevo)
      setProfile((actual) => ({ ...actual, mostrar_barrio: nuevo }))
    } catch (err) {
      console.error('Error guardando la preferencia:', err)
    } finally {
      setGuardandoOpcion(false)
    }
  }

  return (
    <div className="mi-barrio-perfil">
      {profile?.zona_id ? (
        <p className="mi-barrio-actual">
          Vivís en <strong>{barrio?.nombre ?? '...'}</strong>
          {barrio?.localidad && <span> · {barrio.localidad}</span>}
        </p>
      ) : (
        <p className="text-muted">
          Todavía no elegiste tu barrio. Con él te mostramos primero lo que pasa cerca tuyo.
        </p>
      )}

      {(!profile?.zona_id || cambiando) && puedeCambiar && (
        <ElegirBarrio onListo={() => setCambiando(false)} />
      )}

      {profile?.zona_id && !cambiando && puedeCambiar && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCambiando(true)}>
          Cambiar de barrio
        </button>
      )}

      {profile?.zona_id && !puedeCambiar && (
        <p className="text-muted small mb-0">
          Podés cambiar tu barrio una vez por mes: la próxima vez será a partir del {formatoFecha.format(proximoCambio)}.
        </p>
      )}

      {profile?.zona_id && (
        <button
          type="button"
          role="switch"
          aria-checked={Boolean(profile.mostrar_barrio)}
          className="mi-barrio-opcion"
          onClick={alternarMostrar}
          disabled={guardandoOpcion}
        >
          <span>
            Mostrar "Vecino/a de {barrio?.nombre ?? 'tu barrio'}" en mis comentarios
            <small>Suma confianza a lo que contás. En un barrio chico podría dar pistas de quién sos.</small>
          </span>
          <span className={`interruptor${profile.mostrar_barrio ? ' encendido' : ''}`} aria-hidden="true">
            <span />
          </span>
        </button>
      )}
    </div>
  )
}

export default MiBarrioPerfil
