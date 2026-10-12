// Service worker de ENTS: permite instalar la app y abrirla aunque la red
// falle. Los datos (Supabase) siempre van a la red; solo se guardan los
// archivos de la app.
const VERSION = 'ents-v2'
const BASICOS = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/logo.svg', '/icons/icon-192.png']

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(BASICOS)))
  self.skipWaiting()
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(claves.filter((clave) => clave !== VERSION).map((clave) => caches.delete(clave)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (evento) => {
  const { request } = evento
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // Páginas: primero la red (para tener siempre la última versión)
  if (request.mode === 'navigate') {
    evento.respondWith(
      fetch(request)
        .then((respuesta) => {
          const copia = respuesta.clone()
          caches.open(VERSION).then((cache) => cache.put('/index.html', copia))
          return respuesta
        })
        .catch(() => caches.match('/index.html'))
    )
    return
  }

  // Archivos con hash (/assets/...): no cambian nunca, primero la caché
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    evento.respondWith(
      caches.match(request).then((guardada) =>
        guardada ??
        fetch(request).then((respuesta) => {
          const copia = respuesta.clone()
          caches.open(VERSION).then((cache) => cache.put(request, copia))
          return respuesta
        })
      )
    )
  }
})
