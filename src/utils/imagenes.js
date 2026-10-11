export const MAXIMO_FOTOS = 3
export const TAMANIO_MAXIMO_ORIGINAL = 15 * 1024 * 1024

// Reduce la foto a un máximo de 1600 px por lado y la convierte a JPEG.
// Una foto de celular de ~5 MB queda en ~300 KB: sube rápido y carga liviana.
export async function comprimirImagen(archivo, { maxLado = 1600, calidad = 0.82 } = {}) {
  if (!archivo.type.startsWith('image/')) {
    throw new Error(`"${archivo.name}" no es una imagen.`)
  }

  if (archivo.size > TAMANIO_MAXIMO_ORIGINAL) {
    throw new Error(`"${archivo.name}" pesa más de 15 MB.`)
  }

  let imagen

  try {
    imagen = await createImageBitmap(archivo)
  } catch {
    throw new Error(`No se pudo leer "${archivo.name}". Probá con una foto JPG o PNG.`)
  }

  const escala = Math.min(1, maxLado / Math.max(imagen.width, imagen.height))
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.round(imagen.width * escala)
  lienzo.height = Math.round(imagen.height * escala)

  const contexto = lienzo.getContext('2d')
  contexto.drawImage(imagen, 0, 0, lienzo.width, lienzo.height)
  imagen.close()

  const blob = await new Promise((resolve) => lienzo.toBlob(resolve, 'image/jpeg', calidad))

  if (!blob) {
    throw new Error(`No se pudo procesar "${archivo.name}".`)
  }

  return blob
}
