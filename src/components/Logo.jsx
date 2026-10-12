// Logo "Unión": anillos orgánicos, uno dentro de otro, en los azules de la app.
// Es el mismo archivo que el favicon (public/logo.svg) y que los íconos de la
// app instalada, así se ve igual en todos lados.
function Logo({ size = 36 }) {
  return (
    <img
      className="logo-ents"
      src="/logo.svg"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable="false"
    />
  )
}

export default Logo
