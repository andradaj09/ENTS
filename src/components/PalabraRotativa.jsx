import { useEffect, useState } from 'react'

const PALABRAS = ['más cerca', 'más seguro', 'más limpio', 'más unido']

// Palabra que cambia cada pocos segundos con una animación de entrada
function PalabraRotativa() {
  const [indice, setIndice] = useState(0)

  useEffect(() => {
    const intervalo = setInterval(() => {
      setIndice((i) => (i + 1) % PALABRAS.length)
    }, 2600)

    return () => clearInterval(intervalo)
  }, [])

  return (
    <span className="palabra-slot">
      <span className="palabra" key={indice}>
        {PALABRAS[indice]}.
      </span>
    </span>
  )
}

export default PalabraRotativa
