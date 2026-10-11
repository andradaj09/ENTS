import { BrowserRouter, Routes, Route } from 'react-router-dom'

import { useAuth } from './contexts/AuthContext'
import MainLayout from './layouts/MainLayout'
import ProtectedRoute from './routes/ProtectedRoute'
import RoleRoute from './routes/RoleRoute'
import Home from './pages/Home'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import CreatePetition from './pages/CreatePetition'
import PetitionDetail from './pages/PetitionDetail'
import AdminPetitions from './pages/AdminPetitions'
import Mapa from './pages/Mapa'
import Comunidad from './pages/Comunidad'
import Eventos from './pages/Eventos'
import Perfil from './pages/Perfil'

function App() {
  const { profile } = useAuth()

  return (
    <BrowserRouter>
      <Routes>
        {/* Acceso: pantalla completa, fuera del dashboard */}
        <Route path="/login" element={<AuthPage />} />
        <Route path="/registro" element={<AuthPage />} />

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
                <RoleRoute allowedRoles={['admin']}>
                  <AdminPetitions />
                </RoleRoute>
              }
            />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
