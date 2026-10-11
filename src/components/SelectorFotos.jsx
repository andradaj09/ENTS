import { useEffect, useRef, useState } from 'react'
import { comprimirImagen, MAXIMO_FOTOS } from '../utils/imagenes'
import Icon from './Icon'

// Permite elegir hasta 3 fotos (clic o arrastrar). Las comprime en el
// navegador y avisa al padre con la lista de archivos listos para subir.
function SelectorFotos({ onChange }) {
  const [fotos, setFotos] = useState([])
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [arrastrando, setArrastrando] = useState(false)
  const inputRef = useRef(null)
  const fotosRef = useRef(fotos)

  useEffect(() => {
    fotosRef.current = fotos
  }, [fotos])

  // Libera las vistas previas al salir de la página
  useEffect(() => () => {
    fotosRef.current.forEach((foto) => URL.revokeObjectURL(foto.url))
  }, [])

  const actualizar = (nuevas) => {
    setFotos(nuevas)
    onChange(nuevas.map((foto) => foto.blob))
  }

  const agregar = async (archivos) => {
    const lugares = MAXIMO_FOTOS - fotos.length
    if (lugares <= 0) return

    const elegidos = [...archivos].slice(0, lugares)
    setError(archivos.length > lugares ? `Podés agregar hasta ${MAXIMO_FOTOS} fotos.` : '')
    setProcesando(true)

    const nuevas = []

    for (const archivo of elegidos) {
      try {
        const blob = await comprimirImagen(archivo)
        nuevas.push({ id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) })
      } catch (err) {
        setError(err.message)
      }
    }

    setProcesando(false)
    actualizar([...fotos, ...nuevas])
  }

  const quitar = (id) => {
    const foto = fotos.find((f) => f.id === id)
    if (foto) URL.revokeObjectURL(foto.url)

    actualizar(fotos.filter((f) => f.id !== id))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setArrastrando(false)
    agregar(e.dataTransfer.files)
  }

  return (
    <div className="selector-fotos">
      <div className="selector-fotos-grilla">
        {fotos.map((foto, indice) => (
          <figure className="selector-foto" key={foto.id}>
            <img src={foto.url} alt={`Foto ${indice + 1}`} />
            {indice === 0 && <span className="selector-foto-portada">Portada</span>}
            <button
              type="button"
              onClick={() => quitar(foto.id)}
              aria-label={`Quitar foto ${indice + 1}`}
            >
              <Icon name="close" size={14} />
            </button>
          </figure>
        ))}

        {fotos.length < MAXIMO_FOTOS && (
          <button
            type="button"
            className={`selector-fotos-agregar${arrastrando ? ' arrastrando' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setArrastrando(true)
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={handleDrop}
            disabled={procesando}
          >
            {procesando ? (
              <span className="selector-fotos-cargando" />
            ) : (
              <Icon name="image" size={24} />
            )}
            <span>{procesando ? 'Procesando...' : 'Agregar foto'}</span>
            <small>{fotos.length}/{MAXIMO_FOTOS}</small>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          agregar(e.target.files)
          e.target.value = ''
        }}
      />

      {error && <p className="selector-fotos-error">{error}</p>}
    </div>
  )
}

export default SelectorFotos
