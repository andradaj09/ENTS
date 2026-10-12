import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getEstadisticasAdmin, getEstadisticasPublicas, getPeticionesParaReporte } from '../services/petitionService'
import { descargarCSV, fechaArchivo } from '../utils/exportar'
import { nombreEtapa, prioridadPorFirmas } from '../utils/prioridad'
import { nombreRol } from '../utils/roles'
import { fechaCorta, numero, tiempoRelativo } from '../utils/format'
import { Barras, BarrasApiladas, Columnas, Proporcion, TarjetaGrafico, Tile } from '../components/Graficos'
import Icon from '../components/Icon'
import '../styles/estadisticas.css'

// Estados de moderación: colores de estado, siempre con ícono y nombre
const ESTADOS = [
  { clave: 'publicada', nombre: 'Publicadas', color: '#0ca30c', icono: <Icon name="check" size={14} /> },
  { clave: 'pendiente', nombre: 'Pendientes', color: '#fab219', icono: <Icon name="hourglass" size={14} /> },
  { clave: 'rechazada', nombre: 'Rechazadas', color: '#d03b3b', icono: <Icon name="close" size={14} /> },
]

const SERIES_MURO = [
  { clave: 'positivo', nombre: 'Experiencias positivas', color: 'var(--serie-1)' },
  { clave: 'negativo', nombre: 'Problemas reportados', color: 'var(--serie-2)' },
]

const horas = (valor) => {
  if (valor == null) return '—'
  return valor < 48 ? `${numero(valor)} h` : `${numero(valor / 24)} días`
}

