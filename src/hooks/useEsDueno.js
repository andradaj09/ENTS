import { useEffect, useState } from 'react'
import { soyDueno } from '../services/participacionService'

// ¿La cuenta actual es la del dueño del proyecto? Se pregunta a la base una
// vez por usuario y se reutiliza (menú lateral y páginas privadas).
const respuestas = new Map()

export function useEsDueno(usuarioId) {
  const [estado, setEstado] = useState(() => ({
    usuarioId,
    esDueno: respuestas.get(usuarioId) ?? false,
    listo: respuestas.has(usuarioId),
  }))

  useEffect(() => {
    if (!usuarioId || respuestas.has(usuarioId)) return

    let activo = true

    soyDueno()
      .then((valor) => {
        respuestas.set(usuarioId, Boolean(valor))
        if (activo) setEstado({ usuarioId, esDueno: Boolean(valor), listo: true })
      })
      .catch(() => {
        if (activo) setEstado({ usuarioId, esDueno: false, listo: true })
      })

    return () => {
      activo = false
    }
  }, [usuarioId])

  // Si cambió el usuario, se responde con lo que haya en caché para él
  if (estado.usuarioId !== usuarioId) {
    return { esDueno: respuestas.get(usuarioId) ?? false, listo: respuestas.has(usuarioId) || !usuarioId }
  }

  return { esDueno: estado.esDueno, listo: estado.listo || !usuarioId }
}
