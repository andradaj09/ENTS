// Descarga de datos como CSV que Excel abre directo (separador ";" y BOM
// para que respete acentos, como espera la configuración regional argentina).

function celda(valor) {
  if (valor == null) return ''
  const texto = String(valor)
  return /[";\n\r]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto
}

export function aCSV(columnas, filas) {
  const lineas = [columnas.map(celda).join(';'), ...filas.map((fila) => fila.map(celda).join(';'))]
  return '﻿' + lineas.join('\r\n')
}

export function descargarCSV(nombreArchivo, columnas, filas) {
  const blob = new Blob([aCSV(columnas, filas)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}

// "2026-10-12" para nombres de archivo
export const fechaArchivo = () => new Date().toISOString().slice(0, 10)
