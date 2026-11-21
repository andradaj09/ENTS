import { useEffect, useRef } from 'react'

// Figuras geométricas (solo líneas rectas) que flotan detrás del contenido
const FIGURAS = [
  { tipo: 'triangulo', color: '#2f6fb5', top: '12%', left: '9%', size: 120, delay: '0s', depth: 30 },
  { tipo: 'cuadrado', color: '#121212', top: '68%', left: '13%', size: 70, delay: '-4s', depth: 18 },
  { tipo: 'pentagono', color: '#5dbb8a', top: '18%', left: '80%', size: 110, delay: '-8s', depth: 26 },
  { tipo: 'rombo', color: '#d4573f', top: '72%', left: '78%', size: 90, delay: '-2s', depth: 22 },
  { tipo: 'cruz', color: '#121212', top: '42%', left: '90%', size: 46, delay: '-6s', depth: 12 },
  { tipo: 'triangulo', color: '#edb54f', top: '80%', left: '30%', size: 64, delay: '-10s', depth: 14 },
]

const PUNTOS = {
  triangulo: '50,6 94,90 6,90',
  cuadrado: '10,10 90,10 90,90 10,90',
  pentagono: '50,4 96,38 78,94 22,94 4,38',
  rombo: '50,4 96,50 50,96 4,50',
  cruz: '36,0 64,0 64,36 100,36 100,64 64,64 64,100 36,100 36,64 0,64 0,36 36,36',
}

// fijo: queda detrás de toda la ventana mientras se hace scroll (dashboard)
// suave: figuras más tenues para no competir con el contenido
function FondoAnimado({ fijo = false, suave = false }) {
  const fondoRef = useRef(null)

  // Paralaje: las figuras siguen levemente al puntero (sin re-render).
  // Se actualiza como máximo una vez por fotograma.
  useEffect(() => {
    let cuadro = null
    let ultimoEvento = null

    const aplicar = () => {
      cuadro = null
      if (!fondoRef.current || !ultimoEvento) return

      const x = ultimoEvento.clientX / window.innerWidth - 0.5
      const y = ultimoEvento.clientY / window.innerHeight - 0.5

      fondoRef.current.style.setProperty('--mx', x.toFixed(3))
      fondoRef.current.style.setProperty('--my', y.toFixed(3))
    }

    const handlePointerMove = (e) => {
      ultimoEvento = e
      if (cuadro === null) cuadro = requestAnimationFrame(aplicar)
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      if (cuadro !== null) cancelAnimationFrame(cuadro)
    }
  }, [])

  const clases = [
    'fondo',
    fijo && 'fondo-fijo',
    suave && 'fondo-suave',
  ].filter(Boolean).join(' ')

  return (
    <div className={clases} ref={fondoRef} aria-hidden="true">
      <div className="fondo-blob blob-1" />
      <div className="fondo-blob blob-2" />
      <div className="fondo-blob blob-3" />
      <div className="fondo-blob blob-4" />
      <div className="fondo-grid" />

      {FIGURAS.map((figura, indice) => (
        <div
          key={indice}
          className="fondo-figura"
          style={{
            top: figura.top,
            left: figura.left,
            width: figura.size,
            height: figura.size,
            '--depth': figura.depth,
            '--delay': figura.delay,
          }}
        >
          <svg viewBox="0 0 100 100">
            <polygon points={PUNTOS[figura.tipo]} fill={figura.color} />
          </svg>
        </div>
      ))}
    </div>
  )
}

export default FondoAnimado
