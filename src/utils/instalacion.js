// Instalación de la app (PWA). Chrome y Edge avisan con el evento
// "beforeinstallprompt" que la app se puede instalar; lo guardamos para
// mostrar el diálogo cuando la persona toque "Instalar app".
// En iPhone (Safari) no existe ese evento: se instala desde "Compartir".

let aviso = null
const oyentes = new Set()

const avisar = () => oyentes.forEach((oyente) => oyente())

export function iniciarInstalacion() {
  window.addEventListener('beforeinstallprompt', (evento) => {
    evento.preventDefault()
    aviso = evento
    avisar()
  })

  window.addEventListener('appinstalled', () => {
    aviso = null
    avisar()
  })
}

export const yaInstalada = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

export const esIOS = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent)

export const puedeInstalarDirecto = () => aviso !== null

export function alCambiarInstalacion(oyente) {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}

// Devuelve 'aceptada', 'cancelada' o 'manual' (hay que hacerlo desde el menú del navegador)
export async function instalar() {
  if (!aviso) return 'manual'

  aviso.prompt()
  const { outcome } = await aviso.userChoice
  aviso = null
  avisar()
  return outcome === 'accepted' ? 'aceptada' : 'cancelada'
}
