import { Link } from 'react-router-dom'
import { urlFotoPeticion } from '../services/petitionService'
import { META_FIRMAS, nombreEtapa, prioridadPorFirmas } from '../utils/prioridad'

function PetitionCard({ peticion, destacada = false }) {
  const fecha = new Date(
    peticion.created_at
  ).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const cantidadFirmas = peticion.firmas_count ?? 0
  const prioridad = prioridadPorFirmas(cantidadFirmas)
  const avance = Math.min(100, (cantidadFirmas / META_FIRMAS) * 100)

  return (
    <div
      className={`card h-100 card-prioridad prioridad-${prioridad.clave}${destacada ? ' card-featured' : ''}`}
      style={{ '--prioridad': prioridad.color, '--prioridad-texto': prioridad.texto }}
    >
      {peticion.fotos?.length > 0 && (
        <div className="card-portada">
          <img src={urlFotoPeticion(peticion.fotos[0])} alt="" loading="lazy" />
        </div>
      )}

      <div className="card-body d-flex flex-column">

        <div className="d-flex justify-content-between align-items-start gap-2">
          <span className="prioridad-badge">{prioridad.nombre}</span>

          <span className={`badge seguimiento-badge etapa-${peticion.seguimiento ?? 'recibida'}`}>
            {nombreEtapa(peticion.seguimiento)}
          </span>
        </div>

        <p className="card-kicker mt-3">
          {peticion.categorias?.nombre || 'Sin categoría'}
          {' · '}
          {peticion.zonas?.nombre || 'Sin zona'}
        </p>

        <h3 className="card-big mt-1">
          {peticion.titulo}
        </h3>

        <div
          className="meta-firmas"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={META_FIRMAS}
          aria-valuenow={Math.min(cantidadFirmas, META_FIRMAS)}
          aria-label="Firmas hacia la meta"
        >
          <span style={{ width: `${avance}%` }} />
        </div>
        <p className="meta-firmas-texto">
          <strong>{cantidadFirmas} {cantidadFirmas === 1 ? 'firma' : 'firmas'}</strong>
          {peticion.elevada_at
            ? ' · Elevada al municipio'
            : ` de ${META_FIRMAS} para elevarla`}
        </p>

        <ul className="check-list">
          <li>
            Urgencia {peticion.score_urgencia ?? 0}/100
          </li>

          <li>
            Publicada el {fecha}
          </li>
        </ul>

        <p className="text-muted small mb-4">
          {peticion.descripcion.length > 140
            ? `${peticion.descripcion.substring(0, 140)}...`
            : peticion.descripcion}
        </p>

        <Link
          to={`/peticiones/${peticion.id}`}
          className={`btn w-100 mt-auto ${destacada ? 'btn-dark' : 'btn-ghost'}`}
        >
          Ver petición
        </Link>

      </div>
    </div>
  )
}

export default PetitionCard
