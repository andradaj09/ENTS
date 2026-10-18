import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import { useAuth } from './contexts/AuthContext'
import MainLayout from './layouts/MainLayout'
import ProtectedRoute from './routes/ProtectedRoute'
import PanelRoute from './routes/PanelRoute'
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
const Permisos = lazy(() => import('./pages/Permisos'))

function App() {
  const { profile } = useAuth()

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="cargando-pagina" role="status">Cargando...</div>}>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/registro" element={<AuthPage />} />
        <Route path="/recuperar" element={<AuthPage />} />
        <Route path="/restablecer" element={<RestablecerPassword />} />
        <Route path="/privacidad" element={<Privacidad />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/mapa" element={<PanelRoute panel="mapa"><Mapa /></PanelRoute>} />
            <Route path="/comunidad" element={<PanelRoute panel="comunidad"><Comunidad /></PanelRoute>} />
            <Route path="/eventos" element={<PanelRoute panel="eventos"><Eventos /></PanelRoute>} />

            <Route
              path="/peticiones/:id"
              element={<PetitionDetail />}
            />

            <Route
              path="/dashboard"
              element={<PanelRoute panel="dashboard"><Dashboard /></PanelRoute>}
            />

            <Route
              path="/peticiones/nueva"
              element={<PanelRoute panel="dashboard" accion="modificar"><CreatePetition /></PanelRoute>}
            />

            {/* key: el formulario se reinicia cuando termina de cargar el perfil */}
            <Route
              path="/perfil"
              element={<PanelRoute panel="perfil"><Perfil key={profile?.id ?? 'sin-perfil'} /></PanelRoute>}
            />

            <Route
              path="/admin/peticiones"
              element={
                <PanelRoute panel="moderacion">
                  <AdminPetitions />
                </PanelRoute>
              }
            />

            <Route path="/estadisticas" element={<PanelRoute panel="estadisticas"><Estadisticas /></PanelRoute>} />

            <Route path="/documentos" element={<PanelRoute panel="documentos"><Documentos /></PanelRoute>} />

            {/* Solo el dueño del proyecto (la página y la base lo verifican) */}
            <Route path="/permisos" element={<Permisos />} />

            <Route
              path="/bandeja"
              element={
                <PanelRoute panel="bandeja">
                  <Bandeja />
                </PanelRoute>
              }
            />

            <Route
              path="/admin/estadisticas"
              element={
                <PanelRoute panel="panel">
                  <EstadisticasAdmin />
                </PanelRoute>
              }
            />

            <Route
              path="/admin/usuarios"
              element={
                <PanelRoute panel="usuarios">
                  <Usuarios />
                </PanelRoute>
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
