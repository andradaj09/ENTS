import { Link } from 'react-router-dom'
import { urlFotoPeticion } from '../services/petitionService'

function PetitionCard({ peticion, destacada = false }) {
  const fecha = new Date(
    peticion.created_at
  ).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const estado = peticion.estado
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letra) => letra.toUpperCase())

  const cantidadFirmas = peticion.firmas_count ?? 0

  return (
    <div className={`card h-100${destacada ? ' card-featured' : ''}`}>
      {peticion.fotos?.length > 0 && (
        <div className="card-portada">
          <img src={urlFotoPeticion(peticion.fotos[0])} alt="" loading="lazy" />
        </div>
      )}

      <div className="card-body d-flex flex-column">

        <div className="d-flex justify-content-between align-items-start gap-2">
          <p className="card-kicker">
            {peticion.categorias?.nombre || 'Sin categoría'}
            {' · '}
            {peticion.zonas?.nombre || 'Sin zona'}
          </p>

          <span className="badge text-bg-light">
            {estado}
          </span>
        </div>

        <h3 className="card-big mt-2">
          {peticion.titulo}
        </h3>

        <ul className="check-list">
          <li>
            {cantidadFirmas}{' '}
            {cantidadFirmas === 1 ? 'firma' : 'firmas'}
          </li>

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
