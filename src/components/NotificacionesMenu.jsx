import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getNotificaciones } from '../services/petitionService'
import {
  getUltimaVista,
  marcarNotificacionesVistas,
} from '../utils/notificaciones'
import { tiempoRelativo } from '../utils/format'
import Icon from './Icon'

const TEXTOS = {
  publicada: { icono: 'check', texto: 'Tu petición fue publicada' },
  rechazada: { icono: 'alert', texto: 'Tu petición fue rechazada' },
  firma: { icono: 'pen', texto: 'Nueva firma en tu petición' },
}

// Campana del cabezal: muestra la cantidad sin leer y despliega
// un panel de vidrio con las notificaciones.
function NotificacionesMenu({ usuarioId }) {
  const [abierto, setAbierto] = useState(false)
  const [notificaciones, setNotificaciones] = useState([])
  const [ultimaVista, setUltimaVista] = useState(() => getUltimaVista(usuarioId))
  const [error, setError] = useState(false)
  const contenedorRef = useRef(null)

  useEffect(() => {
    let activo = true

    getNotificaciones(usuarioId)
      .then((datos) => {
        if (activo) setNotificaciones(datos)
      })
      .catch((err) => {
        console.error('Error cargando notificaciones:', err)
        if (activo) setError(true)
      })

    return () => {
      activo = false
    }
  }, [usuarioId])

  // Al cerrar (de cualquier forma), lo que se vio deja de contar como nuevo
  const cerrar = () => {
    setUltimaVista(Date.now())
    setAbierto(false)
  }

  // Cerrar con clic afuera o con Escape
  useEffect(() => {
    if (!abierto) return

    const alClicAfuera = (e) => {
      if (!contenedorRef.current?.contains(e.target)) cerrar()
    }

    const alEscape = (e) => {
      if (e.key === 'Escape') cerrar()
    }

    document.addEventListener('pointerdown', alClicAfuera)
    document.addEventListener('keydown', alEscape)

    return () => {
      document.removeEventListener('pointerdown', alClicAfuera)
      document.removeEventListener('keydown', alEscape)
    }
  }, [abierto])

  const esNueva = (n) => new Date(n.fecha).getTime() > ultimaVista
  const sinLeer = notificaciones.filter(esNueva).length

  const alternar = () => {
    if (abierto) {
      cerrar()
      return
    }

    marcarNotificacionesVistas(usuarioId)
    setAbierto(true)
  }

  return (
    <div className="notif-menu" ref={contenedorRef}>
      <button
        className="topbar-burbuja notif-boton"
        onClick={alternar}
        aria-label={`Notificaciones${sinLeer ? `, ${sinLeer} sin leer` : ''}`}
        aria-expanded={abierto}
      >
        <Icon name="bell" size={22} />
        {sinLeer > 0 && (
          <span className="notif-contador">{sinLeer > 9 ? '9+' : sinLeer}</span>
        )}
      </button>

      {abierto && (
        <div className="notif-panel" role="dialog" aria-label="Notificaciones">
          <div className="notif-panel-head">
            <strong>Notificaciones</strong>
            {sinLeer > 0 && <span>{sinLeer} nuevas</span>}
          </div>

          <div className="notif-panel-lista">
            {error && (
              <p className="notif-vacio">No se pudieron cargar las notificaciones.</p>
            )}

            {!error && notificaciones.length === 0 && (
              <p className="notif-vacio">
                Cuando tus peticiones reciban firmas o cambien de estado, te avisamos acá.
              </p>
            )}

            {notificaciones.map((n) => {
              const { icono, texto } = TEXTOS[n.tipo]

              return (
                <Link
                  className={`notif-item${esNueva(n) ? ' unread' : ''}`}
                  to={`/peticiones/${n.peticionId}`}
                  key={n.id}
                  onClick={cerrar}
                >
                  <span className={`icon-chip${esNueva(n) ? ' dark' : ''}`}>
                    <Icon name={icono} size={18} />
                  </span>

                  <div>
                    <p>{texto}</p>
                    <span>{n.titulo} · {tiempoRelativo(n.fecha)}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificacionesMenu
