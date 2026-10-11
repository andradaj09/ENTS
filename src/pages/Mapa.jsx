import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, Marker, TileLayer, ZoomControl, useMap } from 'react-leaflet'
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
import Icon from '../components/Icon'

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
function ControlVista({ puntos, seleccion }) {
  const map = useMap()

  // `puntos` está memorizado: solo cambia al cargar datos o filtrar por barrio
  useEffect(() => {
    if (puntos.length === 0) return

    const limites = L.latLngBounds(puntos.map((p) => [p.lat, p.lng]))
    map.flyToBounds(limites, { padding: [60, 60], maxZoom: 15, duration: 0.8 })
  }, [puntos, map])

  useEffect(() => {
    if (!seleccion) return

    map.flyTo([seleccion.lat, seleccion.lng], Math.max(map.getZoom(), 16), {
      duration: 0.7,
    })
  }, [seleccion, map])

  return null
}

function Mapa() {
  const [peticiones, setPeticiones] = useState([])
  const [zonas, setZonas] = useState([])
  const [zonaFiltro, setZonaFiltro] = useState('todas')
  const [seleccionId, setSeleccionId] = useState(null)
  const [resaltadoId, setResaltadoId] = useState(null)
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

          {puntos.map((punto) => (
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

          <ControlVista puntos={puntos} seleccion={seleccion} />
        </MapContainer>

        <div className="mapa-leyenda">
          <span className="eyebrow">Mapa vecinal</span>
          <div className="mapa-leyenda-items">
            <span><i className="mapa-pin pin-alta" /> Alta</span>
            <span><i className="mapa-pin pin-media" /> Media</span>
            <span><i className="mapa-pin pin-baja" /> Baja</span>
          </div>
        </div>
      </section>

      <aside className="mapa-lista panel">
        <header className="mapa-lista-head">
          <div>
            <span className="eyebrow">Problemáticas</span>
            <h1>{puntos.length} en el mapa</h1>
          </div>

          <select
            className="form-select form-select-sm"
            value={zonaFiltro}
            onChange={(e) => cambiarZona(e.target.value)}
            aria-label="Filtrar por barrio"
          >
            <option value="todas">Todos los barrios</option>
            {zonas.map((zona) => (
              <option key={zona.id} value={zona.id}>
                {zona.nombre}
              </option>
            ))}
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
                <span>{punto.firmas?.length ?? 0} firmas</span>
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