// Panel analítico completo: solo administradores. Incluye datos personales
// (nombres y correos), por eso la base verifica el rol en estadisticas_admin().
function EstadisticasAdmin() {
  const [datos, setDatos] = useState(null)
  const [publicas, setPublicas] = useState(null)
  const [error, setError] = useState('')
  const [exportando, setExportando] = useState(false)

  // Excel: todas las peticiones con su barrio, área, etapa y prioridad
  const exportarPeticiones = async () => {
    setExportando(true)

    try {
      const filas = (await getPeticionesParaReporte()).map((p) => [
        p.id,
        p.titulo,
        p.categorias?.nombre,
        p.categorias?.areas?.nombre,
        p.zonas?.nombre,
        p.zonas?.localidad,
        p.estado,
        p.estado === 'publicada' ? nombreEtapa(p.seguimiento) : '',
        prioridadPorFirmas(p.firmas_count).corto,
        p.firmas_count,
        p.score_urgencia,
        new Date(p.created_at).toLocaleDateString('es-AR'),
        p.elevada_at ? new Date(p.elevada_at).toLocaleDateString('es-AR') : '',
      ])

      descargarCSV(`ents-peticiones-${fechaArchivo()}.csv`, [
        'ID', 'Título', 'Categoría', 'Área', 'Barrio', 'Localidad', 'Estado', 'Etapa',
        'Prioridad', 'Firmas', 'Urgencia', 'Creada', 'Elevada',
      ], filas)
    } catch (err) {
      console.error('Error exportando:', err)
      setError('No se pudo generar el reporte.')
    } finally {
      setExportando(false)
    }
  }

  // Resumen por barrio (lo mismo que ven los gráficos, en una planilla)
  const exportarBarrios = () => {
    descargarCSV(`ents-barrios-${fechaArchivo()}.csv`,
      ['Barrio', 'Peticiones activas', 'Firmas', 'Urgencia promedio'],
      (publicas?.por_barrio ?? []).map((b) => [b.nombre, b.cantidad, b.firmas, b.urgencia_promedio]))
  }

  useEffect(() => {
    Promise.all([getEstadisticasAdmin(), getEstadisticasPublicas()])
      .then(([admin, generales]) => {
        setDatos(admin)
        setPublicas(generales)
      })
      .catch((err) => {
        console.error('Error cargando el panel analítico:', err)
        setError('No se pudo cargar el panel analítico.')
      })
  }, [])

  if (error) {
    return <div className="container py-5"><div className="alert alert-danger">{error}</div></div>
  }

  if (!datos) {
    return <div className="container py-5"><p className="text-muted">Cargando panel analítico...</p></div>
  }

  const { usuarios, moderacion } = datos

  const registros = datos.registros_por_semana.map((s) => ({
    clave: s.semana,
    etiqueta: fechaCorta(s.semana),
    titulo: `Semana del ${fechaCorta(s.semana)}`,
    valor: s.cantidad,
    unidad: 'registros',
  }))

  const firmasDia = datos.firmas_por_dia.map((d) => ({
    clave: d.dia,
    etiqueta: fechaCorta(d.dia),
    titulo: fechaCorta(d.dia),
    valor: d.cantidad,
    unidad: 'firmas',
  }))

  const totalFirmasMes = firmasDia.reduce((t, d) => t + d.valor, 0)

  return (
    <div className="container py-5 estadisticas">
      <div className="estadisticas-head">
        <div>
          <span className="eyebrow">Panel de administración</span>
          <h1 className="page-title mb-1">Panel analítico</h1>
          <p className="text-muted mb-0">
            Actividad de cuentas, moderación y participación. Incluye datos personales:
            solo lo ven los administradores.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2 align-items-center no-imprimir">
          <span className="aviso-privado">
            <Icon name="lock" size={14} />
            Información reservada
          </span>
          <button className="btn btn-ghost btn-sm" onClick={exportarPeticiones} disabled={exportando}>
            <Icon name="file" size={14} className="me-1" />
            {exportando ? 'Generando...' : 'Peticiones (Excel)'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={exportarBarrios}>
            <Icon name="map" size={14} className="me-1" />
            Barrios (Excel)
          </button>
          <button className="btn btn-dark btn-sm" onClick={() => window.print()}>
            <Icon name="steps" size={14} className="me-1" />
            Imprimir / PDF
          </button>
        </div>
      </div>

      <div className="tiles">
        <Tile etiqueta="Cuentas" valor={numero(usuarios.total)}
          detalle={`${numero(usuarios.nuevos_semana)} nuevas esta semana`} />
        <Tile etiqueta="Activas (30 días)" valor={numero(usuarios.activos_30d)}
          detalle={usuarios.total ? `${Math.round((usuarios.activos_30d / usuarios.total) * 100)}% del total` : null} />
        <Tile etiqueta="Vecinos" valor={numero(usuarios.vecinos)} />
        <Tile etiqueta="Funcionarios" valor={numero(usuarios.funcionarios)}
          detalle={usuarios.solicitudes ? `${numero(usuarios.solicitudes)} solicitudes por revisar` : 'Sin solicitudes pendientes'} />
        <Tile etiqueta="Administradores" valor={numero(usuarios.admins)} />
        <Tile etiqueta="Sin participación" valor={numero(usuarios.sin_actividad)}
          detalle="No pidieron, firmaron ni publicaron" />
      </div>

      <div className="estadisticas-grid">
        <TarjetaGrafico
          className="ancho-7"
          titulo="Moderación de peticiones"
          subtitulo="Todas las peticiones, según su estado"
          columnas={['Estado', 'Peticiones']}
          filas={ESTADOS.map((e) => [e.nombre, numero(datos.estados[e.clave])])}
        >
          <Proporcion partes={ESTADOS.map((e) => ({ ...e, valor: datos.estados[e.clave] }))} />

          <div className="tiles mt-4 mb-0">
            <Tile etiqueta="Tiempo promedio de revisión" valor={horas(moderacion.horas_promedio)}
              detalle="Desde que se crea hasta que se publica o rechaza" />
            <Tile etiqueta="Pendiente más antigua"
              valor={moderacion.pendiente_mas_antigua ? tiempoRelativo(moderacion.pendiente_mas_antigua) : 'Ninguna'}
              detalle={datos.estados.pendiente ? (
                <Link to="/admin/peticiones">Ir a moderación</Link>
              ) : 'Todo al día'} />
          </div>
        </TarjetaGrafico>

        <TarjetaGrafico
          className="ancho-5"
          titulo="Pendientes por barrio"
          subtitulo="Dónde se acumulan las peticiones sin revisar"
          columnas={['Barrio', 'Pendientes']}
          filas={datos.pendientes_por_barrio.map((b) => [b.nombre, numero(b.cantidad)])}
        >
          <Barras
            vacio="No hay peticiones pendientes."
            datos={datos.pendientes_por_barrio.map((b) => ({ etiqueta: b.nombre, valor: b.cantidad }))}
          />
        </TarjetaGrafico>

        <TarjetaGrafico
          className="ancho-6"
          titulo="Cuentas nuevas por semana"
          subtitulo="Últimas 12 semanas"
          columnas={['Semana', 'Registros']}
          filas={registros.map((s) => [s.titulo, numero(s.valor)])}
        >
          <Columnas datos={registros} cadaEtiqueta={2} />
        </TarjetaGrafico>

        <TarjetaGrafico
          className="ancho-6"
          titulo="Firmas por día"
          subtitulo={`Últimos 30 días · ${numero(totalFirmasMes)} firmas en total`}
          columnas={['Día', 'Firmas']}
          filas={firmasDia.map((d) => [d.titulo, numero(d.valor)])}
        >
          <Columnas datos={firmasDia} cadaEtiqueta={7} />
        </TarjetaGrafico>

        <TarjetaGrafico
          className="ancho-6"
          titulo="Muro vecinal por barrio"
          subtitulo="Experiencias positivas y problemas publicados"
          leyenda={SERIES_MURO}
          columnas={['Barrio', 'Positivas', 'Problemas']}
          filas={datos.feed_por_barrio.map((b) => [b.nombre, numero(b.positivo), numero(b.negativo)])}
        >
          <BarrasApiladas datos={datos.feed_por_barrio.slice(0, 10).map((b) => ({ ...b, etiqueta: b.nombre }))}
            series={SERIES_MURO} />
        </TarjetaGrafico>

        <TarjetaGrafico
          className="ancho-6"
          titulo="Urgencia promedio por barrio"
          subtitulo="Puntaje de 0 a 100 de las peticiones activas"
          columnas={['Barrio', 'Urgencia promedio', 'Peticiones']}
          filas={(publicas?.por_barrio ?? []).filter((b) => b.cantidad > 0)
            .map((b) => [b.nombre, `${b.urgencia_promedio}/100`, numero(b.cantidad)])}
        >
          <Barras
            datos={(publicas?.por_barrio ?? [])
              .filter((b) => b.cantidad > 0)
              .sort((a, b) => b.urgencia_promedio - a.urgencia_promedio)
              .slice(0, 10)
              .map((b) => ({
                etiqueta: b.nombre,
                valor: b.urgencia_promedio,
                detalle: `${numero(b.cantidad)} peticiones activas`,
              }))}
          />
        </TarjetaGrafico>

        <section className="panel grafico-tarjeta">
          <header className="grafico-head">
            <div>
              <h2>Personas más activas</h2>
              <p>Peticiones creadas, firmas y publicaciones de cada cuenta</p>
            </div>
            <Link className="grafico-toggle" to="/admin/usuarios">Ver directorio</Link>
          </header>

          {datos.top_usuarios.length === 0 ? (
            <p className="grafico-vacio">Todavía no hay actividad.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm mb-0 tabla-activos">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th className="text-end">Peticiones</th>
                    <th className="text-end">Firmas</th>
                    <th className="text-end">Publicaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.top_usuarios.map((u) => (
                    <tr key={u.email}>
                      <td>{u.nombre} {u.apellido}</td>
                      <td>{u.email}</td>
                      <td>{nombreRol(u.rol)}</td>
                      <td className="text-end">{numero(u.peticiones)}</td>
                      <td className="text-end">{numero(u.firmas)}</td>
                      <td className="text-end">{numero(u.publicaciones)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default EstadisticasAdmin
