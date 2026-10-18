// Tema claro / oscuro. Si la persona no eligió, sigue al sistema operativo.
// index.html aplica el tema antes de que cargue React (sin parpadeo).
const CLAVE = 'ents-tema'

export function temaActual() {
  return document.documentElement.dataset.tema === 'oscuro' ? 'oscuro' : 'claro'
}

export function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', tema === 'oscuro' ? '#121311' : '#efece2')

  try {
    localStorage.setItem(CLAVE, tema)
  } catch {
    // Sin almacenamiento: el tema dura hasta recargar
  }
}
