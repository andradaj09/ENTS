import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { loginUser, registerUser } from '../services/authService'
import Icon from '../components/Icon'
import Logo from '../components/Logo'
import FondoAnimado from '../components/FondoAnimado'
import PalabraRotativa from '../components/PalabraRotativa'
import '../styles/auth.css'

const formVacio = {
  nombre: '',
  apellido: '',
  email: '',
  password: '',
  tipoCuenta: 'vecino',
  cargo: '',
  organizacion: '',
}

function AuthPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const modo = location.pathname === '/registro' ? 'registro' : 'login'
  const destino = location.state?.from?.pathname ?? '/'

  const [form, setForm] = useState(formVacio)
  const [verPassword, setVerPassword] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  if (!authLoading && user) {
    return <Navigate to={destino} replace />
  }

  const cambiarModo = (nuevoModo) => {
    if (nuevoModo === modo) return

    setError('')
    setMensaje('')
    navigate(nuevoModo === 'registro' ? '/registro' : '/login', {
      replace: true,
      state: location.state,
    })
  }

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    setError('')
    setMensaje('')
    setEnviando(true)

    try {
      if (modo === 'login') {
        await loginUser(form.email, form.password)
        navigate(destino, { replace: true })
      } else {
        const esFuncionario = form.tipoCuenta === 'funcionario'

        await registerUser(
          form.nombre.trim(),
          form.apellido.trim(),
          form.email,
          form.password,
          {
            tipoCuenta: form.tipoCuenta,
            cargo: form.cargo.trim(),
            organizacion: form.organizacion.trim(),
          }
        )

        setMensaje(
          esFuncionario
            ? 'Cuenta creada. Revisá tu correo para confirmarla. Un administrador va a verificar tu cargo; mientras tanto vas a usar la plataforma como vecino/a.'
            : 'Cuenta creada. Revisá tu correo para confirmarla y después iniciá sesión.'
        )
        setForm({ ...formVacio, email: form.email })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
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
          Tu barrio, <PalabraRotativa />
        </h1>

        <p className="auth-sub auth-reveal" style={{ '--i': 3 }}>
          Peticiones vecinales con impacto real.
        </p>

        <div
          className={`auth-tabs auth-reveal${modo === 'registro' ? ' is-registro' : ''}`}
          style={{ '--i': 4 }}
          role="tablist"
        >
          <span className="auth-tab-indicator" />
          <button
            type="button"
            role="tab"
            aria-selected={modo === 'login'}
            className={modo === 'login' ? 'active' : ''}
            onClick={() => cambiarModo('login')}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={modo === 'registro'}
            className={modo === 'registro' ? 'active' : ''}
            onClick={() => cambiarModo('registro')}
          >
            Registrarse
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} key={modo}>

          {error && <div className="auth-alert auth-alert-error">{error}</div>}
          {mensaje && <div className="auth-alert auth-alert-ok">{mensaje}</div>}

          {modo === 'registro' && (
            <>
              {/* Tipo de cuenta: define qué datos puede ver cada usuario */}
              <div
                className="auth-tipo auth-field-anim"
                style={{ '--i': 0 }}
                role="radiogroup"
                aria-label="Tipo de cuenta"
              >
                {[
                  ['vecino', 'users', 'Vecino/a', 'Creo y firmo peticiones'],
                  ['funcionario', 'shield', 'Funcionario/a', 'Respondo peticiones'],
                ].map(([valor, icono, titulo, detalle]) => (
                  <button
                    key={valor}
                    type="button"
                    role="radio"
                    aria-checked={form.tipoCuenta === valor}
                    className={form.tipoCuenta === valor ? 'active' : ''}
                    onClick={() => setForm({ ...form, tipoCuenta: valor })}
                  >
                    <Icon name={icono} size={20} />
                    <strong>{titulo}</strong>
                    <span>{detalle}</span>
                  </button>
                ))}
              </div>

              <div className="auth-row auth-field-anim" style={{ '--i': 0 }}>
                <label className="auth-field">
                  <Icon name="user" size={18} />
                  <input
                    name="nombre"
                    placeholder="Nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    autoComplete="given-name"
                    required
                  />
                </label>

                <label className="auth-field">
                  <input
                    name="apellido"
                    placeholder="Apellido"
                    value={form.apellido}
                    onChange={handleChange}
                    autoComplete="family-name"
                    required
                  />
                </label>
              </div>

              {form.tipoCuenta === 'funcionario' && (
                <>
                  <label className="auth-field auth-field-anim">
                    <Icon name="flag" size={18} />
                    <input
                      name="cargo"
                      placeholder="Cargo (ej: Director de Espacios Verdes)"
                      value={form.cargo}
                      onChange={handleChange}
                      maxLength={120}
                      required
                    />
                  </label>

                  <label className="auth-field auth-field-anim">
                    <Icon name="home" size={18} />
                    <input
                      name="organizacion"
                      placeholder="Organismo u organización"
                      value={form.organizacion}
                      onChange={handleChange}
                      maxLength={120}
                      required
                    />
                  </label>

                  <p className="auth-nota">
                    Un administrador verifica tu cargo antes de habilitarte a ver
                    quién crea y firma cada petición.
                  </p>
                </>
              )}
            </>
          )}

          <label className="auth-field auth-field-anim" style={{ '--i': 1 }}>
            <Icon name="mail" size={18} />
            <input
              type="email"
              name="email"
              placeholder="Correo electrónico"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </label>

          <label className="auth-field auth-field-anim" style={{ '--i': 2 }}>
            <Icon name="lock" size={18} />
            <input
              type={verPassword ? 'text' : 'password'}
              name="password"
              placeholder="Contraseña"
              value={form.password}
              onChange={handleChange}
              minLength={modo === 'registro' ? 6 : undefined}
              autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
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

          <button
            className="auth-submit auth-field-anim"
            style={{ '--i': 3 }}
            disabled={enviando}
          >
            {enviando ? (
              <span className="auth-spinner" />
            ) : (
              <>
                {modo === 'login' ? 'Entrar' : 'Crear cuenta'}
                <Icon name="arrow" size={18} />
              </>
            )}
          </button>

          <p className="auth-switch auth-field-anim" style={{ '--i': 4 }}>
            {modo === 'login' ? '¿Primera vez acá?' : '¿Ya tenés cuenta?'}{' '}
            <button
              type="button"
              onClick={() => cambiarModo(modo === 'login' ? 'registro' : 'login')}
            >
              {modo === 'login' ? 'Creá tu cuenta' : 'Iniciá sesión'}
            </button>
          </p>
        </form>
      </main>

      <p className="auth-footer">Córdoba · Peticiones ciudadanas</p>
    </div>
  )
}

export default AuthPage
