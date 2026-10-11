import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <p className="text-muted">Cargando...</p>
      </div>
    )
  }

  if (!user) {
    // Se guarda la ruta pedida para volver a ella después de iniciar sesión
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export default ProtectedRoute
