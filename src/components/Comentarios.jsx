import { useEffect, useState } from 'react'
import {
  borrarComentario,
  crearComentario,
  denunciarComentario,
  getComentarios,
  moderarComentario,
} from '../services/participacionService'
import { describirAlertas, revisarTexto, tieneDatosPersonales } from '../utils/moderacion'
import { tiempoRelativo } from '../utils/format'
import Icon from './Icon'

// Comentarios anónimos: cada vecino ve "Vecino/a" en lugar de nombres.
// Los admins ven el autor, las alertas automáticas y las denuncias.
function Comentarios({ peticion, usuarioId, esModerador }) {
  const [comentarios, setComentarios] = useState([])
  const [version, setVersion] = useState(0)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    let activo = true

    getComentarios(peticion.id)
      .then((datos) => activo && setComentarios(datos))
      .catch((err) => console.error('Error cargando comentarios:', err))

    return () => {
      activo = false
    }
  }, [peticion.id, version])

  const alertas = revisarTexto(texto)
  const bloqueado = tieneDatosPersonales(alertas)
  const abierta = peticion.estado === 'publicada'

  const enviar = async (e) => {
    e.preventDefault()
    if (!texto.trim() || bloqueado) return

    setEnviando(true)
    setAviso(null)

    try {
      await crearComentario({ peticionId: peticion.id, usuarioId, texto: texto.trim() })
      setAviso(
        alertas.includes('lenguaje')
          ? { tipo: 'info', texto: 'Tu comentario quedó en revisión porque podría tener lenguaje ofensivo.' }
          : null
      )
      setTexto('')
      setVersion((v) => v + 1)
    } catch (err) {
      console.error('Error comentando:', err)
      setAviso({
        tipo: 'danger',
        texto: err.hint === 'datos_personales'
          ? 'Por seguridad no se publican teléfonos, correos ni documentos.'
          : 'No se pudo publicar el comentario.',
      })
    } finally {
      setEnviando(false)
    }
  }

  const denunciar = async (comentario) => {
    const motivo = window.prompt('¿Por qué denunciás este comentario? (opcional)')
    if (motivo === null) return

    try {
      await denunciarComentario({ comentarioId: comentario.id, usuarioId, motivo: motivo.trim() })
      setAviso({ tipo: 'success', texto: 'Gracias. Un moderador va a revisar el comentario.' })
    } catch (err) {
      console.error('Error denunciando:', err)
      setAviso({ tipo: 'danger', texto: 'No se pudo enviar la denuncia.' })
    }
  }

  const borrar = async (comentario) => {
    if (!window.confirm('¿Borrar este comentario?')) return

    try {
      await borrarComentario(comentario.id)
      setComentarios((actuales) => actuales.filter((c) => c.id !== comentario.id))
    } catch (err) {
      console.error('Error borrando comentario:', err)
      setAviso({ tipo: 'danger', texto: 'No se pudo borrar el comentario.' })
    }
  }

  const alternarOculto = async (comentario) => {
    try {
      await moderarComentario(comentario.id, !comentario.oculto)
      setVersion((v) => v + 1)
    } catch (err) {
      console.error('Error moderando comentario:', err)
    }
  }

  return (
    <div className="card mb-4">
      <div className="card-body">
        <p className="line-label">Comentarios de vecinos ({comentarios.filter((c) => !c.oculto).length})</p>

        <p className="text-muted small">
          Sumá datos que ayuden a resolverla (desde cuándo pasa, en qué horario...).
          Los comentarios son anónimos.
        </p>

        {aviso && <div className={`alert alert-${aviso.tipo} py-2 small`}>{aviso.texto}</div>}

        {comentarios.length === 0 && (
          <p className="text-muted small">Todavía nadie comentó.</p>
        )}

        <ul className="comentarios">
          {comentarios.map((c) => (
            <li key={c.id} className={c.oculto ? 'oculto' : ''}>
              <div className="comentario-head">
                <strong>
                  <Icon name={c.propio ? 'user' : 'lock'} size={13} className="me-1" />
                  {c.propio ? 'Vos' : esModerador && c.autor ? c.autor : 'Vecino/a'}
                  {/* Solo si el autor activó mostrar su barrio en el perfil */}
                  {c.barrio_autor && <span className="comentario-barrio"> de {c.barrio_autor}</span>}
                </strong>
                <small>{tiempoRelativo(c.fecha)}</small>
              </div>

              <p>{c.texto}</p>

              {(c.oculto || (esModerador && (c.denuncias > 0 || c.alertas?.length > 0))) && (
                <p className="comentario-estado">
                  {c.oculto && 'Oculto para el resto · '}
                  {esModerador && c.denuncias > 0 && `${c.denuncias} denuncia${c.denuncias === 1 ? '' : 's'} · `}
                  {esModerador && c.alertas?.length > 0 && `Revisión automática: ${describirAlertas(c.alertas)}`}
                </p>
              )}

              <div className="comentario-acciones">
                {!c.propio && !esModerador && (
                  <button type="button" onClick={() => denunciar(c)}>
                    <Icon name="flag" size={13} /> Denunciar
                  </button>
                )}
                {esModerador && (
                  <button type="button" onClick={() => alternarOculto(c)}>
                    <Icon name="eye" size={13} /> {c.oculto ? 'Mostrar' : 'Ocultar'}
                  </button>
                )}
                {(c.propio || esModerador) && (
                  <button type="button" onClick={() => borrar(c)}>
                    <Icon name="trash" size={13} /> Borrar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        {abierta && usuarioId && (
          <form onSubmit={enviar} className="mt-3">
            <label htmlFor="nuevo-comentario" className="visually-hidden">Tu comentario</label>
            <textarea
              id="nuevo-comentario"
              className="form-control"
              rows="2"
              maxLength="500"
              placeholder="Escribí un comentario..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />

            {alertas.length > 0 && (
              <p className={`small mt-2 mb-0 ${bloqueado ? 'text-danger' : 'text-muted'}`}>
                {bloqueado
                  ? `Tu comentario tiene ${describirAlertas(alertas)}. Por seguridad no se publican datos personales.`
                  : `Tu comentario podría tener ${describirAlertas(alertas)}: va a quedar en revisión.`}
              </p>
            )}

            <div className="d-flex justify-content-between align-items-center mt-2">
              <small className="text-muted">{texto.length}/500</small>
              <button className="btn btn-dark btn-sm" disabled={enviando || !texto.trim() || bloqueado}>
                {enviando ? 'Publicando...' : 'Comentar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default Comentarios
