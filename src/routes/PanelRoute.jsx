import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePermisos } from '../hooks/usePermisos'

// Entra al panel solo si el rol tiene el permiso (ver o modificar) que
// definió el dueño en "Permisos". Si no, vuelve al inicio.
function PanelRoute({ children, panel, accion = 'ver' }) {
  const { user } = useAuth()
  const { puede, listo } = usePermisos(user?.id)

  if (!listo) {
    return <div className="cargando-pagina" role="status">Cargando...</div>
  }

  if (!puede(panel, accion)) {
    return <Navigate to="/" replace />
  }

  return children
}

export default PanelRoute
