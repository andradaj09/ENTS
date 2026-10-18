import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePermisos } from '../hooks/usePermisos'
import {
  createEvento,
  deleteEvento,
  getProximosEventos,
  getZonas,
} from '../services/petitionService'
import Icon from '../components/Icon'
import { capitalizar } from '../utils/format'
import OpcionesBarrios from '../components/OpcionesBarrios'

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
  const miZona = profile?.zona_id ?? null
  const [soloMiBarrio, setSoloMiBarrio] = useState(false)
  // Crear y borrar eventos: según el permiso que definió el dueño
  const { puede } = usePermisos(user?.id)
  const esAdmin = puede('eventos', 'modificar')

  const [eventos, setEventos] = useState([])
  const [zonas, setZonas] = useState([])
  const [form, setForm] = useState(formVacio)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const [publicado, setPublicado] = useState('')

  const location = useLocation()
  const formularioRef = useRef(null)

  // "Crear evento" del inicio lleva a /eventos#nuevo-evento: se va directo al formulario
  useEffect(() => {
    if (esAdmin && location.hash === '#nuevo-evento') {
      formularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      formularioRef.current?.querySelector('input')?.focus({ preventScroll: true })
    }
  }, [esAdmin, location.hash])

  // Solo fechas futuras: la agenda muestra eventos desde ahora en adelante.
  // Formato local "AAAA-MM-DDTHH:MM" que pide el campo datetime-local.
  const [minimoFecha] = useState(() => {
    const ahora = new Date()
    return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
  })

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
    setPublicado('')
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
      setPublicado(`"${form.titulo.trim()}" ya aparece en la agenda.`)
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

          {miZona && eventos.length > 0 && (
            <div className="chip-filter mb-3" role="group" aria-label="Qué eventos ver">
              <button className={!soloMiBarrio ? 'active' : ''} onClick={() => setSoloMiBarrio(false)}>Todos</button>
              <button className={soloMiBarrio ? 'active' : ''} onClick={() => setSoloMiBarrio(true)}>
                Mi barrio ({eventos.filter((e) => e.zonas?.id === miZona).length})
              </button>
            </div>
          )}

          {soloMiBarrio && !eventos.some((e) => e.zonas?.id === miZona) && (
            <p className="text-muted small">Por ahora no hay eventos en tu barrio.</p>
          )}

          {/* Los del barrio propio van primero (el resto, por fecha) */}
          {[...eventos]
            .filter((e) => !soloMiBarrio || e.zonas?.id === miZona)
            .sort((a, b) => (b.zonas?.id === miZona) - (a.zonas?.id === miZona))
            .map((evento) => (
            <div className="event-item" key={evento.id}>
              <span className="icon-chip">
                <Icon name="calendar" />
              </span>

              <div className="flex-grow-1">
                <strong>
                  {evento.titulo}
                  {miZona && evento.zonas?.id === miZona && <span className="etiqueta-mi-barrio">Tu barrio</span>}
                </strong>
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

        {/* En celular el formulario va primero; en pantallas grandes, a la derecha */}
        {esAdmin && (
          <div
            className="col-lg-5 order-first order-lg-last"
            id="nuevo-evento"
            ref={formularioRef}
          >
            <div className="card">
              <div className="card-body">
                <p className="line-label">Nuevo evento</p>

                {errorForm && (
                  <div className="alert alert-danger">{errorForm}</div>
                )}

                {publicado && (
                  <div className="alert alert-success">{publicado}</div>
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
                      min={minimoFecha}
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
                      <OpcionesBarrios zonas={zonas} />
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
