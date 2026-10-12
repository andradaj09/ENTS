import { Suspense, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { logoutUser } from '../services/authService'
import Icon from '../components/Icon'
import Logo from '../components/Logo'
import MenuUsuario from '../components/MenuUsuario'
import FondoAnimado from '../components/FondoAnimado'
import NotificacionesMenu from '../components/NotificacionesMenu'

const sideLinkClass = ({ isActive }) =>
  `side-link${isActive ? ' active' : ''}`

function MainLayout() {
  const { user, profile } = useAuth()
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

          <NavLink className={sideLinkClass} to="/dashboard">
            <Icon name="file" size={22} />
            Mis solicitudes
          </NavLink>

          <NavLink className={sideLinkClass} to="/mapa">
            <Icon name="map" size={22} />
            Mapa vecinal
          </NavLink>

          <NavLink className={sideLinkClass} to="/comunidad">
            <Icon name="users" size={22} />
            Comunidad
          </NavLink>

          <NavLink className={sideLinkClass} to="/estadisticas">
            <Icon name="chart" size={22} />
            Estadísticas
          </NavLink>

          <NavLink className={sideLinkClass} to="/eventos">
            <Icon name="calendar" size={22} />
            Eventos
          </NavLink>

          <NavLink className={sideLinkClass} to="/perfil">
            <Icon name="user" size={22} />
            Perfil
          </NavLink>

          {(profile?.rol === 'funcionario' || profile?.rol === 'admin') && (
            <>
              <p className="side-label">Gestión</p>

              <NavLink className={sideLinkClass} to="/bandeja">
                <Icon name="list" size={22} />
                Bandeja del área
              </NavLink>
            </>
          )}

          {profile?.rol === 'admin' && (
            <>
              <p className="side-label">Administración</p>

              <NavLink className={sideLinkClass} to="/admin/peticiones">
                <Icon name="shield" size={22} />
                Moderación
              </NavLink>

              <NavLink className={sideLinkClass} to="/admin/usuarios">
                <Icon name="users" size={22} />
                Usuarios
              </NavLink>

              <NavLink className={sideLinkClass} to="/admin/estadisticas">
                <Icon name="chart" size={22} />
                Panel analítico
              </NavLink>
            </>
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
