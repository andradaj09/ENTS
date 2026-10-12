import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import 'bootstrap/dist/css/bootstrap.min.css'
import './styles/theme.css'
import './styles/oscuro.css'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { iniciarInstalacion } from './utils/instalacion'

// Se escucha desde el arranque: el navegador avisa una sola vez que la app
// se puede instalar, a veces antes de que React termine de cargar
iniciarInstalacion()

// App instalable. El service worker solo guarda páginas y archivos con hash
// (/assets, /icons), así que no interfiere con la recarga de Vite en desarrollo.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) =>
      console.error('No se pudo registrar el service worker:', err)
    )
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)