import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  createEvento,
  deleteEvento,
  getProximosEventos,
  getZonas,
} from '../services/petitionService'
import Icon from '../components/Icon'
import { capitalizar } from '../utils/format'

const formatoFecha = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

const formVacio = {
  titulo: '',
  descripcion: '',
  fecha: '',
  lugar: '',
  zonaId: '',
}

function Eventos() {
  const { user, profile } = useAuth()
  const esAdmin = profile?.rol === 'admin'

  const [eventos, setEventos] = useState([])
  const [zonas, setZonas] = useState([])
  const [form, setForm] = useState(formVacio)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [errorForm, setErrorForm] = useState('')

  useEffect(() => {
    const cargar = async () => {
      try {
        const [eventosData, zonasData] = await Promise.all([
          getProximosEventos(),
          getZonas(),
        ])

        setEventos(eventosData)
        setZonas(zonasData)
      } catch (err) {
        console.error('Error cargando eventos:', err)
        setError('No se pudieron cargar los eventos.')
      } finally {
        setLoading(false)
      }
    }

    cargar()
  }, [])

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    setErrorForm('')
    setGuardando(true)

    try {
      await createEvento({
        usuarioId: user.id,
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        fecha: new Date(form.fecha).toISOString(),
        lugar: form.lugar.trim(),
        zonaId: form.zonaId ? Number(form.zonaId) : null,
      })

      setEventos(await getProximosEventos())
      setForm(formVacio)
    } catch (err) {
      console.error('Error creando evento:', err)
      setErrorForm('No se pudo crear el evento.')
    } finally {
      setGuardando(false)
    }
  }

  const handleDelete = async (eventoId) => {
    if (!window.confirm('¿Eliminar este evento?')) {
      return
    }

    try {
      await deleteEvento(eventoId)
      setEventos((actuales) => actuales.filter((e) => e.id !== eventoId))
    } catch (err) {
      console.error('Error eliminando evento:', err)
      setError('No se pudo eliminar el evento.')
    }
  }

  return (
    <div className="container py-5">
      <span className="eyebrow">Agenda vecinal</span>
      <h1 className="page-title mb-3">Próximos eventos</h1>
      <p className="text-muted mb-4">
        Reuniones vecinales, jornadas y actividades de la comunidad.
      </p>

      <div className="row g-4">
        <div className={esAdmin ? 'col-lg-7' : 'col-12'}>

          {loading && <p className="text-muted">Cargando eventos...</p>}

          {error && <div className="alert alert-danger">{error}</div>}

          {!loading && !error && eventos.length === 0 && (
            <div className="empty-state">
              <p className="card-big mb-2">No hay eventos programados</p>
              <p className="text-muted mb-0">
                Cuando se organice una actividad en tu barrio, va a aparecer acá.
              </p>
            </div>
          )}

          {eventos.map((evento) => (
            <div className="event-item" key={evento.id}>
              <span className="icon-chip">
                <Icon name="calendar" />
              </span>

              <div className="flex-grow-1">
                <strong>{evento.titulo}</strong>
                <span>
                  {capitalizar(formatoFecha.format(new Date(evento.fecha)))}
                </span>
                <span>
                  {evento.lugar}
                  {evento.zonas?.nombre && ` · ${evento.zonas.nombre}`}
                </span>
                {evento.descripcion && (
                  <p className="small mt-2 mb-0">{evento.descripcion}</p>
                )}
              </div>

              {esAdmin && (
                <button
                  className="icon-btn"
                  onClick={() => handleDelete(evento.id)}
                  aria-label="Eliminar evento"
                >
                  <Icon name="trash" size={18} />
                </button>
              )}
            </div>
          ))}
        </div>

        {esAdmin && (
          <div className="col-lg-5">
            <div className="card">
              <div className="card-body">
                <p className="line-label">Nuevo evento</p>

                {errorForm && (
                  <div className="alert alert-danger">{errorForm}</div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Título</label>
                    <input
                      className="form-control"
                      name="titulo"
                      value={form.titulo}
                      onChange={handleChange}
                      maxLength="200"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Fecha y hora</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      name="fecha"
                      value={form.fecha}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Lugar</label>
                    <input
                      className="form-control"
                      name="lugar"
                      value={form.lugar}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Barrio (opcional)</label>
                    <select
                      className="form-select"
                      name="zonaId"
                      value={form.zonaId}
                      onChange={handleChange}
                    >
                      <option value="">Todos los barrios</option>
                      {zonas.map((zona) => (
                        <option key={zona.id} value={zona.id}>
                          {zona.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="form-label">Descripción</label>
                    <textarea
                      className="form-control"
                      name="descripcion"
                      rows="3"
                      value={form.descripcion}
                      onChange={handleChange}
                    />
                  </div>

                  <button
                    className="btn btn-dark w-100"
                    disabled={guardando}
                  >
                    {guardando ? 'Guardando...' : 'Publicar evento'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Eventos
