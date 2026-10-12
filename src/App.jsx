import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import { useAuth } from './contexts/AuthContext'
import MainLayout from './layouts/MainLayout'
import ProtectedRoute from './routes/ProtectedRoute'
import RoleRoute from './routes/RoleRoute'
import Home from './pages/Home'
import AuthPage from './pages/AuthPage'

// El inicio y el acceso cargan de entrada; el resto de las páginas se
// descarga recién cuando se visita (el primer ingreso es más liviano).
// El mapa, por ejemplo, trae Leaflet solo si alguien lo abre.
const RestablecerPassword = lazy(() => import('./pages/RestablecerPassword'))
const Privacidad = lazy(() => import('./pages/Privacidad'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const CreatePetition = lazy(() => import('./pages/CreatePetition'))
const PetitionDetail = lazy(() => import('./pages/PetitionDetail'))
const AdminPetitions = lazy(() => import('./pages/AdminPetitions'))
const Mapa = lazy(() => import('./pages/Mapa'))
const Comunidad = lazy(() => import('./pages/Comunidad'))
const Eventos = lazy(() => import('./pages/Eventos'))
const Perfil = lazy(() => import('./pages/Perfil'))
const Usuarios = lazy(() => import('./pages/Usuarios'))
const Estadisticas = lazy(() => import('./pages/Estadisticas'))
const EstadisticasAdmin = lazy(() => import('./pages/EstadisticasAdmin'))
const Bandeja = lazy(() => import('./pages/Bandeja'))
const Documentos = lazy(() => import('./pages/Documentos'))

function App() {
  const { profile } = useAuth()

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="cargando-pagina" role="status">Cargando...</div>}>
      <Routes>
        {/* Acceso: pantalla completa, fuera del dashboard */}
        <Route path="/login" element={<AuthPage />} />
        <Route path="/registro" element={<AuthPage />} />
        <Route path="/recuperar" element={<AuthPage />} />
        <Route path="/restablecer" element={<RestablecerPassword />} />
        <Route path="/privacidad" element={<Privacidad />} />

        {/* Todo el dashboard requiere sesión iniciada */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/mapa" element={<Mapa />} />
            <Route path="/comunidad" element={<Comunidad />} />
            <Route path="/eventos" element={<Eventos />} />

            <Route
              path="/peticiones/:id"
              element={<PetitionDetail />}
            />

            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            <Route
              path="/peticiones/nueva"
              element={<CreatePetition />}
            />

            {/* key: el formulario se reinicia cuando termina de cargar el perfil */}
            <Route
              path="/perfil"
              element={<Perfil key={profile?.id ?? 'sin-perfil'} />}
            />

            <Route
              path="/admin/peticiones"
              element={
                <RoleRoute allowedRoles={['admin', 'moderador']}>
                  <AdminPetitions />
                </RoleRoute>
              }
            />

            <Route path="/estadisticas" element={<Estadisticas />} />

            {/* Solo el dueño del proyecto (la página y el almacenamiento lo verifican) */}
            <Route path="/documentos" element={<Documentos />} />

            <Route
              path="/bandeja"
              element={
                <RoleRoute allowedRoles={['funcionario', 'admin']}>
                  <Bandeja />
                </RoleRoute>
              }
            />

            <Route
              path="/admin/estadisticas"
              element={
                <RoleRoute allowedRoles={['admin']}>
                  <EstadisticasAdmin />
                </RoleRoute>
              }
            />

            <Route
              path="/admin/usuarios"
              element={
                <RoleRoute allowedRoles={['admin']}>
                  <Usuarios />
                </RoleRoute>
              }
            />
          </Route>
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
