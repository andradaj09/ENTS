import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function RoleRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="container py-5">
        <p>Cargando...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!profile || !allowedRoles.includes(profile.rol)) {
    return <Navigate to="/" replace />
  }

  return children
}

export default RoleRoute