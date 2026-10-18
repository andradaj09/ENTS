import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, Marker, Polygon, TileLayer, Tooltip, ZoomControl, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '../styles/mapa.css'

import {
  getPeticionesPublicadas,
  getZonas,
  urlFotoPeticion,
} from '../services/petitionService'
import { nivelUrgencia } from '../utils/format'
import { CENTRO_CORDOBA, MAPA_BASE, ubicacionPeticion } from '../utils/ubicacion'
import { areasDeBarrios, clasesEscala, colorPara, SIN_DATOS } from '../utils/zonasMapa'
import Icon from '../components/Icon'
import OpcionesBarrios from '../components/OpcionesBarrios'
import { useAuth } from '../contexts/AuthContext'
import {
  dejarDeSeguirBarrio,
  getBarriosSeguidos,
  seguirBarrio,
} from '../services/participacionService'

// Qué mide el color de cada barrio en la vista por zonas
const METRICAS = {
  peticiones: { nombre: 'Peticiones activas', corto: 'peticiones', enteros: true },
  firmas: { nombre: 'Firmas reunidas', corto: 'firmas', enteros: true },
  urgencia: { nombre: 'Urgencia promedio', corto: 'puntos de urgencia', enteros: false },
}

const NOMBRE_NIVEL = {
  alta: 'Urgencia alta',
  media: 'Urgencia media',
  baja: 'Urgencia baja',
}

// Marcador: rombo de líneas rectas con el color de su tarjeta
const iconos = new Map()

