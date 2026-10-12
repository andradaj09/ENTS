// Opciones de un <select> de barrios, agrupadas por localidad
// (Córdoba primero, después Villa Allende y cualquier otra que se sume)
function OpcionesBarrios({ zonas }) {
  const grupos = new Map()

  for (const zona of zonas) {
    const localidad = zona.localidad ?? 'Córdoba'
    if (!grupos.has(localidad)) grupos.set(localidad, [])
    grupos.get(localidad).push(zona)
  }

  // Con una sola localidad no hace falta agrupar
  if (grupos.size < 2) {
    return zonas.map((zona) => (
      <option key={zona.id} value={zona.id}>{zona.nombre}</option>
    ))
  }

  const orden = [...grupos.keys()].sort((a, b) =>
    a === 'Córdoba' ? -1 : b === 'Córdoba' ? 1 : a.localeCompare(b, 'es')
  )

  return orden.map((localidad) => (
    <optgroup key={localidad} label={localidad}>
      {grupos.get(localidad).map((zona) => (
        <option key={zona.id} value={zona.id}>{zona.nombre}</option>
      ))}
    </optgroup>
  ))
}

export default OpcionesBarrios
