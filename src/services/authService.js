import { supabase } from '../supabase/client'

// Mensajes de Supabase Auth traducidos y explicados para el usuario
const MENSAJES_ERROR = {
  over_email_send_rate_limit:
    'Se alcanzó el límite de correos de confirmación por hora. Esperá unos minutos y volvé a intentar.',
  over_request_rate_limit:
    'Demasiados intentos seguidos. Esperá un momento y volvé a intentar.',
  invalid_credentials: 'El correo o la contraseña no son correctos.',
  email_not_confirmed:
    'Todavía no confirmaste tu correo. Revisá tu bandeja de entrada (y la de spam).',
  user_already_exists: 'Ya existe una cuenta con ese correo. Iniciá sesión.',
  email_exists: 'Ya existe una cuenta con ese correo. Iniciá sesión.',
  email_address_invalid: 'El correo no es válido. Revisá que esté bien escrito.',
  weak_password: 'La contraseña es muy débil: usá al menos 6 caracteres.',
  same_password: 'La nueva contraseña tiene que ser distinta de la anterior.',
  validation_failed:
    'Ese método de ingreso no está habilitado todavía. Probá con correo y contraseña.',
  provider_disabled:
    'El ingreso con Google todavía no está habilitado. Probá con correo y contraseña.',
}

export function mensajeErrorAuth(error) {
  return MENSAJES_ERROR[error?.code] ?? error?.message ?? 'Ocurrió un error. Probá de nuevo.'
}

// tipoCuenta: 'vecino' | 'funcionario'. Si es funcionario, la base guarda la
// solicitud y la cuenta queda como vecino hasta que un admin la apruebe.
export async function registerUser(
  nombre,
  apellido,
  email,
  password,
  { tipoCuenta = 'vecino', cargo = '', organizacion = '' } = {}
) {
  const datos = { nombre, apellido, tipo_cuenta: tipoCuenta }

  if (tipoCuenta === 'funcionario') {
    datos.cargo = cargo
    datos.organizacion = organizacion
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: datos,
    },
  })

  if (error) {
    throw error
  }

  return data
}

export async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw error
  }

  return data
}

// Solo se envían los campos editables; el rol nunca se modifica desde acá
const CAMPOS_EDITABLES = ['nombre', 'apellido', 'avatar_url']

export async function updatePerfil(usuarioId, cambios) {
  const fila = Object.fromEntries(
    Object.entries(cambios).filter(([campo]) => CAMPOS_EDITABLES.includes(campo))
  )

  const { data, error } = await supabase
    .from('profiles')
    .update(fila)
    .eq('id', usuarioId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export const TAMANIO_MAXIMO_AVATAR = 2 * 1024 * 1024

// Sube la foto al bucket `avatares` (ver supabase/schema.sql)
// y devuelve su URL pública.
export async function subirAvatar(usuarioId, archivo) {
  if (!archivo.type.startsWith('image/')) {
    throw new Error('El archivo tiene que ser una imagen.')
  }

  if (archivo.size > TAMANIO_MAXIMO_AVATAR) {
    throw new Error('La imagen no puede superar los 2 MB.')
  }

  const extension = archivo.name.split('.').pop()?.toLowerCase() || 'jpg'
  const ruta = `${usuarioId}/${Date.now()}.${extension}`

  const { error } = await supabase.storage
    .from('avatares')
    // Nombre único por subida: no hace falta sobrescribir (upsert pediría permiso de lectura)
    .upload(ruta, archivo, { contentType: archivo.type })

  if (error) {
    throw error
  }

  const { data } = supabase.storage.from('avatares').getPublicUrl(ruta)

  return data.publicUrl
}

// ---------- Google ----------
// Redirige a Google y vuelve a la página ya con la sesión iniciada.
// Requiere el proveedor Google habilitado en Supabase (Authentication → Providers).
export async function loginConGoogle(destino = '/') {
  // Si Google no está habilitado, Supabase mostraría una página de error técnica:
  // se consulta antes la configuración pública de Auth para avisar con un mensaje claro.
  const respuesta = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
    headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
  })
  const configuracion = respuesta.ok ? await respuesta.json() : null

  if (configuracion && !configuracion.external?.google) {
    throw Object.assign(new Error('Google no está habilitado'), { code: 'provider_disabled' })
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}${destino}`,
    },
  })

  if (error) {
    throw error
  }
}

// ---------- Recuperar contraseña ----------
export const RUTA_RESTABLECER = '/restablecer'

// Envía un correo con un enlace que lleva a /restablecer con una sesión temporal
export async function enviarRecuperacion(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${RUTA_RESTABLECER}`,
  })

  if (error) {
    throw error
  }
}

export async function actualizarPassword(password) {
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    throw error
  }
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}