function iconoMarcador(nivel, activo) {
  const clave = `${nivel}-${activo}`

  if (!iconos.has(clave)) {
    iconos.set(clave, L.divIcon({
      className: 'mapa-pin-contenedor',
      html: `<span class="mapa-pin pin-${nivel}${activo ? ' activo' : ''}"></span>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    }))
  }

  return iconos.get(clave)
}

// Encuadra el mapa en los marcadores visibles y vuela al seleccionado
// foco: centro del barrio del vecino; sin un barrio filtrado, el mapa se abre ahí
function ControlVista({ puntos, seleccion, foco }) {
  const map = useMap()

  // `puntos` está memorizado: solo cambia al cargar datos o filtrar por barrio
  useEffect(() => {
    // Un punto marcado muy lejos de la ciudad no debe alejar todo el mapa
    const cercanos = puntos.filter((p) =>
      Math.abs(p.lat - CENTRO_CORDOBA.lat) < 0.3 && Math.abs(p.lng - CENTRO_CORDOBA.lng) < 0.3
    )
    const encuadre = cercanos.length > 0 ? cercanos : puntos
    if (encuadre.length === 0) return

    if (foco) {
      map.flyTo([foco.lat, foco.lng], 14, { duration: 0.8 })
      return
    }

    const limites = L.latLngBounds(encuadre.map((p) => [p.lat, p.lng]))
    map.flyToBounds(limites, {
      paddingTopLeft: [60, 150], // deja libre el lugar de la leyenda
      paddingBottomRight: [40, 40],
      maxZoom: 15,
      duration: 0.8,
    })
  }, [puntos, map, foco])

  useEffect(() => {
    if (!seleccion) return

    map.flyTo([seleccion.lat, seleccion.lng], Math.max(map.getZoom(), 16), {
      duration: 0.7,
    })
  }, [seleccion, map])

  return null
}

function Mapa() {
  const { user, profile } = useAuth()
  const miZona = profile?.zona_id ?? null
  const [peticiones, setPeticiones] = useState([])
  const [seguidos, setSeguidos] = useState([])
  const [zonas, setZonas] = useState([])
  const [zonaFiltro, setZonaFiltro] = useState('todas')
  const [seleccionId, setSeleccionId] = useState(null)
  const [resaltadoId, setResaltadoId] = useState(null)
  const [vista, setVista] = useState('barrios')
  const [metrica, setMetrica] = useState('peticiones')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const tarjetasRef = useRef(new Map())

  useEffect(() => {
    const cargar = async () => {
      try {
        const [peticionesData, zonasData] = await Promise.all([
          getPeticionesPublicadas(),
          getZonas(),
        ])

        setPeticiones(peticionesData)
        setZonas(zonasData)

        // Opcional: si falla, el botón "Seguir" simplemente arranca vacío
        getBarriosSeguidos().then(setSeguidos).catch(() => {})
      } catch (err) {
        console.error('Error cargando el mapa:', err)
        setError('No se pudieron cargar las peticiones del mapa.')
      } finally {
        setLoading(false)
      }
    }

    cargar()
  }, [])

  const puntos = useMemo(() => peticiones
    .filter((p) => zonaFiltro === 'todas' || p.zonas?.id === zonaFiltro)
    .map((p) => ({
      ...p,
      ...ubicacionPeticion(p),
      nivel: nivelUrgencia(p.score_urgencia),
    }))
    .sort((a, b) => (Number(b.score_urgencia) || 0) - (Number(a.score_urgencia) || 0)),
  [peticiones, zonaFiltro])

  // Qué encuadrar: en la vista por barrios, todos los barrios (incluye Villa Allende);
  // con un barrio elegido o en la vista de peticiones, solo los puntos visibles
  const encuadre = useMemo(() => (
    vista === 'barrios' && zonaFiltro === 'todas'
      ? zonas.map((z) => ({ lat: Number(z.lat), lng: Number(z.lng) }))
      : puntos
  ), [vista, zonaFiltro, zonas, puntos])

  // Resumen por barrio con todas las peticiones (sin importar el filtro)
  const resumenBarrios = useMemo(() => {
    const resumen = new Map()

    for (const p of peticiones) {
      const id = p.zonas?.id
      if (!id) continue
      const actual = resumen.get(id) ?? { peticiones: 0, firmas: 0, sumaUrgencia: 0 }
      actual.peticiones += 1
      actual.firmas += p.firmas_count ?? 0
      actual.sumaUrgencia += Number(p.score_urgencia) || 0
      resumen.set(id, actual)
    }

    for (const actual of resumen.values()) {
      actual.urgencia = Math.round(actual.sumaUrgencia / actual.peticiones)
    }

    return resumen
  }, [peticiones])

  const areas = useMemo(() => areasDeBarrios(zonas), [zonas])

  const focoMiBarrio = useMemo(() => {
    const zona = zonas.find((z) => z.id === miZona)
    return zona?.lat != null ? { lat: Number(zona.lat), lng: Number(zona.lng) } : null
  }, [zonas, miZona])

  const maximoMetrica = useMemo(() => Math.max(
    0,
    ...[...resumenBarrios.values()].map((r) => r[metrica])
  ), [resumenBarrios, metrica])

  // Barrios sin datos: gris neutro que se distinga del fondo en cada tema
  const sinDatos = document.documentElement.dataset.tema === 'oscuro' ? '#383835' : SIN_DATOS

  const escala = clasesEscala(maximoMetrica, METRICAS[metrica].enteros)
  const mostrarPines = vista === 'puntos' || zonaFiltro !== 'todas'

  const siguiendo = seguidos.includes(zonaFiltro)

  // Seguir el barrio elegido: llegan avisos de cada petición nueva que se publique ahí
  const alternarSeguir = async () => {
    try {
      if (siguiendo) {
        await dejarDeSeguirBarrio(user.id, zonaFiltro)
        setSeguidos((actuales) => actuales.filter((id) => id !== zonaFiltro))
      } else {
        await seguirBarrio(user.id, zonaFiltro)
        setSeguidos((actuales) => [...actuales, zonaFiltro])
      }
    } catch (err) {
      console.error('Error siguiendo barrio:', err)
    }
  }

  const seleccion = puntos.find((p) => p.id === seleccionId) ?? null

  const seleccionarDesdeMapa = (id) => {
    setSeleccionId(id)
    tarjetasRef.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const cambiarZona = (valor) => {
    setZonaFiltro(valor === 'todas' ? 'todas' : Number(valor))
    setSeleccionId(null)
  }

  return (
    <div className="mapa-layout">

      <section className="mapa-lienzo panel">
        <MapContainer
          center={[CENTRO_CORDOBA.lat, CENTRO_CORDOBA.lng]}
          zoom={13}
          zoomControl={false}
          className="mapa-leaflet"
        >
          <TileLayer {...MAPA_BASE} />
          <ZoomControl position="bottomright" />

          {vista === 'barrios' && areas.map(({ zona, contorno }) => {
            const datos = resumenBarrios.get(zona.id)
            const valor = datos?.[metrica] ?? 0
            const elegida = zonaFiltro === zona.id
            const esMia = zona.id === miZona
            // El barrio propio lleva un contorno azul para encontrarlo de un vistazo
            const borde = elegida
              ? { color: '#0b0b0b', weight: 3, dashArray: null }
              : esMia
                ? { color: '#1c5cab', weight: 4, dashArray: '8 6' }
                : { color: '#ffffff', weight: 2, dashArray: null }

            return (
              <Polygon
                key={`${zona.id}-${metrica}-${zonaFiltro}`}
                positions={contorno}
                pathOptions={{
                  ...borde,
                  fillColor: valor ? colorPara(valor, maximoMetrica, METRICAS[metrica].enteros) : sinDatos,
                  fillOpacity: zonaFiltro === 'todas' || elegida ? 0.62 : 0.25,
                }}
                eventHandlers={{
                  click: () => cambiarZona(elegida ? 'todas' : zona.id),
                  mouseover: (e) => e.target.setStyle({ weight: 3, color: '#0b0b0b' }),
                  mouseout: (e) => e.target.setStyle(borde),
                }}
              >
                <Tooltip sticky direction="top" className="mapa-tooltip">
                  <strong>{zona.nombre}{esMia && ' · Tu barrio'}</strong>
                  <span>{datos?.peticiones ?? 0} peticiones · {datos?.firmas ?? 0} firmas</span>
                  <span>Urgencia promedio: {datos?.urgencia ?? 0}/100</span>
                </Tooltip>
              </Polygon>
            )
          })}

          {mostrarPines && puntos.map((punto) => (
            <Marker
              key={punto.id}
              position={[punto.lat, punto.lng]}
              icon={iconoMarcador(
                punto.nivel,
                punto.id === seleccionId || punto.id === resaltadoId
              )}
              zIndexOffset={punto.id === seleccionId ? 1000 : 0}
              eventHandlers={{
                click: () => seleccionarDesdeMapa(punto.id),
                mouseover: () => setResaltadoId(punto.id),
                mouseout: () => setResaltadoId(null),
              }}
              title={punto.titulo}
            />
          ))}

          <ControlVista puntos={encuadre} seleccion={seleccion} foco={zonaFiltro === 'todas' ? focoMiBarrio : null} />
        </MapContainer>

        <div className="mapa-leyenda">
          <div className="mapa-vista" role="group" aria-label="Tipo de vista">
            <button
              className={vista === 'barrios' ? 'active' : ''}
              onClick={() => setVista('barrios')}
            >
              Barrios
            </button>
            <button
              className={vista === 'puntos' ? 'active' : ''}
              onClick={() => setVista('puntos')}
            >
              Peticiones
            </button>
          </div>

          {vista === 'barrios' ? (
            <>
              <select
                className="form-select form-select-sm mapa-metrica"
                value={metrica}
                onChange={(e) => setMetrica(e.target.value)}
                aria-label="Qué mide el color"
              >
                {Object.entries(METRICAS).map(([clave, { nombre }]) => (
                  <option key={clave} value={clave}>{nombre}</option>
                ))}
              </select>

              <div className="mapa-escala">
                <span className="mapa-escala-paso">
                  <i style={{ background: sinDatos }} /> 0
                </span>
                {escala.map((clase) => (
                  <span className="mapa-escala-paso" key={clase.color}>
                    <i style={{ background: clase.color }} />
                    {clase.etiqueta}
                  </span>
                ))}
              </div>
              <p className="mapa-escala-nota">
                Máximo: {Math.ceil(maximoMetrica)} {METRICAS[metrica].corto} en un barrio. Tocá uno para filtrar.
              </p>
            </>
          ) : (
            <div className="mapa-leyenda-items">
              <span><i className="mapa-pin pin-alta" /> Alta</span>
              <span><i className="mapa-pin pin-media" /> Media</span>
              <span><i className="mapa-pin pin-baja" /> Baja</span>
            </div>
          )}
        </div>
      </section>

      <aside className="mapa-lista panel">
        <header className="mapa-lista-head">
          <div>
            <span className="eyebrow">Problemáticas</span>
            <h1>{puntos.length} en el mapa</h1>
          </div>

          {zonaFiltro !== 'todas' && user && (
            <button
              type="button"
              className={`btn btn-sm ${siguiendo ? 'btn-dark' : 'btn-ghost'}`}
              onClick={alternarSeguir}
              aria-pressed={siguiendo}
            >
              <Icon name={siguiendo ? 'check' : 'bell'} size={14} className="me-1" />
              {siguiendo ? 'Siguiendo' : 'Seguir barrio'}
            </button>
          )}

          <select
            className="form-select form-select-sm"
            value={zonaFiltro}
            onChange={(e) => cambiarZona(e.target.value)}
            aria-label="Filtrar por barrio"
          >
            <option value="todas">Todos los barrios</option>
            <OpcionesBarrios zonas={zonas} />
          </select>
        </header>

        <div className="mapa-tarjetas">
          {loading && <p className="text-muted small px-1">Cargando peticiones...</p>}

          {error && <div className="alert alert-danger">{error}</div>}

          {!loading && !error && puntos.length === 0 && (
            <div className="empty-state">
              <p className="text-muted mb-0">No hay peticiones activas en esta zona.</p>
            </div>
          )}

          {puntos.map((punto, indice) => (
            <article
              key={punto.id}
              ref={(nodo) => {
                if (nodo) tarjetasRef.current.set(punto.id, nodo)
                else tarjetasRef.current.delete(punto.id)
              }}
              className={[
                'mapa-tarjeta',
                `nivel-${punto.nivel}`,
                punto.id === seleccionId && 'activa',
                punto.id === resaltadoId && 'resaltada',
              ].filter(Boolean).join(' ')}
              style={{ '--i': Math.min(indice, 8) }}
              onClick={() => setSeleccionId(punto.id)}
              onMouseEnter={() => setResaltadoId(punto.id)}
              onMouseLeave={() => setResaltadoId(null)}
            >
              <div className="mapa-tarjeta-top">
                <span className={`mapa-pin pin-${punto.nivel}`} />
                <span className="mapa-tarjeta-kicker">
                  {punto.categorias?.nombre} · {punto.zonas?.nombre}
                </span>
              </div>

              {punto.fotos?.length > 0 && (
                <img
                  className="mapa-tarjeta-foto"
                  src={urlFotoPeticion(punto.fotos[0])}
                  alt=""
                  loading="lazy"
                />
              )}

              <h2>{punto.titulo}</h2>

              <div className="mapa-tarjeta-meta">
                <span>{NOMBRE_NIVEL[punto.nivel]} · {punto.score_urgencia ?? 0}/100</span>
                <span>{punto.firmas_count ?? 0} firmas</span>
              </div>

              {punto.aproximada && (
                <p className="mapa-tarjeta-nota">Ubicación aproximada del barrio</p>
              )}

              <Link
                to={`/peticiones/${punto.id}`}
                className="mapa-tarjeta-link"
                onClick={(e) => e.stopPropagation()}
              >
                Ver petición
                <Icon name="arrow" size={16} />
              </Link>
            </article>
          ))}
        </div>
      </aside>
    </div>
  )
}

export default Mapa
