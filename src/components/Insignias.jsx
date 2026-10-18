import { useEffect, useState } from 'react'
import { getLogros } from '../services/participacionService'
import Icon from './Icon'

// Reconocimientos por participar. Solo los ve cada persona en su perfil:
// entre vecinos todo sigue siendo anónimo.
const INSIGNIAS = [
  { clave: 'primera', nombre: 'Primera petición', icono: 'flag', meta: 1, valor: (l) => l.peticiones, detalle: 'Creá tu primera petición' },
  { clave: 'voz', nombre: 'Voz del barrio', icono: 'megaphone', meta: 3, valor: (l) => l.publicadas, detalle: 'Publicá 3 peticiones' },
  { clave: 'firmante', nombre: 'Firmante', icono: 'pen', meta: 5, valor: (l) => l.firmas, detalle: 'Firmá 5 peticiones' },
  { clave: 'apoyo', nombre: 'Gran apoyo', icono: 'up', meta: 20, valor: (l) => l.firmas, detalle: 'Firmá 20 peticiones' },
  { clave: 'ciudad', nombre: 'Recorre la ciudad', icono: 'map', meta: 3, valor: (l) => l.barrios, detalle: 'Apoyá pedidos de 3 barrios distintos' },
  { clave: 'activo', nombre: 'Vecino activo', icono: 'users', meta: 5, valor: (l) => l.publicaciones + l.comentarios, detalle: 'Publicá o comentá 5 veces' },
  { clave: 'elevada', nombre: 'Llegó al municipio', icono: 'shield', meta: 1, valor: (l) => l.elevadas, detalle: 'Que una petición tuya llegue a la meta de firmas' },
  { clave: 'resuelta', nombre: 'Problema resuelto', icono: 'check', meta: 1, valor: (l) => l.resueltas + l.firmas_resueltas, detalle: 'Que se resuelva una petición que creaste o firmaste' },
  // Usa el nombre del barrio propio; sin barrio elegido, invita a elegirlo
  {
    clave: 'mi-barrio',
    nombre: (l) => (l.mi_barrio ? `Vecino/a activo/a de ${l.mi_barrio}` : 'Vecino/a de tu barrio'),
    icono: 'home', meta: 5, valor: (l) => l.en_mi_barrio ?? 0,
    detalle: (l) => (l.mi_barrio ? `Pedí o firmá 5 veces en ${l.mi_barrio}` : 'Elegí tu barrio en el perfil'),
  },
]

const texto = (valor, logros) => (typeof valor === 'function' ? valor(logros) : valor)

function Insignias() {
  const [logros, setLogros] = useState(null)

  useEffect(() => {
    getLogros().then(setLogros).catch((err) => console.error('Error cargando logros:', err))
  }, [])

  if (!logros) {
    return <p className="text-muted small mb-0">Cargando insignias...</p>
  }

  const conseguidas = INSIGNIAS.filter((i) => i.valor(logros) >= i.meta).length

  return (
    <>
      <p className="text-muted small">
        {conseguidas} de {INSIGNIAS.length} conseguidas. Solo vos las ves.
      </p>

      <ul className="insignias">
        {INSIGNIAS.map((insignia) => {
          const valor = Math.min(insignia.valor(logros), insignia.meta)
          const lograda = valor >= insignia.meta

          return (
            <li key={insignia.clave} className={lograda ? 'lograda' : ''}>
              <span className="insignia-icono"><Icon name={insignia.icono} size={20} /></span>
              <strong>{texto(insignia.nombre, logros)}</strong>
              <small>{lograda ? '¡Conseguida!' : `${texto(insignia.detalle, logros)} · ${valor}/${insignia.meta}`}</small>
            </li>
          )
        })}
      </ul>
    </>
  )
}

export default Insignias
