import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getPeticionesPublicadas,
  getProximosEventos,
  getZonas,
} from '../services/petitionService'
import { barriosCercanos } from '../utils/barrioVecino'
import TuBarrio from '../components/TuBarrio'
import { capitalizar, claseUrgencia, tiempoRelativo, UMBRAL_URGENTE } from '../utils/format'
import { usePermisos } from '../hooks/usePermisos'
import { NIVELES_PRIORIDAD, ordenarPorPrioridad } from '../utils/prioridad'
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
  const { puede } = usePermisos(user?.id)

  const [peticiones, setPeticiones] = useState([])
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categoria, setCategoria] = useState('todas')
  const [zonas, setZonas] = useState([])
  // Qué peticiones ver: las del barrio propio, las cercanas o toda la ciudad
  const [vista, setVista] = useState('ciudad')
  const miZona = profile?.zona_id ?? null

  useEffect(() => {
    getZonas().then(setZonas).catch((err) => console.error('Error cargando barrios:', err))
  }, [])

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

  // Más firmas = más prioridad: arriba y con el azul más fuerte
  const filtradas = ordenarPorPrioridad(
    categoria === 'todas'
      ? peticiones
      : peticiones.filter((p) => p.categorias?.nombre === categoria)
  )

  // Primero lo del barrio propio, después lo cercano y al final el resto
  const cercanos = useMemo(() => barriosCercanos(miZona, zonas), [miZona, zonas])
  const nombreBarrio = zonas.find((z) => z.id === miZona)?.nombre ?? 'tu barrio'
  const grupos = !miZona
    ? [{ clave: 'todas', titulo: null, lista: filtradas }]
    : [
        { clave: 'barrio', titulo: `En ${nombreBarrio}`, lista: filtradas.filter((p) => p.zonas?.id === miZona) },
        vista !== 'barrio' && { clave: 'cerca', titulo: 'Cerca tuyo', lista: filtradas.filter((p) => cercanos.has(p.zonas?.id)) },
        vista === 'ciudad' && {
          clave: 'resto',
          titulo: 'En el resto de la ciudad',
          lista: filtradas.filter((p) => p.zonas?.id !== miZona && !cercanos.has(p.zonas?.id)),
        },
      ].filter(Boolean)

  const irANovedades = () => {
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('novedades')?.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' })
  }

  // La primera (la de más apoyo) se destaca si ya tiene firmas
  const idDestacada = filtradas[0]?.firmas_count > 0 ? filtradas[0].id : null

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

            <div className="action-list action-grid">
              {/* Cada acceso aparece si el rango tiene permiso para ese panel */}
              {puede('dashboard', 'modificar') && (
                <Link className="action-row" to="/peticiones/nueva">
                  <span className="icon-chip dark"><Icon name="plus" /></span>
                  Nueva petición
                  <Icon name="chevron" />
                </Link>
              )}

              {puede('mapa') && (
                <Link className="action-row" to="/mapa">
                  <span className="icon-chip"><Icon name="map" /></span>
                  Ver en el mapa
                  <Icon name="chevron" />
                </Link>
              )}

              {puede('dashboard') && (
                <Link className="action-row" to="/dashboard">
                  <span className="icon-chip"><Icon name="list" /></span>
                  Mis solicitudes
                  <Icon name="chevron" />
                </Link>
              )}

              {puede('comunidad') && (
                <Link className="action-row" to="/comunidad">
                  <span className="icon-chip"><Icon name="users" /></span>
                  Comunidad vecinal
                  <Icon name="chevron" />
                </Link>
              )}
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

          {/* Invita a seguir bajando: lleva a las novedades y eventos del barrio */}
          <button type="button" className="hero-bajar" onClick={irANovedades}>
            Mirá lo que pasa en tu barrio
            <Icon name="chevron" size={18} />
          </button>
        </section>

        <aside className="home-aside" id="novedades">

          <TuBarrio />

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

            <div className="eventos-acciones">
              <Link className="btn btn-ghost btn-sm" to="/eventos">
                Ver agenda
              </Link>

              {puede('eventos', 'modificar') && (
                <Link className="btn btn-dark btn-sm" to="/eventos#nuevo-evento">
                  <Icon name="plus" size={14} className="me-1" />
                  Crear evento
                </Link>
              )}
            </div>
          </div>

          {/* Separado de los eventos: este acceso crea una petición, no un evento */}
          {puede('dashboard', 'modificar') && (
            <Link className="panel cta-green" to="/peticiones/nueva">
              <Icon name="flag" size={22} />
              <div>
                <strong>Tu voz cuenta</strong>
                <span>Hacé tu pedido, mejorá tu barrio.</span>
              </div>
              <Icon name="chevron" />
            </Link>
          )}

        </aside>
      </div>

      <section className="panel section-panel" id="peticiones">
        <div className="section-head">
          <div>
            <span className="eyebrow">Comunidad</span>
            <h2>Peticiones activas</h2>
            <p className="text-muted small mb-0 mt-1">
              Ordenadas por apoyo: las que tienen más firmas aparecen primero.
            </p>
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

        {!loading && peticiones.length > 0 && (
          <ul className="prioridad-leyenda" aria-label="Niveles de prioridad">
            {NIVELES_PRIORIDAD.map((nivel) => (
              <li key={nivel.clave}>
                <i style={{ background: nivel.color }} />
                {nivel.corto} · {nivel.desde === 0 ? 'menos de 5' : nivel.desde + '+'} firmas
              </li>
            ))}
          </ul>
        )}

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
            {puede('dashboard', 'modificar') && (
              <Link to="/peticiones/nueva" className="btn btn-dark">
                Crear petición
              </Link>
            )}
          </div>
        )}

        {miZona && (
          <div className="chip-filter vista-barrio" role="group" aria-label="Qué peticiones ver">
            {[['barrio', 'Mi barrio'], ['cerca', 'Cerca'], ['ciudad', 'Toda la ciudad']].map(([clave, nombre]) => (
              <button key={clave} className={vista === clave ? 'active' : ''} onClick={() => setVista(clave)}>
                {nombre}
              </button>
            ))}
          </div>
        )}

        {grupos.map((grupo) => (
          <div className="grupo-peticiones" key={grupo.clave}>
            {grupo.titulo && (
              <h3 className="grupo-titulo">
                {grupo.titulo} <span>{grupo.lista.length}</span>
              </h3>
            )}

            {grupo.titulo && !loading && grupo.lista.length === 0 && (
              <p className="text-muted small">
                {grupo.clave === 'barrio'
                  ? 'Todavía no hay peticiones en tu barrio. ¡Podés crear la primera!'
                  : 'No hay peticiones en esta zona.'}
              </p>
            )}

            <div className="row g-4">
              {grupo.lista.map((peticion) => (
                <div className="col-12 col-md-6 col-xxl-4" key={peticion.id}>
                  <PetitionCard
                    peticion={peticion}
                    destacada={peticion.id === idDestacada}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  )
}

export default Home
