import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  enviarRecuperacion,
  googleHabilitado,
  loginConGoogle,
  loginUser,
  mensajeErrorAuth,
  registerUser,
} from '../services/authService'
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

const RUTAS = {
  login: '/login',
  registro: '/registro',
  recuperar: '/recuperar',
}

function modoSegunRuta(ruta) {
  if (ruta === RUTAS.registro) return 'registro'
  if (ruta === RUTAS.recuperar) return 'recuperar'
  return 'login'
}

// "G" de Google con sus colores oficiales (requerido por sus pautas de marca)
function LogoGoogle() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

function AuthPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const modo = modoSegunRuta(location.pathname)
  const destino = location.state?.from?.pathname ?? '/'

  const [form, setForm] = useState(formVacio)
  const [verPassword, setVerPassword] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [conGoogle, setConGoogle] = useState(false)
  const [error, setError] = useState('')
  // Después de registrarse o pedir el enlace, el formulario se reemplaza por un cartel
  const [cuentaCreada, setCuentaCreada] = useState(null)
  const [enlaceEnviado, setEnlaceEnviado] = useState(null)
  // El botón de Google solo aparece si el proveedor está habilitado en Supabase
  const [hayGoogle, setHayGoogle] = useState(false)

  useEffect(() => {
    let activo = true

    googleHabilitado().then((habilitado) => {
      if (activo) setHayGoogle(habilitado)
    })

    return () => {
      activo = false
    }
  }, [])

  if (!authLoading && user) {
    return <Navigate to={destino} replace />
  }

  const cambiarModo = (nuevoModo) => {
    if (nuevoModo === modo) return

    setError('')
    setCuentaCreada(null)
    setEnlaceEnviado(null)
    navigate(RUTAS[nuevoModo], {
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

  const handleGoogle = async () => {
    setError('')
    setConGoogle(true)

    try {
      // Redirige a Google; al volver, la sesión ya está iniciada
      await loginConGoogle(destino)
    } catch (err) {
      setError(mensajeErrorAuth(err))
      setConGoogle(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    setError('')
    setEnviando(true)

    try {
      if (modo === 'login') {
        await loginUser(form.email, form.password)
        navigate(destino, { replace: true })
      } else if (modo === 'recuperar') {
        await enviarRecuperacion(form.email.trim())
        setEnlaceEnviado(form.email.trim())
      } else {
        const esFuncionario = form.tipoCuenta === 'funcionario'

        const { session } = await registerUser(
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

        // Si Supabase no pide confirmar el correo, la sesión ya está iniciada
        if (session) {
          navigate(destino, { replace: true })
          return
        }

        setCuentaCreada({ email: form.email, esFuncionario })
        // Al volver a "Iniciar sesión" el correo ya queda escrito
        setForm({ ...formVacio, email: form.email })
      }
    } catch (err) {
      setError(mensajeErrorAuth(err))
    } finally {
      setEnviando(false)
    }
  }

  // Google no sirve para pedir cuenta de funcionario (no pasa por el formulario)
  const mostrarGoogle =
    hayGoogle &&
    (modo === 'login' || (modo === 'registro' && form.tipoCuenta === 'vecino'))

  const cartel = cuentaCreada
    ? {
        titulo: '¡Cuenta creada!',
        texto: (
          <>
            Te enviamos un correo a <strong>{cuentaCreada.email}</strong>.
            Abrilo y confirmá tu cuenta para poder iniciar sesión.
          </>
        ),
        nota: cuentaCreada.esFuncionario &&
          'Un administrador va a verificar tu cargo. Mientras tanto vas a usar la plataforma como vecino/a.',
      }
    : enlaceEnviado
      ? {
          titulo: 'Revisá tu correo',
          texto: (
            <>
              Si existe una cuenta con <strong>{enlaceEnviado}</strong>, te
              enviamos un enlace para elegir una contraseña nueva.
            </>
          ),
          nota: '¿No llegó? Revisá la carpeta de spam o esperá unos minutos antes de pedirlo de nuevo.',
        }
      : null

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
          {modo === 'recuperar' ? 'Recuperar contraseña' : (
            <>Tu barrio, <PalabraRotativa /></>
          )}
        </h1>

        <p className="auth-sub auth-reveal" style={{ '--i': 3 }}>
          {modo === 'recuperar'
            ? 'Te enviamos un enlace para elegir una contraseña nueva.'
            : 'Peticiones vecinales con impacto real.'}
        </p>

        {cartel ? (
          <div className="auth-exito" role="status">
            <span className="auth-exito-icono">
              <Icon name={enlaceEnviado ? 'mail' : 'check'} size={30} />
            </span>

            <h2>{cartel.titulo}</h2>
            <p>{cartel.texto}</p>
            {cartel.nota && <p className="auth-exito-nota">{cartel.nota}</p>}

            <button
              type="button"
              className="auth-submit"
              onClick={() => cambiarModo('login')}
            >
              Ir a iniciar sesión
              <Icon name="arrow" size={18} />
            </button>
          </div>
        ) : (
        <>
        {modo === 'recuperar' ? (
          <button
            type="button"
            className="auth-volver auth-reveal"
            style={{ '--i': 4 }}
            onClick={() => cambiarModo('login')}
          >
            ← Volver a iniciar sesión
          </button>
        ) : (
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
        )}

        <form className="auth-form" onSubmit={handleSubmit} key={modo}>

          {error && <div className="auth-alert auth-alert-error">{error}</div>}

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
            </>
          )}

          {mostrarGoogle && (
            <>
              <button
                type="button"
                className="auth-google auth-field-anim"
                style={{ '--i': 0 }}
                onClick={handleGoogle}
                disabled={conGoogle}
              >
                {conGoogle ? <span className="auth-spinner auth-spinner-oscuro" /> : <LogoGoogle />}
                {modo === 'registro' ? 'Registrarme con Google' : 'Continuar con Google'}
              </button>

              <div className="auth-separador auth-field-anim" style={{ '--i': 0 }}>
                <span>o con tu correo</span>
              </div>
            </>
          )}

          {modo === 'registro' && (
            <>
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

          {modo !== 'recuperar' && (
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
          )}

          {modo === 'login' && (
            <button
              type="button"
              className="auth-olvide auth-field-anim"
              style={{ '--i': 2 }}
              onClick={() => cambiarModo('recuperar')}
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}

          <button
            className="auth-submit auth-field-anim"
            style={{ '--i': 3 }}
            disabled={enviando}
          >
            {enviando ? (
              <span className="auth-spinner" />
            ) : (
              <>
                {modo === 'login' && 'Entrar'}
                {modo === 'registro' && 'Crear cuenta'}
                {modo === 'recuperar' && 'Enviar enlace'}
                <Icon name="arrow" size={18} />
              </>
            )}
          </button>

          {modo !== 'recuperar' && (
            <p className="auth-switch auth-field-anim" style={{ '--i': 4 }}>
              {modo === 'login' ? '¿Primera vez acá?' : '¿Ya tenés cuenta?'}{' '}
              <button
                type="button"
                onClick={() => cambiarModo(modo === 'login' ? 'registro' : 'login')}
              >
                {modo === 'login' ? 'Creá tu cuenta' : 'Iniciá sesión'}
              </button>
            </p>
          )}
        </form>

        <p className="auth-legal">
          Al usar ENTS aceptás nuestra{' '}
          <Link to="/privacidad">política de privacidad</Link>.
        </p>
        </>
        )}
      </main>

      <p className="auth-footer">Córdoba · Peticiones ciudadanas</p>
    </div>
  )
}

export default AuthPage
