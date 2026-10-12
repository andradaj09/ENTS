import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { logoutUser } from '../services/authService'
import { nombreRol } from '../utils/roles'
import { useEsDueno } from '../hooks/useEsDueno'
import { aplicarTema, temaActual } from '../utils/tema'
import { alCambiarInstalacion, esIOS, instalar, puedeInstalarDirecto, yaInstalada } from '../utils/instalacion'
import Avatar from './Avatar'
import Icon from './Icon'

// Burbuja del avatar en el cabezal: despliega los datos de la cuenta,
// accesos rápidos y el botón para cerrar sesión.
function MenuUsuario({ user, profile }) {
  const navigate = useNavigate()
  const { esDueno } = useEsDueno(user?.id)
  const [abierto, setAbierto] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const [oscuro, setOscuro] = useState(() => temaActual() === 'oscuro')
  const [instalada, setInstalada] = useState(yaInstalada)
  const [, setVersionInstalacion] = useState(0)
  const [ayudaInstalar, setAyudaInstalar] = useState(false)

  // Se vuelve a dibujar cuando el navegador habilita (o termina) la instalación
  useEffect(() => alCambiarInstalacion(() => {
    setVersionInstalacion((v) => v + 1)
    setInstalada(yaInstalada())
  }), [])

  const instalarApp = async () => {
    const resultado = await instalar()
    if (resultado === 'manual') setAyudaInstalar(true)
    if (resultado === 'aceptada') setAbierto(false)
  }

  // Interruptor de modo oscuro (queda guardado en este navegador)
  const alternarTema = () => {
    aplicarTema(oscuro ? 'claro' : 'oscuro')
    setOscuro(!oscuro)
  }

  const contenedorRef = useRef(null)

  useEffect(() => {
    if (!abierto) return

    const alClicAfuera = (e) => {
      if (!contenedorRef.current?.contains(e.target)) setAbierto(false)
    }

    const alEscape = (e) => {
      if (e.key === 'Escape') setAbierto(false)
    }

    document.addEventListener('pointerdown', alClicAfuera)
    document.addEventListener('keydown', alEscape)

    return () => {
      document.removeEventListener('pointerdown', alClicAfuera)
      document.removeEventListener('keydown', alEscape)
    }
  }, [abierto])

  const cerrarSesion = async () => {
    setSaliendo(true)

    try {
      await logoutUser()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Error cerrando sesión:', error)
      setSaliendo(false)
    }
  }

  const nombre = [profile?.nombre, profile?.apellido].filter(Boolean).join(' ')

  return (
    <div className="menu-usuario" ref={contenedorRef}>
      <button
        type="button"
        className="topbar-burbuja topbar-avatar"
        onClick={() => setAbierto(!abierto)}
        aria-label="Abrir el menú de tu cuenta"
        aria-expanded={abierto}
      >
        <Avatar perfil={profile} size={44} dueno={esDueno} />
      </button>

      {abierto && (
        <div className="menu-usuario-panel" role="menu">
          <div className="menu-usuario-cabecera">
            <Avatar perfil={profile} size={46} dueno={esDueno} sinEtiqueta />
            <div>
              <strong>{nombre || 'Mi cuenta'}</strong>
              <span>{user?.email}</span>
              <small>{nombreRol(profile?.rol, esDueno)}</small>
            </div>
          </div>

          <Link to="/perfil" className="menu-usuario-opcion" role="menuitem" onClick={() => setAbierto(false)}>
            <Icon name="user" size={18} />
            Mi perfil
          </Link>

          <Link to="/dashboard" className="menu-usuario-opcion" role="menuitem" onClick={() => setAbierto(false)}>
            <Icon name="file" size={18} />
            Mis solicitudes
          </Link>

          {!instalada && (
            <button
              type="button"
              className="menu-usuario-opcion"
              role="menuitem"
              onClick={instalarApp}
            >
              <Icon name="download" size={18} />
              Instalar app
              {puedeInstalarDirecto() && <span className="menu-usuario-nuevo">Lista</span>}
            </button>
          )}

          {ayudaInstalar && (
            <p className="menu-usuario-ayuda">
              {esIOS()
                ? 'En Safari tocá Compartir y después "Agregar a inicio".'
                : 'Abrí el menú del navegador (⋮ arriba a la derecha) y elegí "Instalar ENTS" o "Agregar a la pantalla de inicio".'}
            </p>
          )}

          <button
            type="button"
            className="menu-usuario-opcion menu-usuario-tema"
            role="switch"
            aria-checked={oscuro}
            onClick={alternarTema}
          >
            Modo oscuro
            <span className={`interruptor${oscuro ? ' encendido' : ''}`} aria-hidden="true">
              <span />
            </span>
          </button>

          <button
            type="button"
            className="menu-usuario-opcion menu-usuario-salir"
            role="menuitem"
            onClick={cerrarSesion}
            disabled={saliendo}
          >
            <Icon name="logout" size={18} />
            {saliendo ? 'Cerrando sesión...' : 'Cerrar sesión'}
          </button>
        </div>
      )}
    </div>
  )
}

export default MenuUsuario
