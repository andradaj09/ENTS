import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getResumenMiBarrio } from '../services/participacionService'
import { numero } from '../utils/format'
import ElegirBarrio from './ElegirBarrio'
import Icon from './Icon'

// Comparación con la ciudad: solo si el barrio tiene datos suficientes
const MINIMO_PARA_COMPARAR = 3

// Tarjeta del inicio con el resumen del barrio del vecino, comparado con el
// promedio de la ciudad. Si todavía no eligió barrio, le permite elegirlo.
function TuBarrio() {
  const { profile } = useAuth()
  const zonaId = profile?.zona_id
  const [resumen, setResumen] = useState(null)

  useEffect(() => {
    if (!zonaId) return
    let activo = true
    getResumenMiBarrio()
      .then((datos) => activo && setResumen(datos))
      .catch((err) => console.error('Error cargando el resumen del barrio:', err))
    return () => {
      activo = false
    }
  }, [zonaId])

  if (!zonaId) {
    return (
      <div className="panel aside-panel tu-barrio">
        <div className="aside-head">
          <Icon name="map" size={24} />
          Elegí tu barrio
        </div>
        <p className="text-muted small px-2">
          Así te mostramos primero lo que pasa cerca tuyo y te avisamos de las peticiones nuevas.
        </p>
        <div className="px-2"><ElegirBarrio textoBoton="Guardar" /></div>
      </div>
    )
  }

  if (!resumen) {
    return <div className="panel aside-panel tu-barrio"><p className="text-muted small px-2 mb-0">Cargando tu barrio...</p></div>
  }

  const comparar = resumen.activas >= MINIMO_PARA_COMPARAR
  const masActivas = comparar && resumen.activas_promedio && resumen.activas > resumen.activas_promedio

  return (
    <div className="panel aside-panel tu-barrio">
      <div className="aside-head">
        <Icon name="map" size={24} />
        <span className="tu-barrio-nombre">
          <small>Tu barrio</small>
          {resumen.barrio}
        </span>
        <Link to="/perfil#mi-barrio" className="tu-barrio-cambiar">Cambiar</Link>
      </div>

      <div className="tu-barrio-datos">
        <div>
          <strong>{numero(resumen.activas)}</strong>
          <span>Activas</span>
          {comparar && <small>Promedio: {String(resumen.activas_promedio).replace('.', ',')}</small>}
        </div>
        <div>
          <strong>{numero(resumen.firmas)}</strong>
          <span>Firmas</span>
        </div>
        <div>
          <strong>{numero(resumen.resueltas_mes)}</strong>
          <span>Resueltas este mes</span>
        </div>
        <div>
          <strong>{resumen.urgencia ?? '—'}</strong>
          <span>Urgencia</span>
          <small>Ciudad: {resumen.urgencia_ciudad}</small>
        </div>
      </div>

      {resumen.categoria && (
        <p className="tu-barrio-dato">
          {comparar && resumen.categoria_veces >= 1.3
            ? <>En {resumen.barrio} se reclama <b>{String(resumen.categoria_veces).replace('.', ',')} veces más</b> por {resumen.categoria.toLowerCase()} que en el promedio de la ciudad.</>
            : <>Lo más reclamado en tu barrio: <b>{resumen.categoria}</b>.</>}
          {masActivas && ' Tiene más peticiones activas que el barrio promedio.'}
        </p>
      )}
    </div>
  )
}

export default TuBarrio
