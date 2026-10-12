import { useState } from 'react'
import { numero } from '../utils/format'

// Piezas de gráficos en HTML simple (sin librerías): barras, columnas,
// barras apiladas y tarjetas de números. Todas comparten estas reglas:
// - una sola serie va en un solo color; dos series llevan leyenda;
// - el tooltip suma detalle, pero cada valor también está en la tabla;
// - el texto usa los colores de texto, nunca el de la serie.

// Tarjeta con el gráfico y un botón para verlo como tabla
export function TarjetaGrafico({ titulo, subtitulo, columnas, filas, leyenda, children, className = '' }) {
  const [verTabla, setVerTabla] = useState(false)

  return (
    <section className={`panel grafico-tarjeta ${className}`}>
      <header className="grafico-head">
        <div>
          <h2>{titulo}</h2>
          {subtitulo && <p>{subtitulo}</p>}
        </div>

        {filas && (
          <button
            type="button"
            className="grafico-toggle"
            onClick={() => setVerTabla((v) => !v)}
            aria-pressed={verTabla}
          >
            {verTabla ? 'Ver gráfico' : 'Ver tabla'}
          </button>
        )}
      </header>

      {leyenda && !verTabla && (
        <div className="grafico-leyenda">
          {leyenda.map(({ nombre, color }) => (
            <span key={nombre}><i style={{ background: color }} />{nombre}</span>
          ))}
        </div>
      )}

      {verTabla ? (
        <div className="grafico-tabla">
          <table className="table table-sm mb-0">
            <thead>
              <tr>{columnas.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {filas.map((fila, i) => (
                <tr key={i}>{fila.map((celda, j) => <td key={j}>{celda}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : children}
    </section>
  )
}

export function Tile({ valor, etiqueta, detalle }) {
  return (
    <div className="panel stat-tile">
      <span className="stat-tile-etiqueta">{etiqueta}</span>
      <strong>{valor}</strong>
      {detalle && <small>{detalle}</small>}
    </div>
  )
}

// Barras horizontales de una sola serie, con el valor al final de cada barra
export function Barras({ datos, color = 'var(--serie-1)', vacio = 'Sin datos todavía.' }) {
  const [activo, setActivo] = useState(null)
  const maximo = Math.max(1, ...datos.map((d) => d.valor))

  if (datos.length === 0) return <p className="grafico-vacio">{vacio}</p>

  return (
    <div className="barras" onMouseLeave={() => setActivo(null)}>
      {datos.map((d, i) => (
        <div
          key={d.etiqueta}
          className={`barras-fila${activo === i ? ' activa' : ''}`}
          tabIndex={0}
          onMouseEnter={() => setActivo(i)}
          onFocus={() => setActivo(i)}
          onBlur={() => setActivo(null)}
        >
          <span className="barras-etiqueta">{d.etiqueta}</span>
          <span className="barras-pista">
            <span
              className="barras-barra"
              style={{ width: `${(d.valor / maximo) * 100}%`, background: color }}
            />
            <span className="barras-valor">{numero(d.valor)}</span>
          </span>

          {activo === i && d.detalle && (
            <span className="grafico-tooltip" role="tooltip">
              <strong>{d.etiqueta}</strong>
              {d.detalle}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// Columnas verticales para series en el tiempo (una sola serie)
export function Columnas({ datos, color = 'var(--serie-1)', alto = 180, cadaEtiqueta = 1 }) {
  const [activo, setActivo] = useState(null)
  const maximo = Math.max(1, ...datos.map((d) => d.valor))

  // Marcas del eje: 0, la mitad y el máximo redondeados a enteros
  const tope = Math.max(1, Math.ceil(maximo))
  const marcas = [...new Set([tope, Math.round(tope / 2), 0])]

  return (
    <div className="columnas" style={{ '--alto': `${alto}px` }} onMouseLeave={() => setActivo(null)}>
      <div className="columnas-eje">
        {marcas.map((m) => (
          <span key={m} style={{ bottom: `${(m / tope) * 100}%` }}>{numero(m)}</span>
        ))}
      </div>

      <div className="columnas-plot">
        {marcas.map((m) => (
          <i key={m} className="columnas-guia" style={{ bottom: `${(m / tope) * 100}%` }} />
        ))}

        {datos.map((d, i) => (
          <div
            key={d.clave ?? d.etiqueta}
            className={`columnas-col${activo === i ? ' activa' : ''}`}
            tabIndex={0}
            onMouseEnter={() => setActivo(i)}
            onFocus={() => setActivo(i)}
            onBlur={() => setActivo(null)}
          >
            <span
              className="columnas-barra"
              style={{ height: `${(d.valor / tope) * 100}%`, background: color }}
            />

            {activo === i && (
              <span className="grafico-tooltip" role="tooltip">
                <strong>{d.titulo ?? d.etiqueta}</strong>
                {numero(d.valor)} {d.unidad ?? ''}
              </span>
            )}

            <span className="columnas-x">
              {i % cadaEtiqueta === 0 || (i === datos.length - 1 && i % cadaEtiqueta > cadaEtiqueta / 2) ? d.etiqueta : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Barras horizontales apiladas: varias series que suman un total por fila
export function BarrasApiladas({ datos, series }) {
  const [activo, setActivo] = useState(null)
  const total = (d) => series.reduce((t, s) => t + (d[s.clave] ?? 0), 0)
  const maximo = Math.max(1, ...datos.map(total))

  if (datos.length === 0) return <p className="grafico-vacio">Sin datos todavía.</p>

  return (
    <div className="barras" onMouseLeave={() => setActivo(null)}>
      {datos.map((d, i) => (
        <div
          key={d.etiqueta}
          className={`barras-fila${activo === i ? ' activa' : ''}`}
          tabIndex={0}
          onMouseEnter={() => setActivo(i)}
          onFocus={() => setActivo(i)}
          onBlur={() => setActivo(null)}
        >
          <span className="barras-etiqueta">{d.etiqueta}</span>
          <span className="barras-pista">
            <span className="barras-pila" style={{ width: `${(total(d) / maximo) * 100}%` }}>
              {series.map((s) => (d[s.clave] ?? 0) > 0 && (
                <span
                  key={s.clave}
                  className="barras-barra"
                  style={{ flexGrow: d[s.clave], background: s.color }}
                />
              ))}
            </span>
            <span className="barras-valor">{numero(total(d))}</span>
          </span>

          {activo === i && (
            <span className="grafico-tooltip" role="tooltip">
              <strong>{d.etiqueta}</strong>
              {series.map((s) => (
                <span key={s.clave} className="grafico-tooltip-serie">
                  <i style={{ background: s.color }} />
                  {s.nombre}: {numero(d[s.clave] ?? 0)}
                </span>
              ))}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// Una sola barra repartida en partes (parte de un todo, pocas partes)
export function Proporcion({ partes }) {
  const total = partes.reduce((t, p) => t + p.valor, 0)

  return (
    <div className="proporcion">
      <div className="proporcion-barra">
        {total > 0 && partes.filter((p) => p.valor > 0).map((p) => (
          <span
            key={p.nombre}
            style={{ flexGrow: p.valor, background: p.color }}
            title={`${p.nombre}: ${numero(p.valor)}`}
          />
        ))}
      </div>

      <div className="proporcion-items">
        {partes.map((p) => (
          <span key={p.nombre}>
            <i style={{ background: p.color }} />
            {p.icono}
            {p.nombre}
            <strong>{numero(p.valor)}</strong>
            <small>{total > 0 ? Math.round((p.valor / total) * 100) : 0}%</small>
          </span>
        ))}
      </div>
    </div>
  )
}
