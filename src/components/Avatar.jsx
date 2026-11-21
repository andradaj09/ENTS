import { AVATARES_PREDEFINIDOS } from './avatares'

// Avatar del usuario: foto subida, avatar predefinido (preset:N) o iniciales.
function iniciales(perfil) {
  const nombre = perfil?.nombre?.[0] ?? ''
  const apellido = perfil?.apellido?.[0] ?? ''

  return (nombre + apellido).toUpperCase() || '·'
}

function Avatar({ perfil, size = 40, className = '' }) {
  const valor = perfil?.avatar_url
  const estilo = { width: size, height: size }
  const clases = `avatar ${className}`

  if (valor?.startsWith('preset:')) {
    const preset = AVATARES_PREDEFINIDOS[Number(valor.slice(7))] ?? AVATARES_PREDEFINIDOS[0]

    return (
      <span className={clases} style={estilo}>
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <rect width="40" height="40" fill={preset.fondo} />
          <polygon points={preset.puntos} fill={preset.figura} />
        </svg>
      </span>
    )
  }

  if (valor) {
    return (
      <span className={clases} style={estilo}>
        <img src={valor} alt="" loading="lazy" />
      </span>
    )
  }

  return (
    <span
      className={`${clases} avatar-iniciales`}
      style={{ ...estilo, fontSize: size * 0.38 }}
    >
      {iniciales(perfil)}
    </span>
  )
}

export default Avatar
