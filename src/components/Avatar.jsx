import { AVATARES_PREDEFINIDOS } from './avatares'

// Avatar del usuario: foto subida, avatar predefinido (preset:N) o iniciales,
// dentro de un anillo del color de su rol:
//   dueño → azul Francia con degradado a blanco + etiqueta "CEO"
//   admin → celeste · moderador → verde · funcionario → amarillo · vecino → blanco
function iniciales(perfil) {
  const nombre = perfil?.nombre?.[0] ?? ''
  const apellido = perfil?.apellido?.[0] ?? ''

  return (nombre + apellido).toUpperCase() || '·'
}

function Contenido({ perfil, size }) {
  const valor = perfil?.avatar_url

  if (valor?.startsWith('preset:')) {
    const preset = AVATARES_PREDEFINIDOS[Number(valor.slice(7))] ?? AVATARES_PREDEFINIDOS[0]

    return (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <rect width="40" height="40" fill={preset.fondo} />
        <polygon points={preset.puntos} fill={preset.figura} />
      </svg>
    )
  }

  if (valor) {
    return <img src={valor} alt="" loading="lazy" />
  }

  return <span style={{ fontSize: size * 0.38 }}>{iniciales(perfil)}</span>
}

// rol / dueno: si no se pasan, se toman del perfil (perfil.rol, perfil.es_dueno).
// sinAnillo: para vistas previas (por ejemplo, la galería de avatares).
// sinEtiqueta: muestra el anillo del dueño pero sin la etiqueta "CEO".
function Avatar({ perfil, size = 40, className = '', rol, dueno, sinAnillo = false, sinEtiqueta = false }) {
  const rolFinal = rol ?? perfil?.rol ?? 'ciudadano'
  const esDueno = dueno ?? Boolean(perfil?.es_dueno)
  const sinImagen = !perfil?.avatar_url

  const contenido = (
    <span className={`avatar${sinImagen ? ' avatar-iniciales' : ''}`}>
      <Contenido perfil={perfil} size={size} />
    </span>
  )

  if (sinAnillo) {
    return (
      <span className={`avatar-marco sin-anillo ${className}`} style={{ width: size, height: size }}>
        {contenido}
      </span>
    )
  }

  const anillo = Math.max(2, Math.round(size * 0.065))
  const claseRol = esDueno ? 'rol-dueno' : `rol-${rolFinal}`

  return (
    <span
      className={`avatar-marco ${claseRol} ${className}`}
      style={{ width: size, height: size, padding: anillo }}
      title={esDueno ? 'CEO' : undefined}
    >
      {contenido}
      {esDueno && !sinEtiqueta && (
        <span className="avatar-ceo" style={{ fontSize: Math.max(7, Math.round(size * 0.19)) }}>
          CEO
        </span>
      )}
    </span>
  )
}

export default Avatar
