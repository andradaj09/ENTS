import { useState } from 'react'
import { aplicarTema, temaActual } from '../utils/tema'
import Icon from './Icon'

// Burbuja de la barra superior para pasar de modo claro a oscuro y viceversa.
// Muestra el ícono del modo al que se va a cambiar (luna en claro, sol en oscuro).
function BotonTema() {
  const [tema, setTema] = useState(temaActual)
  const oscuro = tema === 'oscuro'

  const alternar = () => {
    const nuevo = oscuro ? 'claro' : 'oscuro'
    aplicarTema(nuevo)
    setTema(nuevo)
  }

  return (
    <button
      type="button"
      className="topbar-burbuja boton-tema"
      onClick={alternar}
      aria-pressed={oscuro}
      aria-label={oscuro ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={oscuro ? 'Modo claro' : 'Modo oscuro'}
    >
      <Icon name={oscuro ? 'sun' : 'moon'} size={22} />
    </button>
  )
}

export default BotonTema
