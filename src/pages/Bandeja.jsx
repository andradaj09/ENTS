import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getPeticionesPublicadas } from '../services/petitionService'
import { getAreas, getEstadisticasArea } from '../services/participacionService'
import {
  ETAPAS_SEGUIMIENTO,
  nombreEtapa,
  ordenarPorPrioridad,
  prioridadPorFirmas,
} from '../utils/prioridad'
import { tiempoRelativo } from '../utils/format'
import Icon from '../components/Icon'

// Bandeja de trabajo de funcionarios: las peticiones publicadas de su área,
// de mayor a menor prioridad, para responderlas y moverlas de etapa.
// Un admin (o un funcionario sin área) ve todas y puede filtrar por área.
function Bandeja() {
  const { profile } = useAuth()
  const [peticiones, setPeticiones] = useState([])
  const [areas, setAreas] = useState([])
  const [areaFiltro, setAreaFiltro] = useState(() => (profile?.area_id ? String(profile.area_id) : 'todas'))
  const [etapa, setEtapa] = useState('pendientes')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resumen, setResumen] = useState(null)

  const areaFija = profile?.rol === 'funcionario' && profile.area_id

  useEffect(() => {
    Promise.all([getPeticionesPublicadas(), getAreas()])
      .then(([peticionesData, areasData]) => {
        setPeticiones(peticionesData)
        setAreas(areasData)
      })
      .catch((err) => {
        console.error('Error cargando la bandeja:', err)
        setError('No se pudo cargar la bandeja.')
      })
      .finally(() => setLoading(false))
  }, [])

  // Resumen del área (el funcionario siempre recibe el de la suya)
  useEffect(() => {
    let activo = true
    getEstadisticasArea(areaFiltro === 'todas' ? null : areaFiltro)
      .then((datos) => activo && setResumen(datos))
      .catch((err) => console.error('Error cargando el resumen del área:', err))
    return () => {
      activo = false
    }
  }, [areaFiltro])

  const delArea = useMemo(() => peticiones.filter((p) =>
    areaFiltro === 'todas' || String(p.categorias?.area_id) === areaFiltro
  ), [peticiones, areaFiltro])

  const conteo = (clave) => delArea.filter((p) => (p.seguimiento ?? 'recibida') === clave).length
  const pendientes = delArea.filter((p) => p.seguimiento !== 'resuelta')

  const visibles = ordenarPorPrioridad(
    etapa === 'pendientes' ? pendientes : delArea.filter((p) => p.seguimiento === etapa)
  )

  const nombreArea = areas.find((a) => String(a.id) === areaFiltro)?.nombre

  return (
    <div className="container py-5">
      <span className="eyebrow">Gestión</span>
      <h1 className="page-title mb-2">Bandeja {nombreArea ? `de ${nombreArea}` : 'de peticiones'}</h1>
      <p className="text-muted mb-4">
        Peticiones publicadas ordenadas por prioridad (cantidad de firmas). Entrá a cada una
        para publicar una respuesta oficial y cambiar su etapa.
      </p>

      <div className="bandeja-filtros">
        <div className="chip-filter" role="tablist" aria-label="Etapa">
          <button className={etapa === 'pendientes' ? 'active' : ''} onClick={() => setEtapa('pendientes')}>
            Sin resolver ({pendientes.length})
          </button>
          {ETAPAS_SEGUIMIENTO.map((e) => (
            <button key={e.clave} className={etapa === e.clave ? 'active' : ''} onClick={() => setEtapa(e.clave)}>
              {e.nombre} ({conteo(e.clave)})
            </button>
          ))}
        </div>

        {!areaFija && (
          <select
            className="form-select form-select-sm bandeja-area"
            value={areaFiltro}
            onChange={(e) => setAreaFiltro(e.target.value)}
            aria-label="Filtrar por área"
          >
            <option value="todas">Todas las áreas</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        )}
      </div>

      {resumen && (
        <div className="bandeja-resumen" aria-label="Resumen del área">
          <div><strong>{resumen.sin_resolver}</strong><span>Sin resolver</span></div>
          <div><strong>{resumen.sin_respuesta}</strong><span>Sin ninguna respuesta</span></div>
          <div><strong>{resumen.urgentes}</strong><span>Urgentes (70+)</span></div>
          <div><strong>{resumen.elevadas}</strong><span>Elevadas por firmas</span></div>
          <div><strong>{resumen.resueltas}</strong><span>Resueltas</span></div>
          <div><strong>{resumen.dias_a_resolver ?? '—'}</strong><span>Días promedio a resolver</span></div>
        </div>
      )}

      {loading && <p className="text-muted">Cargando bandeja...</p>}
      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && visibles.length === 0 && (
        <div className="empty-state">
          <p className="text-muted mb-0">No hay peticiones en esta etapa.</p>
        </div>
      )}

      <ul className="bandeja-lista">
        {visibles.map((p) => {
          const prioridad = prioridadPorFirmas(p.firmas_count)

          return (
            <li key={p.id} style={{ '--prioridad': prioridad.color, '--prioridad-texto': prioridad.texto }}>
              <Link to={`/peticiones/${p.id}`}>
                <span className="prioridad-badge">{prioridad.corto}</span>
                <div className="bandeja-texto">
                  <strong>{p.titulo}</strong>
                  <span>
                    {p.categorias?.nombre} · {p.zonas?.nombre} · {tiempoRelativo(p.created_at)}
                    {p.elevada_at && ' · Elevada por firmas'}
                  </span>
                </div>
                <span className="bandeja-firmas">
                  <strong>{p.firmas_count ?? 0}</strong> firmas
                </span>
                <span className={`badge seguimiento-badge etapa-${p.seguimiento}`}>{nombreEtapa(p.seguimiento)}</span>
                <Icon name="chevron" size={18} />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default Bandeja
