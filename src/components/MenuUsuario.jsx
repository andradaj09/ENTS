import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { logoutUser } from '../services/authService'
import { nombreRol } from '../utils/roles'
import Avatar from './Avatar'
import Icon from './Icon'

// Burbuja del avatar en el cabezal: despliega los datos de la cuenta,
// accesos rápidos y el botón para cerrar sesión.
function MenuUsuario({ user, profile }) {
  const navigate = useNavigate()
  const [abierto, setAbierto] = useState(false)
  const [saliendo, setSaliendo] = useState(false)

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
        <Avatar perfil={profile} size={44} />
      </button>

      {abierto && (
        <div className="menu-usuario-panel" role="menu">
          <div className="menu-usuario-cabecera">
            <Avatar perfil={profile} size={46} />
            <div>
              <strong>{nombre || 'Mi cuenta'}</strong>
              <span>{user?.email}</span>
              <small>{nombreRol(profile?.rol)}</small>
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
