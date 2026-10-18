import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getEstadisticasPublicas } from '../services/petitionService'
import { getRankingBarrios } from '../services/participacionService'
import { usePermisos } from '../hooks/usePermisos'
import { Barras, Columnas, Proporcion, TarjetaGrafico, Tile } from '../components/Graficos'
import { fechaCorta, numero } from '../utils/format'
import Icon from '../components/Icon'
import '../styles/estadisticas.css'

// Niveles de urgencia: escala ordenada de un solo tono (claro = baja)
const URGENCIA = [
  { clave: 'alta', nombre: 'Alta', color: '#104281' },
  { clave: 'media', nombre: 'Media', color: '#3987e5' },
  { clave: 'baja', nombre: 'Baja', color: '#86b6ef' },
]

// Estadísticas para todos los vecinos: solo números agregados de peticiones
// publicadas y del muro. Ningún dato permite identificar a una persona.
function Estadisticas() {
  const { user } = useAuth()
  const { puede } = usePermisos(user?.id)
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [ranking, setRanking] = useState(null)

  // Ranking del último mes (opcional: si falla, la tarjeta no aparece)
  useEffect(() => {
    getRankingBarrios().then(setRanking).catch((err) => console.error('Error cargando el ranking:', err))
  }, [])

  useEffect(() => {
    getEstadisticasPublicas()
      .then(setDatos)
      .catch((err) => {
        console.error('Error cargando estadísticas:', err)
        setError('No se pudieron cargar las estadísticas.')
      })
  }, [])

  if (error) {
    return <div className="container py-5"><div className="alert alert-danger">{error}</div></div>
  }

  if (!datos) {
    return <div className="container py-5"><p className="text-muted">Cargando estadísticas...</p></div>
  }

  const { totales, por_categoria: categorias, por_barrio: barrios, por_semana: semanas } = datos
  const barriosConDatos = barrios.filter((b) => b.cantidad > 0)
  const topBarrios = barriosConDatos.slice(0, 10)
  const semanasGrafico = semanas.map((s) => ({
    clave: s.semana,
    etiqueta: fechaCorta(s.semana),
    titulo: `Semana del ${fechaCorta(s.semana)}`,
    valor: s.cantidad,
    unidad: 'peticiones',
  }))

  return (
    <div className="container py-5 estadisticas">
      <div className="estadisticas-head">
        <div>
          <span className="eyebrow">Tu ciudad en números</span>
          <h1 className="page-title mb-1">Estadísticas vecinales</h1>
          <p className="text-muted mb-0">
            Qué se pide, dónde y cuánto apoyo recibe. Todos los datos son anónimos.
          </p>
        </div>

        {puede('panel') && (
          <Link className="btn btn-dark btn-sm" to="/admin/estadisticas">
            <Icon name="lock" size={14} className="me-1" />
            Panel de administración
          </Link>
        )}
      </div>

      <div className="tiles">
        <Tile etiqueta="Peticiones activas" valor={numero(totales.peticiones)}
          detalle={`${numero(totales.nuevas_semana)} nuevas esta semana`} />
        <Tile etiqueta="Firmas reunidas" valor={numero(totales.firmas)} />
        <Tile etiqueta="Urgentes" valor={numero(totales.urgentes)} detalle="Urgencia de 70 o más" />
        <Tile etiqueta="Barrios con pedidos" valor={numero(totales.barrios)}
          detalle={`de ${barrios.length} barrios`} />
        <Tile etiqueta="Publicaciones del muro" valor={numero(totales.publicaciones)} />
      </div>

      <div className="estadisticas-grid">
        <TarjetaGrafico
          className="ancho-7"
          titulo="Peticiones nuevas por semana"
          subtitulo="Últimas 12 semanas"
          columnas={['Semana', 'Peticiones']}
          filas={semanasGrafico.map((s) => [s.titulo, numero(s.valor)])}
        >
          <Columnas datos={semanasGrafico} cadaEtiqueta={2} />
        </TarjetaGrafico>

        <TarjetaGrafico
          className="ancho-5"
          titulo="Nivel de urgencia"
          subtitulo="Peticiones activas según su puntaje"
          columnas={['Urgencia', 'Peticiones']}
          filas={URGENCIA.map((u) => [u.nombre, numero(datos.urgencia[u.clave])])}
        >
          <Proporcion partes={URGENCIA.map((u) => ({ ...u, valor: datos.urgencia[u.clave] }))} />

          <div className="tiles mt-4 mb-0">
            <Tile etiqueta="Experiencias positivas" valor={numero(datos.feed.positivo)}
              detalle="Publicadas en el muro" />
            <Tile etiqueta="Problemas reportados" valor={numero(datos.feed.negativo)}
              detalle="Publicados en el muro" />
          </div>
        </TarjetaGrafico>

        <TarjetaGrafico
          className="ancho-6"
          titulo="¿Qué se pide?"
          subtitulo="Peticiones activas por categoría"
          columnas={['Categoría', 'Peticiones', 'Firmas']}
          filas={categorias.map((c) => [c.nombre, numero(c.cantidad), numero(c.firmas)])}
        >
          <Barras
            datos={categorias.map((c) => ({
              etiqueta: c.nombre,
              valor: c.cantidad,
              detalle: `${numero(c.cantidad)} peticiones · ${numero(c.firmas)} firmas`,
            }))}
          />
        </TarjetaGrafico>

        <TarjetaGrafico
          className="ancho-6"
          titulo="Barrios con más pedidos"
          subtitulo={topBarrios.length < barriosConDatos.length
            ? `Los 10 primeros de ${barriosConDatos.length}; la tabla los muestra todos`
            : 'Peticiones activas por barrio'}
          columnas={['Barrio', 'Peticiones', 'Firmas', 'Urgencia promedio']}
          filas={barrios.map((b) => [
            b.nombre, numero(b.cantidad), numero(b.firmas), `${b.urgencia_promedio}/100`,
          ])}
        >
          <Barras
            datos={topBarrios.map((b) => ({
              etiqueta: b.nombre,
              valor: b.cantidad,
              detalle: `${numero(b.firmas)} firmas · urgencia promedio ${b.urgencia_promedio}/100`,
            }))}
          />
          <Link className="mapa-tarjeta-link mt-3 d-inline-flex" to="/mapa">
            Ver en el mapa por barrios
            <Icon name="arrow" size={16} />
          </Link>
        </TarjetaGrafico>

        {ranking && (
          <>
            <TarjetaGrafico
              className="ancho-6"
              titulo="Barrios más activos del mes"
              subtitulo="Peticiones nuevas y firmas de los últimos 30 días"
              columnas={['Barrio', 'Actividad']}
              filas={ranking.activos.map((b) => [b.nombre, numero(b.actividad)])}
            >
              <Barras
                vacio="Todavía no hay actividad este mes."
                datos={ranking.activos.map((b) => ({ etiqueta: b.nombre, valor: b.actividad }))}
              />
            </TarjetaGrafico>

            <TarjetaGrafico
              className="ancho-6"
              titulo="Barrios que más resolvieron"
              subtitulo="Peticiones resueltas en los últimos 30 días"
              columnas={['Barrio', 'Resueltas']}
              filas={ranking.resolvieron.map((b) => [b.nombre, numero(b.resueltas)])}
            >
              <Barras
                vacio="Todavía no hay peticiones resueltas este mes."
                datos={ranking.resolvieron.map((b) => ({ etiqueta: b.nombre, valor: b.resueltas }))}
              />
            </TarjetaGrafico>
          </>
        )}
      </div>
    </div>
  )
}

export default Estadisticas
