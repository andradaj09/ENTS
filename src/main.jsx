import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import 'bootstrap/dist/css/bootstrap.min.css'
import './styles/theme.css'
import './styles/oscuro.css'
import { AuthProvider } from './contexts/AuthContext.jsx'

// App instalable: el service worker solo se registra en producción
// (en desarrollo interferiría con la recarga automática de Vite)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
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