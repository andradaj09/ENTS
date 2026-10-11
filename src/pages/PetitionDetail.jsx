import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'

import {
  deletePeticion,
  getPeticionById,
  getFirmasPeticion,
  firmarPeticion,
  retirarFirma,
} from '../services/petitionService'
import GaleriaFotos from '../components/GaleriaFotos'
import EditarPeticion from '../components/EditarPeticion'
import Icon from '../components/Icon'

function PetitionDetail() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const esModerador = profile?.rol === 'admin'

  const [peticion, setPeticion] = useState(null)
  const [firmas, setFirmas] = useState([])

  const [loading, setLoading] = useState(true)
  const [procesandoFirma, setProcesandoFirma] = useState(false)

  const [error, setError] = useState('')
  const [errorFirma, setErrorFirma] = useState('')

  const [editando, setEditando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [errorModeracion, setErrorModeracion] = useState('')

  const cerrarEdicion = useCallback(() => setEditando(false), [])

  const handleGuardado = (actualizada) => {
    setPeticion(actualizada)
    setEditando(false)
  }

  const handleEliminar = async () => {
    const confirmado = window.confirm(
      `¿Eliminar "${peticion.titulo}"?\n\nSe borran también sus firmas y fotos. No se puede deshacer.`
    )

    if (!confirmado) return

    setEliminando(true)
    setErrorModeracion('')

    try {
      await deletePeticion(peticion)
      navigate('/', { replace: true })
    } catch (err) {
      console.error('Error eliminando petición:', err)
      setErrorModeracion('No se pudo eliminar la petición.')
      setEliminando(false)
    }
  }

  useEffect(() => {
    const loadPeticion = async () => {
      try {
        setLoading(true)
        setError('')

        const peticionData = await getPeticionById(id)

        setPeticion(peticionData)

        if (user) {
          const firmasData = await getFirmasPeticion(id)
          setFirmas(firmasData)
        }
      } catch (err) {
        console.error('Error cargando petición:', err)
        setError('No se pudo cargar la petición.')
      } finally {
        setLoading(false)
      }
    }

    loadPeticion()
  }, [id, user])

  const usuarioYaFirmo = user
    ? firmas.some((firma) => firma.usuario_id === user.id)
    : false

  const handleFirmar = async () => {
    if (!user) {
      return
    }

    try {
      setProcesandoFirma(true)
      setErrorFirma('')

      const nuevaFirma = await firmarPeticion(
        peticion.id,
        user.id
      )

      setFirmas((firmasActuales) => [
        ...firmasActuales,
        nuevaFirma,
      ])
    } catch (err) {
      console.error('Error firmando petición:', err)
      setErrorFirma('No se pudo registrar tu firma.')
    } finally {
      setProcesandoFirma(false)
    }
  }

  const handleRetirarFirma = async () => {
    if (!user) {
      return
    }

    try {
      setProcesandoFirma(true)
      setErrorFirma('')

      await retirarFirma(
        peticion.id,
        user.id
      )

      setFirmas((firmasActuales) =>
        firmasActuales.filter(
          (firma) => firma.usuario_id !== user.id
        )
      )
    } catch (err) {
      console.error('Error retirando firma:', err)
      setErrorFirma('No se pudo retirar tu firma.')
    } finally {
      setProcesandoFirma(false)
    }
  }

  if (loading) {
    return (
      <div className="container py-5">
        <p>Cargando petición...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">
          {error}
        </div>

        <Link
          to="/"
          className="btn btn-outline-secondary"
        >
          Volver al inicio
        </Link>
      </div>
    )
  }

  if (!peticion) {
    return (
      <div className="container py-5">
        <h2>Petición no encontrada</h2>
      </div>
    )
  }

  const fecha = new Date(
    peticion.created_at
  ).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const estadoFormateado = peticion.estado
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letra) => letra.toUpperCase())

  return (
    <div className="container py-5">

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <Link to="/" className="back-link">
          ← Volver
        </Link>

        {/* Solo visible para moderadores */}
        {esModerador && (
          <div className="moderador-barra">
            <span>
              <Icon name="shield" size={16} />
              Moderador
            </span>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setEditando(true)}
              disabled={eliminando}
            >
              <Icon name="pen" size={15} className="me-2" />
              Editar
            </button>

            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={handleEliminar}
              disabled={eliminando}
            >
              <Icon name="trash" size={15} className="me-2" />
              {eliminando ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        )}
      </div>

      {errorModeracion && (
        <div className="alert alert-danger mt-3 mb-0">{errorModeracion}</div>
      )}

      {editando && (
        <EditarPeticion
          peticion={peticion}
          onGuardado={handleGuardado}
          onCerrar={cerrarEdicion}
        />
      )}

      <div className="mt-4 mb-3 d-flex flex-wrap gap-2">
        <span className="badge text-bg-primary">
          {peticion.categorias?.nombre}
        </span>

        <span className="badge text-bg-secondary">
          {peticion.zonas?.nombre}
        </span>

        <span className="badge text-bg-light">
          {estadoFormateado}
        </span>
      </div>

      <h1 className="page-title mb-4">
        {peticion.titulo}
      </h1>

      <div className="row g-4">

        <div className="col-lg-8">

          <div className="card mb-4">
            <div className="card-body">
              <p className="line-label">Descripción</p>

              <p
                className="mb-0"
                style={{ whiteSpace: 'pre-line' }}
              >
                {peticion.descripcion}
              </p>

              {peticion.fotos?.length > 0 && (
                <div className="mt-4">
                  <GaleriaFotos rutas={peticion.fotos} />
                </div>
              )}
            </div>
          </div>

          <div className="row g-4">

            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-body">
                  <p className="line-label">Información</p>

                  <div className="info-row">
                    <span>Creada por</span>
                    <span>
                      {peticion.profiles?.nombre}{' '}
                      {peticion.profiles?.apellido}
                    </span>
                  </div>

                  <div className="info-row">
                    <span>Fecha</span>
                    <span>{fecha}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-body">
                  <p className="line-label">Score de urgencia</p>

                  <div className="stat-big">
                    {Number(peticion.score_urgencia)}
                    <small> / 100</small>
                  </div>

                  <p className="text-muted small mt-3 mb-0">
                    El score será calculado automáticamente
                    según la actividad de la petición.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* FIRMAS */}

        <div className="col-lg-4">
          <div className="card card-featured">
            <div className="card-body">

              <p className="card-kicker">Apoyos</p>

              <div className="stat-big">
                {firmas.length}
                <small> {firmas.length === 1 ? 'firma' : 'firmas'}</small>
              </div>

              <ul className="check-list">
                <li>Visibiliza la problemática</li>
                <li>Suma urgencia a la petición</li>
                <li>Podés retirar tu firma cuando quieras</li>
              </ul>

              {errorFirma && (
                <div className="alert alert-danger">
                  {errorFirma}
                </div>
              )}

              {!user && (
                <>
                  <p className="text-muted small">
                    Iniciá sesión para apoyar esta petición.
                  </p>

                  <Link
                    to="/login"
                    className="btn btn-dark w-100"
                  >
                    Iniciar sesión
                  </Link>
                </>
              )}

              {/* Solo se pueden firmar las peticiones publicadas */}
              {peticion.estado !== 'publicada' && (
                <div className="alert alert-info mb-0">
                  {peticion.estado === 'pendiente'
                    ? 'Esta petición está en revisión: se podrá firmar cuando se publique.'
                    : 'Esta petición fue rechazada y no admite firmas.'}
                </div>
              )}

              {user && peticion.estado === 'publicada' && !usuarioYaFirmo && (
                <button
                  className="btn btn-dark w-100"
                  onClick={handleFirmar}
                  disabled={procesandoFirma}
                >
                  {procesandoFirma
                    ? 'Registrando firma...'
                    : 'Firmar petición'}
                </button>
              )}

              {user && usuarioYaFirmo && (
                <>
                  <div className="alert alert-success">
                    ✓ Ya firmaste esta petición.
                  </div>

                  <button
                    className="btn btn-outline-danger w-100"
                    onClick={handleRetirarFirma}
                    disabled={procesandoFirma}
                  >
                    {procesandoFirma
                      ? 'Retirando firma...'
                      : 'Retirar firma'}
                  </button>
                </>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default PetitionDetail