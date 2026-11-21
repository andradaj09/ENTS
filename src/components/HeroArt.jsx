// Ilustración del inicio: solo polígonos y líneas rectas.
// Cada pieza flota a su ritmo (animaciones en theme.css).
function HeroArt() {
  return (
    <svg
      className="hero-art"
      viewBox="0 0 420 480"
      role="img"
      aria-label="Composición geométrica"
    >
      {/* Prisma amarillo */}
      <g className="art-pieza">
        <polygon points="120,300 290,190 370,240 200,350" fill="#edb54f" />
        <polygon points="200,350 370,240 320,370 150,470" fill="#121212" />
      </g>

      {/* Pentágono verde */}
      <g className="art-pieza">
        <polygon points="130,330 197,378 171,457 89,457 63,378" fill="#5dbb8a" />
      </g>

      {/* Tetraedro */}
      <g className="art-pieza">
        <polygon points="40,290 150,40 200,250" fill="#6fa3d8" />
        <polygon points="150,40 290,250 200,250" fill="#d4573f" />
        <polygon points="40,290 200,250 290,250" fill="#121212" />
      </g>

      {/* Cuadrícula (en lugar del globo) */}
      <g className="art-pieza">
        <rect x="18" y="372" width="92" height="92" fill="#121212" />
        <path
          d="M18 395 H110 M18 418 H110 M18 441 H110 M41 372 V464 M87 372 V464"
          stroke="#fbfaf5"
          strokeWidth="2.5"
        />
        <path d="M64 372 V464" stroke="#5dbb8a" strokeWidth="2.5" />
      </g>

      {/* Cruz de cuadrados */}
      <g className="art-cruz" fill="#121212">
        <rect x="336" y="40" width="22" height="22" />
        <rect x="314" y="62" width="22" height="22" />
        <rect x="336" y="62" width="22" height="22" />
        <rect x="358" y="62" width="22" height="22" />
        <rect x="336" y="84" width="22" height="22" />
      </g>

      {/* Trazo punteado recto que avanza */}
      <polyline
        className="art-trazo"
        points="290,410 318,382 338,428 372,370 396,402 410,330"
        fill="none"
        stroke="#121212"
        strokeWidth="2"
        strokeDasharray="5 6"
      />
    </svg>
  )
}

export default HeroArt
