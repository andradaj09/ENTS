import { useEffect, useState } from 'react'
import {
  getCategorias,
  getZonas,
  updatePeticion,
} from '../services/petitionService'
import Icon from './Icon'

const ESTADOS = [
  ['pendiente', 'Pendiente de revisión'],
  ['publicada', 'Publicada'],
  ['rechazada', 'Rechazada'],
]

// Ventana para que un moderador corrija una petición
function EditarPeticion({ peticion, onGuardado, onCerrar }) {
  const [categorias, setCategorias] = useState([])
  const [zonas, setZonas] = useState([])
  const [form, setForm] = useState({
    titulo: peticion.titulo,
    descripcion: peticion.descripcion,
    categoria_id: String(peticion.categorias?.id ?? ''),
    zona_id: String(peticion.zonas?.id ?? ''),
    estado: peticion.estado,
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getCategorias(), getZonas()])
      .then(([categoriasData, zonasData]) => {
        setCategorias(categoriasData)
        setZonas(zonasData)
      })
      .catch((err) => {
        console.error(err)
        setError('No se pudieron cargar las categorías y barrios.')
      })
  }, [])

  useEffect(() => {
    const alEscape = (e) => {
      if (e.key === 'Escape') onCerrar()
    }

    document.addEventListener('keydown', alEscape)
    return () => document.removeEventListener('keydown', alEscape)
  }, [onCerrar])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    setGuardando(true)
    setError('')

    try {
      const actualizada = await updatePeticion(peticion.id, {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        categoria_id: Number(form.categoria_id),
        zona_id: Number(form.zona_id),
        estado: form.estado,
      })

      onGuardado(actualizada)
    } catch (err) {
      console.error('Error editando petición:', err)
      setError('No se pudieron guardar los cambios.')
      setGuardando(false)
    }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <form
        className="modal-panel"
        role="dialog"
        aria-label="Editar petición"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className="modal-head">
          <div>
            <span className="eyebrow">Moderación</span>
            <h2>Editar petición</h2>
          </div>

          <button type="button" className="icon-btn" onClick={onCerrar} aria-label="Cerrar">
            <Icon name="close" size={20} />
          </button>
        </header>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="mb-3">
          <label className="form-label">Título</label>
          <input
            className="form-control"
            name="titulo"
            value={form.titulo}
            onChange={handleChange}
            maxLength="200"
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Descripción</label>
          <textarea
            className="form-control"
            name="descripcion"
            rows="5"
            value={form.descripcion}
            onChange={handleChange}
            required
          />
        </div>

        <div className="row">
          <div className="col-md-4 mb-3">
            <label className="form-label">Categoría</label>
            <select
              className="form-select"
              name="categoria_id"
              value={form.categoria_id}
              onChange={handleChange}
              required
            >
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
              ))}
            </select>
          </div>

          <div className="col-md-4 mb-3">
            <label className="form-label">Barrio</label>
            <select
              className="form-select"
              name="zona_id"
              value={form.zona_id}
              onChange={handleChange}
              required
            >
              {zonas.map((zona) => (
                <option key={zona.id} value={zona.id}>{zona.nombre}</option>
              ))}
            </select>
          </div>

          <div className="col-md-4 mb-4">
            <label className="form-label">Estado</label>
            <select
              className="form-select"
              name="estado"
              value={form.estado}
              onChange={handleChange}
            >
              {ESTADOS.map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>{etiqueta}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn btn-dark" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default EditarPeticion
