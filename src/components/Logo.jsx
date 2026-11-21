// Logo geométrico: facetas blancas sobre base negra, solo líneas rectas.
function Logo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="9" fill="#121212" />
      <polygon points="8,31 20,8 20,25" fill="#ffffff" />
      <polygon points="20,8 32,28 20,25" fill="#ffffff" opacity="0.62" />
      <polygon points="8,31 20,25 32,28" fill="#ffffff" opacity="0.3" />
    </svg>
  )
}

export default Logo
