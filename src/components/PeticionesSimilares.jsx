import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { buscarSimilares } from '../services/participacionService'
import Icon from './Icon'

// Mientras la persona escribe, busca peticiones publicadas parecidas (por
// texto y cercanía). Si ya existe, conviene firmarla en lugar de repetirla:
// así las firmas se suman en un solo pedido y sube su prioridad.
function PeticionesSimilares({ texto, ubicacion }) {
  const [resultado, setResultado] = useState({ consulta: '', similares: [] })
  const consulta = texto.trim()

  useEffect(() => {
    if (consulta.length < 8) return

    let activo = true

    // Espera a que la persona deje de escribir un momento
    const espera = setTimeout(() => {
      buscarSimilares(consulta, ubicacion)
        .then((similares) => activo && setResultado({ consulta, similares }))
        .catch((err) => console.error('Error buscando similares:', err))
    }, 600)

    return () => {
      activo = false
      clearTimeout(espera)
    }
  }, [consulta, ubicacion])

  // Con poco texto no se muestra nada (sin pisar el estado dentro del efecto)
  const similares = consulta.length < 8 ? [] : resultado.similares
  if (similares.length === 0) return null

  return (
    <div className="similares" role="status">
      <p className="similares-titulo">
        <Icon name="alert" size={16} />
        ¿Es alguno de estos? Si ya existe, firmalo: las firmas juntas suben su prioridad.
      </p>

      <ul>
        {similares.map((p) => (
          <li key={p.id}>
            <Link to={`/peticiones/${p.id}`} target="_blank" rel="noreferrer">
              <strong>{p.titulo}</strong>
              <span>
                {p.barrio ?? 'Sin barrio'} · {p.firmas} {p.firmas === 1 ? 'firma' : 'firmas'}
                {p.distancia_m != null && p.distancia_m < 2000 && ` · a ${p.distancia_m} m`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default PeticionesSimilares
