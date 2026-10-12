import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePermisos } from '../hooks/usePermisos'
import {
  borrarDocumento,
  enlaceDocumento,
  listarDocumentos,
  subirDocumento,
} from '../services/participacionService'
import Icon from '../components/Icon'

const formatoFecha = (fecha) =>
  fecha ? new Date(fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—'

const formatoTamanio = (bytes) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`

// "01_project_charter.pdf" → "Project charter"
const nombreLegible = (archivo) => {
  const base = archivo.replace(/\.pdf$/i, '').replace(/^\d+[_-]/, '').replace(/[_-]+/g, ' ')
  return base.charAt(0).toUpperCase() + base.slice(1)
}

// Documentos del trabajo práctico (entregables). Por defecto solo el dueño;
// él puede habilitarlos a otros rangos en Permisos. El menú, la ruta y el
// almacenamiento verifican el permiso.
function Documentos() {
  const { user } = useAuth()
  const { puede, listo } = usePermisos(user?.id)
  const puedeVer = puede('documentos')
  const puedeModificar = puede('documentos', 'modificar')

  const [documentos, setDocumentos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')

  const cargar = useCallback(() => {
    listarDocumentos()
      .then(setDocumentos)
      .catch((err) => {
        console.error('Error cargando documentos:', err)
        setError('No se pudieron cargar los documentos.')
      })
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => {
    if (puedeVer) cargar()
  }, [puedeVer, cargar])

  if (listo && !puedeVer) {
    return <Navigate to="/" replace />
  }

  const abrir = async (nombre) => {
    // Se abre la pestaña antes de esperar (si no, el navegador la bloquea)
    const pestania = window.open('', '_blank')

    try {
      const url = await enlaceDocumento(nombre)
      if (pestania) pestania.location.href = url
      else window.open(url, '_blank')
    } catch (err) {
      pestania?.close()
      console.error('Error abriendo documento:', err)
      setError('No se pudo abrir el documento.')
    }
  }

  const subir = async (e) => {
    const archivos = [...(e.target.files ?? [])]
    e.target.value = ''
    if (archivos.length === 0) return

    setSubiendo(true)
    setError('')

    try {
      for (const archivo of archivos) {
        if (archivo.type !== 'application/pdf') throw new Error('Solo se aceptan archivos PDF.')
        await subirDocumento(archivo)
      }
      cargar()
    } catch (err) {
      console.error('Error subiendo documento:', err)
      setError(err.message?.startsWith('Solo') ? err.message : 'No se pudo subir el documento.')
    } finally {
      setSubiendo(false)
    }
  }

  const borrar = async (nombre) => {
    if (!window.confirm(`¿Borrar "${nombreLegible(nombre)}"?`)) return

    try {
      await borrarDocumento(nombre)
      setDocumentos((actuales) => actuales.filter((d) => d.name !== nombre))
    } catch (err) {
      console.error('Error borrando documento:', err)
      setError('No se pudo borrar el documento.')
    }
  }

  return (
    <div className="container py-5">
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
        <div>
          <span className="eyebrow">Privado</span>
          <h1 className="page-title mb-1">Documentos del proyecto</h1>
          <p className="text-muted mb-0">
            Entregables del trabajo práctico. Se guardan en un espacio privado: solo los ven los rangos habilitados en Permisos.
          </p>
        </div>

        {puedeModificar && (
          <label className="btn btn-dark mb-0">
            <Icon name="plus" size={16} className="me-2" />
            {subiendo ? 'Subiendo...' : 'Subir PDF'}
            <input type="file" accept="application/pdf" multiple hidden onChange={subir} disabled={subiendo} />
          </label>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {(cargando || !listo) && <p className="text-muted">Cargando documentos...</p>}

      {!cargando && documentos.length === 0 && (
        <div className="empty-state">
          <p className="text-muted mb-0">Todavía no hay documentos. Subí el primero con "Subir PDF".</p>
        </div>
      )}

      <ul className="documentos-lista">
        {documentos.map((doc) => (
          <li key={doc.name}>
            <button type="button" className="documento-abrir" onClick={() => abrir(doc.name)}>
              <span className="icon-chip"><Icon name="file" size={20} /></span>
              <span className="documento-texto">
                <strong>{nombreLegible(doc.name)}</strong>
                <small>
                  {doc.metadata?.size ? formatoTamanio(doc.metadata.size) : ''} · Actualizado {formatoFecha(doc.updated_at ?? doc.created_at)}
                </small>
              </span>
              <Icon name="arrow" size={18} />
            </button>
            {puedeModificar && (
              <button
                type="button"
                className="icon-btn"
                onClick={() => borrar(doc.name)}
                aria-label={`Borrar ${nombreLegible(doc.name)}`}
              >
                <Icon name="trash" size={18} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Documentos
