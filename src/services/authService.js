import { supabase } from '../supabase/client'

export async function registerUser(nombre, apellido, email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nombre,
        apellido,
      },
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

export async function logoutUser() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}