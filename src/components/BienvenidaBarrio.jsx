import { useEffect, useRef } from 'react'
import ElegirBarrio from './ElegirBarrio'
import Icon from './Icon'
import { omitirBarrio } from '../utils/barrioVecino'

// Ventana del primer ingreso: "¿De qué barrio sos?". Se puede saltear;
// el inicio sigue mostrando un recordatorio hasta que lo elija.
function BienvenidaBarrio({ usuarioId, onCerrar }) {
  const ventana = useRef(null)

  const omitir = () => {
    omitirBarrio(usuarioId)
    onCerrar()
  }

  // Al abrir, el foco va a la lista de barrios
  useEffect(() => {
    ventana.current?.querySelector('select')?.focus()
  }, [])

  // Escape equivale a "Elegir después"
  useEffect(() => {
    const alEscape = (e) => {
      if (e.key !== 'Escape') return
      omitirBarrio(usuarioId)
      onCerrar()
    }
    document.addEventListener('keydown', alEscape)
    return () => document.removeEventListener('keydown', alEscape)
  }, [usuarioId, onCerrar])

  return (
    <div className="bienvenida-fondo" role="dialog" aria-modal="true" aria-labelledby="bienvenida-titulo">
      <div className="bienvenida-ventana panel" ref={ventana}>
        <span className="icon-chip dark mb-3"><Icon name="map" /></span>
        <h2 id="bienvenida-titulo">¿De qué barrio sos?</h2>
        <p className="text-muted">
          Te mostramos primero lo que pasa en tu barrio y te avisamos de las peticiones nuevas.
          Tu barrio no se muestra a otros vecinos.
        </p>

        <ElegirBarrio onListo={onCerrar} textoBoton="Listo" />

        <button type="button" className="bienvenida-omitir" onClick={omitir}>
          Elegir después
        </button>
      </div>
    </div>
  )
}

export default BienvenidaBarrio
