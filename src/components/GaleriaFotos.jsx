import { useEffect, useState } from 'react'
import { urlFotoPeticion } from '../services/petitionService'
import Icon from './Icon'

const CLASE_POR_CANTIDAD = { 1: 'una', 2: 'dos' }

// Fotos de una petición; al tocar una se abre el visor a pantalla completa.
// miniaturas: fotos chicas en fila (paneles de revisión), el visor no cambia.
function GaleriaFotos({ rutas = [], miniaturas = false }) {
  const [abierta, setAbierta] = useState(null)

  const total = rutas.length

  useEffect(() => {
    if (abierta === null) return

    const alTeclear = (e) => {
      if (e.key === 'Escape') setAbierta(null)
      if (e.key === 'ArrowRight') setAbierta((i) => (i + 1) % total)
      if (e.key === 'ArrowLeft') setAbierta((i) => (i - 1 + total) % total)
    }

    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [abierta, total])

  if (total === 0) return null

  return (
    <>
      <div className={miniaturas ? 'galeria-miniaturas' : `galeria ${CLASE_POR_CANTIDAD[total] ?? ''}`}>
        {rutas.map((ruta, indice) => (
          <button
            type="button"
            key={ruta}
            onClick={() => setAbierta(indice)}
            aria-label={`Ver foto ${indice + 1} de ${total}`}
          >
            <img src={urlFotoPeticion(ruta)} alt="" loading="lazy" />
          </button>
        ))}
      </div>

      {abierta !== null && (
        <div
          className="visor"
          role="dialog"
          aria-label="Foto ampliada"
          onClick={() => setAbierta(null)}
        >
          <img
            src={urlFotoPeticion(rutas[abierta])}
            alt={`Foto ${abierta + 1} de ${total}`}
            onClick={(e) => e.stopPropagation()}
          />

          <button
            type="button"
            className="visor-boton visor-cerrar"
            onClick={() => setAbierta(null)}
            aria-label="Cerrar"
          >
            <Icon name="close" size={20} />
          </button>

          {total > 1 && (
            <>
              <button
                type="button"
                className="visor-boton visor-anterior"
                onClick={(e) => {
                  e.stopPropagation()
                  setAbierta((abierta - 1 + total) % total)
                }}
                aria-label="Foto anterior"
              >
                <Icon name="chevron" size={22} />
              </button>

              <button
                type="button"
                className="visor-boton visor-siguiente"
                onClick={(e) => {
                  e.stopPropagation()
                  setAbierta((abierta + 1) % total)
                }}
                aria-label="Foto siguiente"
              >
                <Icon name="chevron" size={22} />
              </button>

              <span className="visor-contador">{abierta + 1} / {total}</span>
            </>
          )}
        </div>
      )}
    </>
  )
}

export default GaleriaFotos
