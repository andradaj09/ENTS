import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { actualizarPassword, mensajeErrorAuth } from '../services/authService'
import Icon from '../components/Icon'
import Logo from '../components/Logo'
import FondoAnimado from '../components/FondoAnimado'
import '../styles/auth.css'

// Se llega desde el enlace del correo "Recuperar contraseña". Supabase abre una
// sesión temporal con ese enlace, que permite elegir una contraseña nueva.
function RestablecerPassword() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [repetir, setRepetir] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (password !== repetir) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setError('')
    setGuardando(true)

    try {
      await actualizarPassword(password)
      setListo(true)
    } catch (err) {
      setError(mensajeErrorAuth(err))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="auth-page">
      <FondoAnimado />

      <main className="auth-card brillo-borde">
        <div className="auth-logo">
          <Logo size={52} />
        </div>

        <span className="eyebrow auth-reveal" style={{ '--i': 1 }}>
          Everyone Needs To Smile
        </span>

        <h1 className="auth-title auth-reveal" style={{ '--i': 2 }}>
          Nueva contraseña
        </h1>

        {loading && <p className="auth-sub">Verificando el enlace...</p>}

        {/* Sin sesión: el enlace venció, ya se usó o se abrió en otro navegador */}
        {!loading && !user && (
          <div className="auth-exito" role="status">
            <span className="auth-exito-icono auth-exito-alerta">
              <Icon name="alert" size={28} />
            </span>
            <h2>El enlace no es válido</h2>
            <p>
              Puede que haya vencido o que ya se haya usado. Pedí uno nuevo y
              abrilo en este mismo navegador.
            </p>
            <button
              type="button"
              className="auth-submit"
              onClick={() => navigate('/recuperar', { replace: true })}
            >
              Pedir un enlace nuevo
              <Icon name="arrow" size={18} />
            </button>
          </div>
        )}

        {!loading && user && listo && (
          <div className="auth-exito" role="status">
            <span className="auth-exito-icono">
              <Icon name="check" size={30} />
            </span>
            <h2>¡Contraseña actualizada!</h2>
            <p>Ya podés usar tu nueva contraseña para iniciar sesión.</p>
            <button
              type="button"
              className="auth-submit"
              onClick={() => navigate('/', { replace: true })}
            >
              Ir al inicio
              <Icon name="arrow" size={18} />
            </button>
          </div>
        )}

        {!loading && user && !listo && (
          <>
            <p className="auth-sub auth-reveal" style={{ '--i': 3 }}>
              Elegí una contraseña nueva para <strong>{user.email}</strong>.
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              {error && <div className="auth-alert auth-alert-error">{error}</div>}

              <label className="auth-field auth-field-anim" style={{ '--i': 1 }}>
                <Icon name="lock" size={18} />
                <input
                  type={verPassword ? 'text' : 'password'}
                  placeholder="Contraseña nueva"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setVerPassword((v) => !v)}
                  aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <Icon name={verPassword ? 'eyeOff' : 'eye'} size={18} />
                </button>
              </label>

              <label className="auth-field auth-field-anim" style={{ '--i': 2 }}>
                <Icon name="lock" size={18} />
                <input
                  type={verPassword ? 'text' : 'password'}
                  placeholder="Repetí la contraseña"
                  value={repetir}
                  onChange={(e) => setRepetir(e.target.value)}
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
              </label>

              <button
                className="auth-submit auth-field-anim"
                style={{ '--i': 3 }}
                disabled={guardando}
              >
                {guardando ? (
                  <span className="auth-spinner" />
                ) : (
                  <>
                    Guardar contraseña
                    <Icon name="arrow" size={18} />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </main>

      <p className="auth-footer">Córdoba · Peticiones ciudadanas</p>
    </div>
  )
}

export default RestablecerPassword
