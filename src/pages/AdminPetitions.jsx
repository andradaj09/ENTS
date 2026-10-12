import { useEffect, useState } from 'react'
import {
  cambiarEstadoPeticion,
  getPeticionesPendientes,
  getSolicitudesFuncionario,
  resolverSolicitudFuncionario,
} from '../services/petitionService'
import { tiempoRelativo } from '../utils/format'
import GaleriaFotos from '../components/GaleriaFotos'
import Icon from '../components/Icon'
import { Link } from 'react-router-dom'
import { borrarComentario, getComentariosARevisar, moderarComentario } from '../services/participacionService'
import { describirAlertas } from '../utils/moderacion'

function AdminPetitions() {
  const [peticiones, setPeticiones] = useState([])
  const [solicitudes, setSolicitudes] = useState([])
  const [comentarios, setComentarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [procesando, setProcesando] = useState(null)

  useEffect(() => {
    const cargar = async () => {
      try {
        const [peticionesData, solicitudesData, comentariosData] = await Promise.all([
          getPeticionesPendientes(),
          getSolicitudesFuncionario(),
          getComentariosARevisar(),
        ])

        // Las que la revisión automática marcó van primero
        setPeticiones([...peticionesData].sort((a, b) => (b.alertas?.length ?? 0) - (a.alertas?.length ?? 0)))
        setSolicitudes(solicitudesData)
        setComentarios(comentariosData)
      } catch (err) {
        console.error('Error cargando moderación:', err)
        setError('No se pudo cargar el panel de moderación.')
      } finally {
        setLoading(false)
      }
    }

    cargar()
  }, [])

  const cambiarEstado = async (peticionId, nuevoEstado) => {
    try {
      setProcesando(`peticion-${peticionId}`)
      await cambiarEstadoPeticion(peticionId, nuevoEstado)

      // Sale de la lista porque ya no está pendiente
      setPeticiones((actuales) =>
        actuales.filter((peticion) => peticion.id !== peticionId)
      )
    } catch (err) {
      console.error('Error actualizando petición:', err)
      setError('No se pudo actualizar el estado de la petición.')
    } finally {
      setProcesando(null)
    }
  }

  const resolverSolicitud = async (solicitud, aprobar) => {
    const nombre = `${solicitud.nombre} ${solicitud.apellido}`
    const confirmado = window.confirm(
      aprobar
        ? `¿Aprobar a ${nombre} como funcionario/a?\n\nVa a poder ver quién crea y quién firma cada petición.`
        : `¿Rechazar la solicitud de ${nombre}?\n\nLa cuenta sigue como vecino/a.`
    )

    if (!confirmado) return

    try {
      setProcesando(`solicitud-${solicitud.id}`)
      await resolverSolicitudFuncionario(solicitud.id, aprobar)
      setSolicitudes((actuales) => actuales.filter((s) => s.id !== solicitud.id))
    } catch (err) {
      console.error('Error resolviendo solicitud:', err)
      setError('No se pudo resolver la solicitud.')
    } finally {
      setProcesando(null)
    }
  }

  // Comentarios: volver a mostrar (descarta las denuncias) o borrar
  const resolverComentario = async (comentario, accion) => {
    try {
      setProcesando(`comentario-${comentario.id}`)
      if (accion === 'mostrar') await moderarComentario(comentario.id, false)
      else await borrarComentario(comentario.id)
      setComentarios((actuales) => actuales.filter((c) => c.id !== comentario.id))
    } catch (err) {
      console.error('Error moderando comentario:', err)
      setError('No se pudo moderar el comentario.')
    } finally {
      setProcesando(null)
    }
  }

  if (loading) {
    return (
      <div className="container py-5">
        <p className="text-muted">Cargando moderación...</p>
      </div>
    )
  }

  return (
    <div className="container py-5">

      <div className="mb-5">
        <span className="eyebrow">Panel de administración</span>
        <h1 className="page-title mt-3">Moderación</h1>

        <p className="text-muted mb-0">
          Revisá las peticiones antes de publicarlas y verificá las cuentas
          que piden ser funcionarios.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {/* ---------- Solicitudes de funcionario ---------- */}

      <p className="line-label">
        Solicitudes de funcionario ({solicitudes.length})
      </p>

      {solicitudes.length === 0 && (
        <p className="text-muted small mb-5">No hay solicitudes pendientes.</p>
      )}

      {solicitudes.length > 0 && (
        <div className="row g-3 mb-5">
          {solicitudes.map((solicitud) => (
            <div className="col-md-6" key={solicitud.id}>
              <div className="card h-100">
                <div className="card-body">
                  <p className="card-big mb-1">
                    {solicitud.nombre} {solicitud.apellido}
                  </p>

                  <p className="text-muted small mb-3">
                    Se registró {tiempoRelativo(solicitud.created_at).toLowerCase()}
                  </p>

                  <div className="info-row">
                    <span>Cargo</span>
                    <span>{solicitud.cargo || '—'}</span>
                  </div>

                  <div className="info-row">
                    <span>Organismo</span>
                    <span>{solicitud.organizacion || '—'}</span>
                  </div>

                  <p className="text-muted small mt-3">
                    Antes de aprobar, verificá que la persona realmente ocupe ese cargo.
                  </p>

                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-success"
                      onClick={() => resolverSolicitud(solicitud, true)}
                      disabled={procesando === `solicitud-${solicitud.id}`}
                    >
                      Aprobar
                    </button>

                    <button
                      className="btn btn-danger"
                      onClick={() => resolverSolicitud(solicitud, false)}
                      disabled={procesando === `solicitud-${solicitud.id}`}
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------- Peticiones pendientes ---------- */}

      <p className="line-label">
        Peticiones pendientes ({peticiones.length})
      </p>

      {peticiones.length === 0 && (
        <div className="alert alert-success">
          No hay peticiones pendientes de revisión.
        </div>
      )}

      {peticiones.map((peticion) => (
        <div
          className="card mb-4"
          key={peticion.id}
        >
          <div className="card-body">

            <div className="mb-3">
              <span className="badge text-bg-primary me-2">
                {peticion.categorias?.nombre}
              </span>

              <span className="badge text-bg-secondary">
                {peticion.zonas?.nombre}
              </span>
            </div>

            {peticion.alertas?.length > 0 && (
              <div className="alerta-automatica">
                <Icon name="alert" size={16} />
                Revisión automática: tiene {describirAlertas(peticion.alertas)}.
                Revisala antes de publicar (podés editarla desde su página).
              </div>
            )}

            <h3 className="card-big mb-3">
              <Link to={`/peticiones/${peticion.id}`}>{peticion.titulo}</Link>
            </h3>

            <p className="card-text text-muted">
              {peticion.descripcion}
            </p>

            {peticion.fotos?.length > 0 && (
              <div className="mb-3">
                <GaleriaFotos rutas={peticion.fotos} />
              </div>
            )}

            <p className="text-muted small">
              Creada por:{' '}
              <strong>
                {peticion.profiles?.nombre}{' '}
                {peticion.profiles?.apellido}
              </strong>
            </p>

            <hr />

            <div className="d-flex gap-2">

              <button
                className="btn btn-success"
                onClick={() => cambiarEstado(peticion.id, 'publicada')}
                disabled={procesando === `peticion-${peticion.id}`}
              >
                Aprobar
              </button>

              <button
                className="btn btn-danger"
                onClick={() => cambiarEstado(peticion.id, 'rechazada')}
                disabled={procesando === `peticion-${peticion.id}`}
              >
                Rechazar
              </button>

            </div>

          </div>
        </div>
      ))}

      {/* ---------- Comentarios ocultos o denunciados ---------- */}

      <p className="line-label mt-5">
        Comentarios a revisar ({comentarios.length})
      </p>

      {comentarios.length === 0 && (
        <p className="text-muted small">No hay comentarios ocultos ni denunciados.</p>
      )}

      {comentarios.map((c) => (
        <div className="card mb-3" key={c.id}>
          <div className="card-body">
            <p className="small text-muted mb-1">
              En <Link to={`/peticiones/${c.peticion_id}`}>{c.titulo}</Link> · {c.autor} · {tiempoRelativo(c.fecha)}
            </p>
            <p className="mb-2">{c.texto}</p>
            <p className="small mb-3" style={{ color: '#b0412e' }}>
              {c.denuncias > 0 && `${c.denuncias} denuncia${c.denuncias === 1 ? '' : 's'}`}
              {c.denuncias > 0 && c.alertas?.length > 0 && ' · '}
              {c.alertas?.length > 0 && `Revisión automática: ${describirAlertas(c.alertas)}`}
            </p>
            <div className="d-flex gap-2">
              <button className="btn btn-ghost btn-sm" disabled={procesando === `comentario-${c.id}`}
                onClick={() => resolverComentario(c, 'mostrar')}>
                Está bien, mostrar
              </button>
              <button className="btn btn-outline-danger btn-sm" disabled={procesando === `comentario-${c.id}`}
                onClick={() => resolverComentario(c, 'borrar')}>
                Borrar
              </button>
            </div>
          </div>
        </div>
      ))}

    </div>
  )
}

export default AdminPetitions
