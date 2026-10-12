import { useEffect, useState } from 'react'
import { getMisPermisos } from '../services/participacionService'

// Qué paneles ve y modifica la cuenta actual (los define el dueño en "Permisos").
// Se pide a la base una vez por usuario y se comparte entre el menú, las rutas
// y las páginas. La base vuelve a verificar cada acción: esto solo decide qué mostrar.
const respuestas = new Map()
const pedidos = new Map()
const oyentes = new Set()

export function recargarPermisos() {
  respuestas.clear()
  pedidos.clear()
  oyentes.forEach((avisar) => avisar())
}

export function usePermisos(usuarioId) {
  const [, setDatos] = useState(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const avisar = () => setVersion((v) => v + 1)
    oyentes.add(avisar)
    return () => oyentes.delete(avisar)
  }, [])

  useEffect(() => {
    if (!usuarioId) return

    if (respuestas.has(usuarioId)) {
      return
    }

    let activo = true

    // Un solo pedido aunque lo usen varios componentes a la vez
    if (!pedidos.has(usuarioId)) pedidos.set(usuarioId, getMisPermisos())

    pedidos.get(usuarioId)
      .then((valor) => {
        respuestas.set(usuarioId, valor)
        if (activo) setDatos(valor)
      })
      .catch((err) => {
        console.error('Error cargando permisos:', err)
        respuestas.set(usuarioId, { es_dueno: false, permisos: {} })
        if (activo) setDatos(respuestas.get(usuarioId))
      })

    return () => {
      activo = false
    }
  }, [usuarioId, version])

  // La caché manda: así nunca se mezclan los permisos de otro usuario
  const actual = respuestas.get(usuarioId) ?? null

  const puede = (panel, accion = 'ver') => Boolean(actual?.permisos?.[panel]?.[accion])

  return { puede, esDueno: Boolean(actual?.es_dueno), listo: Boolean(actual) || !usuarioId }
}
