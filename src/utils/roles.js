// Roles de la plataforma:
// - ciudadano: vecino/a; ve las peticiones de forma anónima
// - funcionario: cargo que da respuesta a las peticiones (lo aprueba un admin);
//   ve quién creó cada petición y quiénes la firmaron
// - admin: modera peticiones, eventos y solicitudes de funcionario

const NOMBRES = {
  ciudadano: 'Vecino/a',
  funcionario: 'Funcionario/a',
  admin: 'Administrador/a',
}

export function nombreRol(rol) {
  return NOMBRES[rol] ?? NOMBRES.ciudadano
}

export function esAdmin(perfil) {
  return perfil?.rol === 'admin'
}

// La base de datos aplica la misma regla (privado.puede_ver_identidades)
export function puedeVerIdentidades(perfil) {
  return perfil?.rol === 'funcionario' || perfil?.rol === 'admin'
}
