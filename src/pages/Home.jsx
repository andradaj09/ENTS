import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getPeticionesPublicadas,
  getProximosEventos,
} from '../services/petitionService'
import { capitalizar, claseUrgencia, tiempoRelativo, UMBRAL_URGENTE } from '../utils/format'
import Icon from '../components/Icon'
import HeroArt from '../components/HeroArt'
import PalabraRotativa from '../components/PalabraRotativa'
import PetitionCard from '../components/PetitionCard'

const formatoEvento = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function Home() {
  const { user, profile } = useAuth()

  const [peticiones, setPeticiones] = useState([])
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categoria, setCategoria] = useState('todas')

  useEffect(() => {
    const cargar = async () => {
      try {
        setPeticiones(await getPeticionesPublicadas())
      } catch (err) {
        console.error('Error cargando peticiones:', err)
        setError('No se pudieron cargar las peticiones.')
      } finally {
        setLoading(false)
      }

      // Los eventos son opcionales: si la tabla no existe, la tarjeta queda vacía
      try {
        setEventos(await getProximosEventos(2))
      } catch (err) {
        console.error('Error cargando eventos:', err)
      }
    }

    cargar()
  }, [])

  const stats = useMemo(() => ({
    activas: peticiones.length,
    firmas: peticiones.reduce((total, p) => total + (p.firmas_count ?? 0), 0),
    urgentes: peticiones.filter(
      (p) => Number(p.score_urgencia) >= UMBRAL_URGENTE
    ).length,
  }), [peticiones])

  const categorias = useMemo(() => [
    ...new Set(peticiones.map((p) => p.categorias?.nombre).filter(Boolean)),
  ], [peticiones])

  const filtradas = categoria === 'todas'
    ? peticiones
    : peticiones.filter((p) => p.categorias?.nombre === categoria)

  // La petición con más firmas se destaca
  const idDestacada = filtradas.length > 1
    ? filtradas.reduce((max, p) =>
        (p.firmas_count ?? 0) > (max.firmas_count ?? 0) ? p : max
      ).id
    : null

  return (
    <>
      <div className="home-grid">

        <section className="panel hero-panel brillo-borde">
          <div className="hero-texto">
            <span className="eyebrow">
              {profile?.nombre ? `Bienvenido, ${profile.nombre}` : 'Bienvenido'}
            </span>

            <h1 className="hero-title">
              Tu barrio,<br /><PalabraRotativa />
            </h1>

            <p className="hero-sub">
              Pedí, seguí y hacé crecer nuestra comunidad.
            </p>

            <div className="action-list">
              <Link className="action-row" to="/peticiones/nueva">
                <span className="icon-chip dark"><Icon name="plus" /></span>
                Nueva petición
                <Icon name="chevron" />
              </Link>

              <Link className="action-row" to="/mapa">
                <span className="icon-chip"><Icon name="map" /></span>
                Ver en el mapa
                <Icon name="chevron" />
              </Link>

              <Link
                className="action-row"
                to={user ? '/dashboard' : '/login'}
              >
                <span className="icon-chip"><Icon name="list" /></span>
                Mis solicitudes
                <Icon name="chevron" />
              </Link>

              <Link className="action-row" to="/comunidad">
                <span className="icon-chip"><Icon name="users" /></span>
                Comunidad vecinal
                <Icon name="chevron" />
              </Link>
            </div>
          </div>

          <div className="hero-visual">
            <HeroArt />

            <div className="stat-strip">
              <div>
                <strong>{stats.activas} <i className="dot dot-green" /></strong>
                <span>Activas</span>
                <Icon name="hourglass" size={18} />
              </div>

              <div>
                <strong>{stats.firmas} <i className="dot dot-yellow" /></strong>
                <span>Firmas</span>
                <Icon name="pen" size={18} />
              </div>

              <div>
                <strong>{stats.urgentes} <i className="dot dot-red" /></strong>
                <span>Urgentes</span>
                <Icon name="alert" size={18} />
              </div>
            </div>
          </div>
        </section>

        <aside className="home-aside">

          <div className="panel aside-panel">
            <div className="aside-head">
              <Icon name="megaphone" size={24} />
              Últimas novedades
            </div>

            {loading && <p className="text-muted small px-2">Cargando...</p>}

            {!loading && peticiones.length === 0 && (
              <p className="text-muted small px-2 mb-0">
                Todavía no hay novedades en tu barrio.
              </p>
            )}

            {peticiones.slice(0, 4).map((peticion) => (
              <Link
                className="feed-item"
                to={`/peticiones/${peticion.id}`}
                key={peticion.id}
              >
                <i className={`dot ${claseUrgencia(peticion.score_urgencia)}`} />
                <strong>{peticion.titulo}</strong>
                <small>{tiempoRelativo(peticion.created_at)}</small>
                <p>
                  {peticion.categorias?.nombre} · {peticion.zonas?.nombre}
                </p>
              </Link>
            ))}
          </div>

          <div className="panel aside-panel">
            <div className="aside-head">
              <Icon name="calendar" size={24} />
              Próximos eventos
            </div>

            {eventos.length === 0 && (
              <p className="text-muted small px-2">
                No hay eventos programados por ahora.
              </p>
            )}

            {eventos.map((evento) => (
              <Link className="event-item" to="/eventos" key={evento.id}>
                <Icon name="calendar" size={22} />
                <div>
                  <strong>{evento.titulo}</strong>
                  <span>
                    {capitalizar(formatoEvento.format(new Date(evento.fecha)))}
                  </span>
                  <span>{evento.lugar}</span>
                </div>
              </Link>
            ))}

            <Link className="cta-green mt-3" to="/peticiones/nueva">
              <Icon name="flag" size={22} />
              <div>
                <strong>Tu voz cuenta</strong>
                <span>Hacé tu pedido, mejorá tu barrio.</span>
              </div>
              <Icon name="chevron" />
            </Link>
          </div>

        </aside>
      </div>

      <section className="panel section-panel" id="peticiones">
        <div className="section-head">
          <div>
            <span className="eyebrow">Comunidad</span>
            <h2>Peticiones activas</h2>
          </div>

          {categorias.length > 1 && (
            <div className="chip-filter">
              {['todas', ...categorias].map((nombre) => (
                <button
                  key={nombre}
                  className={categoria === nombre ? 'active' : ''}
                  onClick={() => setCategoria(nombre)}
                >
                  {nombre === 'todas' ? 'Todas' : nombre}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading && <p className="text-muted">Cargando peticiones...</p>}

        {!loading && error && (
          <div className="alert alert-danger mb-0">{error}</div>
        )}

        {!loading && !error && peticiones.length === 0 && (
          <div className="empty-state">
            <p className="card-big mb-2">Todavía no hay peticiones</p>
            <p className="text-muted mb-4">
              Sé la primera persona en visibilizar una problemática de tu barrio.
            </p>
            <Link to="/peticiones/nueva" className="btn btn-dark">
              Crear petición
            </Link>
          </div>
        )}

        <div className="row g-4">
          {filtradas.map((peticion) => (
            <div className="col-12 col-md-6 col-xxl-4" key={peticion.id}>
              <PetitionCard
                peticion={peticion}
                destacada={peticion.id === idDestacada}
              />
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

export default Home
