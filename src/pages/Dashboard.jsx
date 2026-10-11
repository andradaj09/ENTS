import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'
import { getMisPeticiones } from '../services/petitionService'
import PetitionCard from '../components/PetitionCard'

function Dashboard() {
  const { user, profile } = useAuth()

  const [peticiones, setPeticiones] = useState([])
  const [loadingPeticiones, setLoadingPeticiones] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      return
    }

    const loadPeticiones = async () => {
      try {
        setLoadingPeticiones(true)
        setError('')

        const data = await getMisPeticiones(user.id)

        setPeticiones(data)
      } catch (err) {
        console.error('Error cargando peticiones:', err)
        setError('No se pudieron cargar tus peticiones.')
      } finally {
        setLoadingPeticiones(false)
      }
    }

    loadPeticiones()
  }, [user])

  return (
    <div className="container py-5">

      <span className="eyebrow">Panel personal</span>
      <h1 className="page-title">Mis solicitudes</h1>

      <div className="row g-4 mt-2 mb-5">
        <div className="col-lg-7">
          <div className="card h-100">
            <div className="card-body">
              <p className="line-label">Perfil</p>

              <div className="info-row">
                <span>Nombre</span>
                <span>{profile?.nombre} {profile?.apellido}</span>
              </div>

              <div className="info-row">
                <span>Correo</span>
                <span>{user?.email}</span>
              </div>

              <div className="info-row">
                <span>Rol</span>
                <span className="text-capitalize">{profile?.rol}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card card-featured h-100">
            <div className="card-body d-flex flex-column">
              <p className="line-label">Tu impacto</p>

              <div className="stat-big">
                {peticiones.length}
                <small> {peticiones.length === 1 ? 'petición' : 'peticiones'}</small>
              </div>

              <p className="text-muted small mt-3">
                Creá nuevas peticiones para visibilizar problemáticas de tu barrio.
              </p>

              <Link
                to="/peticiones/nueva"
                className="btn btn-dark w-100 mt-auto"
              >
                Crear petición
              </Link>
            </div>
          </div>
        </div>
      </div>

      <p className="line-label">Mis peticiones</p>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {loadingPeticiones && (
        <p className="text-muted">Cargando peticiones...</p>
      )}

      {!loadingPeticiones &&
        !error &&
        peticiones.length === 0 && (
          <div className="card">
            <div className="card-body text-center py-5">

              <p className="card-big mb-2">
                Todavía no creaste ninguna petición
              </p>

              <p className="text-muted mb-4">
                Creá tu primera petición para visibilizar
                una problemática de tu barrio.
              </p>

              <Link
                to="/peticiones/nueva"
                className="btn btn-dark"
              >
                Crear mi primera petición
              </Link>

            </div>
          </div>
        )}

      {!loadingPeticiones && (
        <div className="row g-4">
          {peticiones.map((peticion) => (
            <div className="col-12 col-md-6 col-lg-4" key={peticion.id}>
              <PetitionCard peticion={peticion} />
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

export default Dashboard