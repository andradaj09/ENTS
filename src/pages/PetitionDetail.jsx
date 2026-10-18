import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '../contexts/AuthContext'

import {
  deletePeticion,
  getIdentidadesPeticion,
  getPeticionById,
  usuarioFirmo,
  firmarPeticion,
  retirarFirma,
} from '../services/petitionService'
import { puedeResponder, puedeVerIdentidades } from '../utils/roles'
import { usePermisos } from '../hooks/usePermisos'
import { META_FIRMAS, nombreEtapa, prioridadPorFirmas, proximoNivel } from '../utils/prioridad'
import { tiempoRelativo } from '../utils/format'
import GaleriaFotos from '../components/GaleriaFotos'
import EditarPeticion from '../components/EditarPeticion'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import Seguimiento from '../components/Seguimiento'
import Comentarios from '../components/Comentarios'

function PetitionDetail() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const { puede } = usePermisos(user?.id)
  // Editar, borrar y moderar comentarios: permiso de modificar en Moderación
  const esModerador = puede('moderacion', 'modificar')

  const [peticion, setPeticion] = useState(null)
  // Funcionarios: solo las peticiones de su área; admins: todas
  const veIdentidades = Boolean(peticion) && puedeVerIdentidades(profile, peticion)
  const [yaFirmo, setYaFirmo] = useState(false)
  const [cantidadFirmas, setCantidadFirmas] = useState(0)
  // Autor y firmantes: solo se cargan para funcionarios y admins
  const [identidades, setIdentidades] = useState(null)

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

  // Cambia al firmar o retirar la firma, para recargar la lista de firmantes
  const [versionFirmas, setVersionFirmas] = useState(0)

  useEffect(() => {
    const loadPeticion = async () => {
      try {
        setLoading(true)
        setError('')

        const peticionData = await getPeticionById(id)

        setPeticion(peticionData)
        setCantidadFirmas(peticionData.firmas_count ?? 0)

        if (user) {
          setYaFirmo(await usuarioFirmo(id, user.id))
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

  useEffect(() => {
    if (!veIdentidades) return

    let activo = true

    getIdentidadesPeticion(id)
      .then((datos) => {
        if (activo) setIdentidades(datos)
      })
      .catch((err) => console.error('Error cargando identidades:', err))

    return () => {
      activo = false
    }
  }, [veIdentidades, id, versionFirmas])

  const handleFirmar = async () => {
    if (!user) {
      return
    }

    try {
      setProcesandoFirma(true)
      setErrorFirma('')

      await firmarPeticion(peticion.id, user.id)

      setYaFirmo(true)
      setCantidadFirmas((total) => total + 1)
      setVersionFirmas((version) => version + 1)
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

      await retirarFirma(peticion.id, user.id)

      setYaFirmo(false)
      setCantidadFirmas((total) => Math.max(total - 1, 0))
      setVersionFirmas((version) => version + 1)
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

  const prioridad = prioridadPorFirmas(cantidadFirmas)
  const siguiente = proximoNivel(cantidadFirmas)
  const avanceMeta = Math.min(100, (cantidadFirmas / META_FIRMAS) * 100)

  const estadoFormateado = peticion.estado
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letra) => letra.toUpperCase())

  return (
    <div className="container py-5">

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <Link to="/" className="back-link">
          ← Volver
        </Link>

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

        {peticion.estado === 'publicada' ? (
          <>
            <span className={`badge seguimiento-badge etapa-${peticion.seguimiento}`}>
              {nombreEtapa(peticion.seguimiento)}
            </span>
            <span
              className="prioridad-badge"
              style={{ '--prioridad': prioridad.color, '--prioridad-texto': prioridad.texto }}
            >
              {prioridad.nombre}
            </span>
          </>
        ) : (
          <span className="badge text-bg-light">
            {estadoFormateado}
          </span>
        )}
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

          {peticion.estado === 'publicada' && (
            <Seguimiento
              peticion={peticion}
              usuarioId={user?.id}
              puedeResponder={
                // Permiso de la bandeja + el funcionario sigue limitado a su área
                puede('bandeja', 'modificar') && (profile?.rol !== 'funcionario' || puedeResponder(profile, peticion))
              }
              onCambio={(seguimiento) => setPeticion((actual) => ({ ...actual, seguimiento }))}
            />
          )}

          <div className="row g-4 mb-4">

            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-body">
                  <p className="line-label">Información</p>

                  <div className="info-row">
                    <span>Creada por</span>
                    {veIdentidades ? (
                      <span className="text-end">
                        {identidades?.autor
                          ? `${identidades.autor.nombre} ${identidades.autor.apellido}`
                          : '...'}
                        {/* El correo solo lo devuelve la base a los admins */}
                        {identidades?.autor?.email && (
                          <small className="d-block text-muted">{identidades.autor.email}</small>
                        )}
                      </span>
                    ) : (
                      <span className="identidad-anonima">
                        <Icon name="lock" size={14} />
                        Vecino/a anónimo/a
                      </span>
                    )}
                  </div>

                  <div className="info-row">
                    <span>Fecha</span>
                    <span>{fecha}</span>
                  </div>

                  <p className="text-muted small mt-3 mb-0">
                    {veIdentidades
                      ? 'Ves la identidad del autor y de quienes firman porque tu cuenta es de funcionario o administrador.'
                      : 'Para proteger a los vecinos, quién crea y quién firma una petición solo lo ven los administradores y los funcionarios que la responden.'}
                  </p>
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
                    Se calcula solo: gravedad de la categoría, palabras de
                    riesgo en el texto, firmas, firmas de la última semana
                    y si tiene fotos. Se actualiza con cada firma.
                  </p>
                </div>
              </div>
            </div>

          </div>

          <Comentarios peticion={peticion} usuarioId={user?.id} esModerador={esModerador} />
        </div>


        <div className="col-lg-4">
          <div
            className={`card card-prioridad prioridad-${prioridad.clave}`}
            style={{ '--prioridad': prioridad.color, '--prioridad-texto': prioridad.texto }}
          >
            <div className="card-body">

              <p className="card-kicker">Apoyos</p>

              <div className="stat-big">
                {cantidadFirmas}
                <small> {cantidadFirmas === 1 ? 'firma' : 'firmas'}</small>
              </div>

              <div className="meta-firmas" role="progressbar" aria-valuemin={0}
                aria-valuemax={META_FIRMAS} aria-valuenow={Math.min(cantidadFirmas, META_FIRMAS)}
                aria-label="Firmas hacia la meta">
                <span style={{ width: `${avanceMeta}%` }} />
              </div>
              <p className="meta-firmas-texto">
                {peticion.elevada_at || cantidadFirmas >= META_FIRMAS
                  ? 'Meta alcanzada: la petición se elevó al área del municipio.'
                  : `Meta: ${META_FIRMAS} firmas para elevarla al municipio.`}
                {siguiente && (
                  <span className="d-block">
                    Faltan {siguiente.faltan} para {siguiente.nivel.nombre.toLowerCase()}.
                  </span>
                )}
              </p>

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

              {peticion.estado !== 'publicada' && (
                <div className="alert alert-info mb-0">
                  {peticion.estado === 'pendiente'
                    ? 'Esta petición está en revisión: se podrá firmar cuando se publique.'
                    : 'Esta petición fue rechazada y no admite firmas.'}
                </div>
              )}

              {user && peticion.estado === 'publicada' && !yaFirmo && (
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

              {user && yaFirmo && (
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

          {/* Solo funcionarios y admins: quiénes firmaron */}
          {veIdentidades && (
            <div className="card mt-4">
              <div className="card-body">
                <p className="line-label">Firmantes</p>

                {!identidades && <p className="text-muted small mb-0">Cargando...</p>}

                {identidades?.firmantes.length === 0 && (
                  <p className="text-muted small mb-0">Todavía nadie firmó esta petición.</p>
                )}

                <div className="firmantes-lista">
                  {identidades?.firmantes.map((firmante, indice) => (
                    <div className="firmante" key={`${firmante.fecha}-${indice}`}>
                      <Avatar perfil={firmante} size={34} />
                      <div>
                        <strong>{firmante.nombre} {firmante.apellido}</strong>
                        <span>
                          {firmante.email && `${firmante.email} · `}
                          {tiempoRelativo(firmante.fecha)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default PetitionDetail