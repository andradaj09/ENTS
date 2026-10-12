import { Suspense, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { logoutUser } from '../services/authService'
import Icon from '../components/Icon'
import Logo from '../components/Logo'
import MenuUsuario from '../components/MenuUsuario'
import FondoAnimado from '../components/FondoAnimado'
import NotificacionesMenu from '../components/NotificacionesMenu'
import { usePermisos } from '../hooks/usePermisos'
import { PANELES, panelPorClave } from '../utils/paneles'

const sideLinkClass = ({ isActive }) =>
  `side-link${isActive ? ' active' : ''}`

const PANELES_VECINALES = PANELES.filter((p) =>
  ['dashboard', 'mapa', 'comunidad', 'estadisticas', 'eventos', 'perfil'].includes(p.clave)
)

const enlace = (panel) => (
  <NavLink key={panel.clave} className={sideLinkClass} to={panel.ruta}>
    <Icon name={panel.icono} size={22} />
    {panel.nombre}
  </NavLink>
)

function MainLayout() {
  const { user, profile } = useAuth()
  const { puede, esDueno } = usePermisos(user?.id)
  const navigate = useNavigate()
  const location = useLocation()

  // El cajón del menú (en celular) queda abierto solo en la ruta donde se abrió,
  // así se cierra solo al navegar
  const [menuAbiertoEn, setMenuAbiertoEn] = useState(null)
  const [menuColapsado, setMenuColapsado] = useState(false)

  const menuAbierto = menuAbiertoEn === location.pathname
  const setMenuAbierto = (abierto) =>
    setMenuAbiertoEn(abierto ? location.pathname : null)

  const toggleMenu = () => {
    if (window.matchMedia('(max-width: 991.98px)').matches) {
      setMenuAbierto(!menuAbierto)
    } else {
      setMenuColapsado((colapsado) => !colapsado)
    }
  }

  const handleLogout = async () => {
    try {
      await logoutUser()
      navigate('/login')
    } catch (error) {
      console.error('Error cerrando sesión:', error)
    }
  }

  const gridClass = [
    'app-grid',
    menuAbierto && 'sidebar-open',
    menuColapsado && 'sidebar-collapsed',
  ].filter(Boolean).join(' ')

  return (
    <>
      <FondoAnimado fijo suave />

      {/* Accesibilidad: con teclado, el primer Tab permite saltar el menú */}
      <a className="skip-link" href="#contenido">Saltar al contenido</a>

      <header className="topbar">
        <div className="topbar-fila">
          <div className="topbar-pill">
            <Link className="topbar-brand" to="/">
              <Logo />
              <span className="topbar-nombre">Everyone Needs To Smile</span>
            </Link>

            <button
              className="icon-btn"
              onClick={toggleMenu}
              aria-label="Abrir o cerrar el menú"
              aria-expanded={menuAbierto}
            >
              <Icon name={menuAbierto ? 'close' : 'menu'} size={24} />
            </button>
          </div>

          {/* Campana y avatar: burbujas separadas a la derecha de la píldora */}
          <div className="topbar-burbujas">
            {user && <NotificacionesMenu usuarioId={user.id} />}

            <MenuUsuario user={user} profile={profile} />
          </div>
        </div>
      </header>

      <div className={gridClass}>
        <div
          className="sidebar-backdrop"
          onClick={() => setMenuAbierto(false)}
        />

        <aside className="sidebar panel">

          <NavLink className={sideLinkClass} to="/" end>
            <Icon name="home" size={22} />
            Inicio
          </NavLink>

          {/* Cada enlace aparece según los permisos que definió el dueño */}
          {PANELES_VECINALES.filter((p) => puede(p.clave)).map(enlace)}

          {puede('bandeja') && (
            <>
              <p className="side-label">Gestión</p>
              {enlace(panelPorClave('bandeja'))}
            </>
          )}

          {puede('moderacion') && (
            <>
              <p className="side-label">Moderación</p>
              {enlace(panelPorClave('moderacion'))}
            </>
          )}

          {(puede('usuarios') || puede('panel')) && (
            <>
              <p className="side-label">Administración</p>
              {puede('usuarios') && enlace(panelPorClave('usuarios'))}
              {puede('panel') && enlace(panelPorClave('panel'))}
            </>
          )}

          {puede('documentos') && enlace(panelPorClave('documentos'))}

          {esDueno && (
            <NavLink className={sideLinkClass} to="/permisos">
              <Icon name="key" size={22} />
              Permisos
            </NavLink>
          )}

          <p className="side-label">Cuenta</p>

          <button className="side-link" onClick={handleLogout}>
            <Icon name="logout" size={22} />
            Cerrar sesión
          </button>

          <div className="side-note">
            <Icon name="flag" size={22} />
            <p>Un mejor barrio también se construye desde vos.</p>
            <span>Juntos hacemos la diferencia.</span>
          </div>

        </aside>

        <main className="app-main" id="contenido" tabIndex={-1}>
          {/* key: cada página vuelve a animar su entrada al navegar */}
          <div className="page-enter" key={location.pathname}>
            {/* Mientras se descarga una página, el menú y la barra siguen visibles */}
            <Suspense fallback={<div className="cargando-pagina" role="status">Cargando...</div>}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </>
  )
}

export default MainLayout
