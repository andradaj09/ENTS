import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  createPublicacion,
  deletePublicacion,
  getPeticionesPublicadas,
  getPublicaciones,
  getZonas,
} from '../services/petitionService'
import { claseUrgencia, tiempoRelativo } from '../utils/format'
import { esAdmin } from '../utils/roles'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import OpcionesBarrios from '../components/OpcionesBarrios'
import '../styles/comunidad.css'

const LARGO_MAXIMO = 500

const TIPOS = {
  positivo: { etiqueta: 'Algo bueno', icono: 'up' },
  negativo: { etiqueta: 'Un problema', icono: 'alert' },
}

const normalizar = (texto) =>
  (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function coincide(busqueda, ...campos) {
  if (!busqueda) return true
  return campos.some((campo) => normalizar(campo).includes(busqueda))
}

function Comunidad() {
  const { user, profile } = useAuth()

  const [peticiones, setPeticiones] = useState([])
  const [publicaciones, setPublicaciones] = useState([])
  const [zonas, setZonas] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorFeed, setErrorFeed] = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todo')
  // '' = todos los barrios; si no, el id del barrio elegido
  const [barrioFiltro, setBarrioFiltro] = useState('')

  const [nueva, setNueva] = useState({ tipo: 'positivo', contenido: '', zonaId: '' })
  const [publicando, setPublicando] = useState(false)
  const [errorPublicar, setErrorPublicar] = useState('')

  // La búsqueda filtra con el valor diferido: escribir nunca se traba
  const busquedaDiferida = normalizar(useDeferredValue(busqueda).trim())

  // Los autores del feed son anónimos; solo los admins los ven
  const verAutores = esAdmin(profile)

  useEffect(() => {
    const cargar = async () => {
      const [peticionesRes, publicacionesRes, zonasRes] = await Promise.allSettled([
        getPeticionesPublicadas(),
        getPublicaciones({ conAutores: verAutores }),
        getZonas(),
      ])

      if (peticionesRes.status === 'fulfilled') setPeticiones(peticionesRes.value)
      if (zonasRes.status === 'fulfilled') setZonas(zonasRes.value)

      if (publicacionesRes.status === 'fulfilled') {
        setPublicaciones(publicacionesRes.value)
      } else {
        console.error('Error cargando publicaciones:', publicacionesRes.reason)
        setErrorFeed('No se pudo cargar el feed de la comunidad.')
      }

      setLoading(false)
    }

    cargar()
  }, [verAutores])

  const barrioElegido = zonas.find((z) => z.id === barrioFiltro) ?? null
  const esDelBarrio = (item) => !barrioFiltro || item.zonas?.id === barrioFiltro

  const publicacionesFiltradas = useMemo(() => publicaciones.filter((p) =>
    (!barrioFiltro || p.zonas?.id === barrioFiltro) &&
    (filtroTipo === 'todo' || p.tipo === filtroTipo) &&
    coincide(
      busquedaDiferida,
      p.contenido,
      p.zonas?.nombre,
      p.autor && `${p.autor.nombre} ${p.autor.apellido} ${p.autor.email}`
    )
  ), [publicaciones, filtroTipo, busquedaDiferida, barrioFiltro])

  const peticionesDelBarrio = useMemo(
    () => peticiones.filter((p) => !barrioFiltro || p.zonas?.id === barrioFiltro),
    [peticiones, barrioFiltro]
  )

  // Sin búsqueda: las destacadas (más firmas y, a igualdad, más urgentes)
  const peticionesEncontradas = useMemo(() => {
    if (!busquedaDiferida) {
      return [...peticionesDelBarrio]
        .sort((a, b) =>
          (b.firmas_count ?? 0) - (a.firmas_count ?? 0) ||
          (Number(b.score_urgencia) || 0) - (Number(a.score_urgencia) || 0)
        )
        .slice(0, 5)
    }

    return peticionesDelBarrio
      .filter((p) => coincide(
        busquedaDiferida,
        p.titulo,
        p.descripcion,
        p.categorias?.nombre,
        p.zonas?.nombre
      ))
      .slice(0, 8)
  }, [peticionesDelBarrio, busquedaDiferida])

  // Con todos los barrios: los más activos. Con un barrio: sus temas principales.
  const ranking = useMemo(() => {
    const conteo = {}

    peticionesDelBarrio.forEach((p) => {
      const item = barrioFiltro ? p.categorias : p.zonas
      if (item?.nombre) {
        conteo[item.nombre] = conteo[item.nombre] ?? { id: item.id, nombre: item.nombre, cantidad: 0 }
        conteo[item.nombre].cantidad += 1
      }
    })

    return Object.values(conteo)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 6)
  }, [peticionesDelBarrio, barrioFiltro])

  const maximoRanking = Math.max(1, ...ranking.map((b) => b.cantidad))

  const elegirBarrio = (valor) => setBarrioFiltro(valor ? Number(valor) : '')

  // Si la persona no eligió barrio para publicar, se usa el del filtro
  const zonaPublicacion = nueva.zonaId || String(barrioFiltro)

  const handlePublicar = async (e) => {
    e.preventDefault()

    const contenido = nueva.contenido.trim()
    if (!contenido) return

    setPublicando(true)
    setErrorPublicar('')

    try {
      const publicacion = await createPublicacion({
        usuarioId: user.id,
        tipo: nueva.tipo,
        contenido,
        zonaId: zonaPublicacion ? Number(zonaPublicacion) : null,
      })

      setPublicaciones((actuales) => [publicacion, ...actuales])
      setNueva((actual) => ({ ...actual, contenido: '' }))
    } catch (err) {
      console.error('Error publicando:', err)
      setErrorPublicar('No se pudo publicar. Probá de nuevo.')
    } finally {
      setPublicando(false)
    }
  }

  const handleEliminar = async (publicacionId) => {
    if (!window.confirm('¿Eliminar esta publicación?')) return

    try {
      await deletePublicacion(publicacionId)
      setPublicaciones((actuales) => actuales.filter((p) => p.id !== publicacionId))
    } catch (err) {
      console.error('Error eliminando publicación:', err)
      setErrorFeed('No se pudo eliminar la publicación.')
    }
  }

  const puedeEliminar = (publicacion) => publicacion.propia || verAutores

  return (
    <div className="container py-5">
      <span className="eyebrow">Comunidad vecinal</span>
      <h1 className="page-title mb-4">
        {barrioElegido ? `Lo que pasa en ${barrioElegido.nombre}` : 'Lo que pasa en el barrio'}
      </h1>

      <div className="comunidad-filtros">
        <label className="comunidad-buscador">
          <Icon name="search" size={20} />
          <input
            type="search"
            placeholder="Buscar peticiones, casos o publicaciones..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button type="button" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda">
              <Icon name="close" size={16} />
            </button>
          )}
        </label>

        <label className={`comunidad-barrio${barrioFiltro ? ' activo' : ''}`}>
          <Icon name="map" size={18} />
          <select
            value={barrioFiltro}
            onChange={(e) => elegirBarrio(e.target.value)}
            aria-label="Filtrar por barrio"
          >
            <option value="">Todos los barrios</option>
            <OpcionesBarrios zonas={zonas} />
          </select>
        </label>
      </div>

      {barrioElegido && (
        <div className="comunidad-resumen">
          <span>
            <strong>{peticionesDelBarrio.length}</strong>{' '}
            {peticionesDelBarrio.length === 1 ? 'petición activa' : 'peticiones activas'}
          </span>
          <span>
            <strong>{publicaciones.filter(esDelBarrio).length}</strong>{' '}
            {publicaciones.filter(esDelBarrio).length === 1 ? 'publicación' : 'publicaciones'}
          </span>
          <button type="button" onClick={() => elegirBarrio('')}>
            Ver todos los barrios
          </button>
        </div>
      )}

      <div className="comunidad-grid">

        {/* ---------- Feed ---------- */}
        <section className="comunidad-feed">

          <form className="card publicar" onSubmit={handlePublicar}>
            <div className="card-body">
              <div className="publicar-top">
                <Avatar perfil={profile} size={44} />

                <textarea
                  className="publicar-texto"
                  placeholder="¿Qué está pasando en tu barrio?"
                  value={nueva.contenido}
                  onChange={(e) => setNueva({ ...nueva, contenido: e.target.value })}
                  maxLength={LARGO_MAXIMO}
                  rows={3}
                />
              </div>

              {errorPublicar && <div className="alert alert-danger mt-3 mb-0">{errorPublicar}</div>}

              <div className="publicar-acciones">
                <div
                  className={`segmento${nueva.tipo === 'negativo' ? ' es-segundo' : ''}`}
                  role="radiogroup"
                  aria-label="Tipo de publicación"
                >
                  <span className="segmento-indicador" />
                  {Object.entries(TIPOS).map(([valor, { etiqueta, icono }]) => (
                    <button
                      key={valor}
                      type="button"
                      role="radio"
                      aria-checked={nueva.tipo === valor}
                      className={nueva.tipo === valor ? 'active' : ''}
                      onClick={() => setNueva({ ...nueva, tipo: valor })}
                    >
                      <Icon name={icono} size={15} />
                      {etiqueta}
                    </button>
                  ))}
                </div>

                <select
                  className="form-select form-select-sm publicar-zona"
                  value={zonaPublicacion}
                  onChange={(e) => setNueva({ ...nueva, zonaId: e.target.value })}
                  aria-label="Barrio"
                >
                  <option value="">Sin barrio</option>
                  <OpcionesBarrios zonas={zonas} />
                </select>

                <span className="publicar-contador">
                  {nueva.contenido.length}/{LARGO_MAXIMO}
                </span>

                <button
                  className="btn btn-dark"
                  disabled={publicando || !nueva.contenido.trim()}
                >
                  {publicando ? 'Publicando...' : 'Publicar'}
                </button>
              </div>
            </div>
          </form>

          <div className="feed-filtros">
            <div className="chip-filter">
              {[
                ['todo', 'Todo'],
                ['positivo', 'Algo bueno'],
                ['negativo', 'Un problema'],
              ].map(([valor, etiqueta]) => (
                <button
                  key={valor}
                  className={filtroTipo === valor ? 'active' : ''}
                  onClick={() => setFiltroTipo(valor)}
                >
                  {etiqueta}
                </button>
              ))}
            </div>

            <span className="text-muted small">
              {publicacionesFiltradas.length} publicaciones
            </span>
          </div>

          {loading && <p className="text-muted">Cargando el feed...</p>}

          {errorFeed && <div className="alert alert-danger">{errorFeed}</div>}

          {!loading && !errorFeed && publicacionesFiltradas.length === 0 && (
            <div className="empty-state">
              <p className="text-muted mb-0">
                {busqueda
                  ? 'Ninguna publicación coincide con tu búsqueda.'
                  : 'Todavía no hay publicaciones. ¡Contá lo que pasa en tu barrio!'}
              </p>
            </div>
          )}

          <div className="feed-lista">
            {publicacionesFiltradas.map((publicacion, indice) => {
              const tipo = TIPOS[publicacion.tipo] ?? TIPOS.positivo

              return (
                <article
                  key={publicacion.id}
                  className={`post post-${publicacion.tipo}`}
                  style={{ '--i': Math.min(indice, 6) }}
                >
                  <header className="post-head">
                    {/* Anónimo para todos; los admins ven el autor; la propia dice "Vos" */}
                    {publicacion.autor ? (
                      <Avatar perfil={publicacion.autor} size={40} />
                    ) : publicacion.propia ? (
                      <Avatar perfil={profile} size={40} />
                    ) : (
                      <span className="avatar avatar-anonimo" style={{ width: 40, height: 40 }}>
                        <Icon name="user" size={20} />
                      </span>
                    )}

                    <div className="post-autor">
                      <strong>
                        {publicacion.autor
                          ? `${publicacion.autor.nombre} ${publicacion.autor.apellido}`
                          : publicacion.propia
                            ? 'Vos'
                            : 'Vecino/a anónimo/a'}
                      </strong>
                      <span>
                        {publicacion.autor && `${publicacion.autor.email} · `}
                        {publicacion.zonas?.nombre && `${publicacion.zonas.nombre} · `}
                        {tiempoRelativo(publicacion.created_at)}
                      </span>
                    </div>

                    <span className="post-tipo">
                      <Icon name={tipo.icono} size={13} />
                      {tipo.etiqueta}
                    </span>

                    {puedeEliminar(publicacion) && (
                      <button
                        className="icon-btn post-borrar"
                        onClick={() => handleEliminar(publicacion.id)}
                        aria-label="Eliminar publicación"
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    )}
                  </header>

                  <p className="post-texto">{publicacion.contenido}</p>
                </article>
              )
            })}
          </div>
        </section>

        {/* ---------- Lateral: peticiones y barrios ---------- */}
        <aside className="comunidad-lateral">
          <div className="card">
            <div className="card-body">
              <p className="line-label">
                {busquedaDiferida ? 'Peticiones encontradas' : 'Peticiones destacadas'}
              </p>

              {!loading && peticionesEncontradas.length === 0 && (
                <p className="text-muted small mb-0">
                  {busquedaDiferida
                    ? 'Ninguna petición coincide.'
                    : barrioElegido
                      ? `No hay peticiones activas en ${barrioElegido.nombre}.`
                      : 'Sin peticiones todavía.'}
                </p>
              )}

              {peticionesEncontradas.map((peticion) => (
                <Link
                  className="resultado"
                  to={`/peticiones/${peticion.id}`}
                  key={peticion.id}
                >
                  <i className={`dot ${claseUrgencia(peticion.score_urgencia)}`} />
                  <div>
                    <strong>{peticion.titulo}</strong>
                    <span>
                      {peticion.zonas?.nombre} · {peticion.firmas_count ?? 0} firmas
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <p className="line-label">
                {barrioElegido ? `Temas en ${barrioElegido.nombre}` : 'Barrios más activos'}
              </p>

              {ranking.length === 0 && (
                <p className="text-muted small mb-0">Sin datos todavía.</p>
              )}

              {ranking.map((item) => {
                const contenido = (
                  <>
                    <span>{item.nombre}</span>
                    <small>
                      {item.cantidad} {item.cantidad === 1 ? 'petición' : 'peticiones'}
                    </small>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{ width: `${(item.cantidad / maximoRanking) * 100}%` }}
                      />
                    </div>
                  </>
                )

                // Con todos los barrios, tocar uno filtra la comunidad por ese barrio
                return barrioElegido ? (
                  <div className="bar-row" key={item.nombre}>{contenido}</div>
                ) : (
                  <button
                    type="button"
                    className="bar-row bar-row-boton"
                    key={item.nombre}
                    onClick={() => elegirBarrio(item.id)}
                    title={`Ver ${item.nombre}`}
                  >
                    {contenido}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Comunidad
