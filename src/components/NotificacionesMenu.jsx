import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getNotificaciones, marcarNotificacionesLeidas } from '../services/petitionService'
import { tiempoRelativo } from '../utils/format'
import { nombreEtapa } from '../utils/prioridad'
import Icon from './Icon'

// Texto de cada tipo de aviso (el mensaje trae el dato variable)
const TEXTOS = {
  publicada: { icono: 'check', texto: () => 'Tu petición fue publicada' },
  rechazada: { icono: 'alert', texto: () => 'Tu petición fue rechazada' },
  firma: { icono: 'pen', texto: () => 'Nueva firma en tu petición' },
  hito: { icono: 'up', texto: (m) => `Llegó a ${m} firmas` },
  elevada: { icono: 'flag', texto: () => 'Petición elevada a tu área: alcanzó la meta de firmas' },
  seguimiento: { icono: 'shield', texto: (m) => `Respuesta oficial: ahora está "${nombreEtapa(m)}"` },
  comentario: { icono: 'megaphone', texto: () => 'Nuevo comentario en tu petición' },
  barrio: { icono: 'map', texto: (m) => `Nueva petición en ${m}` },
}

const SIN_TEXTO = { icono: 'bell', texto: () => 'Novedad en una petición' }

// Campana del cabezal: muestra la cantidad sin leer y despliega
// un panel de vidrio con las notificaciones.
function NotificacionesMenu({ usuarioId }) {
  const [abierto, setAbierto] = useState(false)
  const [notificaciones, setNotificaciones] = useState([])
  const [error, setError] = useState(false)
  const contenedorRef = useRef(null)

  useEffect(() => {
    let activo = true

    const cargar = () =>
      getNotificaciones()
        .then((datos) => {
          if (activo) setNotificaciones(datos)
        })
        .catch((err) => {
          console.error('Error cargando notificaciones:', err)
          if (activo) setError(true)
        })

    cargar()

    // Se vuelve a consultar cada minuto mientras la pestaña está visible
    const intervalo = setInterval(() => {
      if (document.visibilityState === 'visible') cargar()
    }, 60000)

    return () => {
      activo = false
      clearInterval(intervalo)
    }
  }, [usuarioId])

  // Al cerrar (de cualquier forma), lo que se vio deja de contar como nuevo
  const cerrar = () => {
    setNotificaciones((actuales) =>
      actuales.some((n) => !n.leida) ? actuales.map((n) => ({ ...n, leida: true })) : actuales
    )
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

  const esNueva = (n) => !n.leida
  const sinLeer = notificaciones.filter(esNueva).length

  const alternar = () => {
    if (abierto) {
      cerrar()
      return
    }

    // Se marcan leídas en la base (vale para todos los dispositivos)
    if (sinLeer > 0) {
      marcarNotificacionesLeidas().catch((err) =>
        console.error('Error marcando notificaciones:', err)
      )
    }
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
                Cuando tus peticiones (o las que firmaste) tengan novedades, te avisamos acá.
              </p>
            )}

            {/* Las novedades sin leer del barrio propio van primero */}
            {[...notificaciones]
              .sort((a, b) => (esNueva(b) && b.deMiBarrio) - (esNueva(a) && a.deMiBarrio))
              .map((n) => {
              const { icono, texto } = TEXTOS[n.tipo] ?? SIN_TEXTO

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
                    <p>
                      {texto(n.mensaje)}
                      {n.deMiBarrio && <span className="etiqueta-mi-barrio">Tu barrio</span>}
                    </p>
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
