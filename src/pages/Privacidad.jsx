import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import FondoAnimado from '../components/FondoAnimado'
import '../styles/auth.css'

const ACTUALIZADA = '11 de octubre de 2026'
const CONTACTO = 'entsassistant@gmail.com'

// Política de privacidad pública: Google la exige para publicar el ingreso con Google
function Privacidad() {
  return (
    <div className="auth-page legal-page">
      <FondoAnimado />

      <main className="auth-card legal-card">
        <Link to="/login" className="legal-marca">
          <Logo size={40} />
          <span>Everyone Needs To Smile</span>
        </Link>

        <h1>Política de privacidad</h1>
        <p className="legal-fecha">Última actualización: {ACTUALIZADA}</p>

        <section>
          <h2>Qué es ENTS</h2>
          <p>
            Everyone Needs To Smile (ENTS) es una plataforma de peticiones
            ciudadanas de Córdoba, Argentina: los vecinos publican problemáticas
            de su barrio, las firman y siguen su respuesta.
          </p>
        </section>

        <section>
          <h2>Qué datos guardamos</h2>
          <ul>
            <li>Nombre, apellido y correo electrónico de tu cuenta.</li>
            <li>
              Si entrás con Google: tu nombre, tu correo y tu foto de perfil de
              Google. No accedemos a ningún otro dato de tu cuenta de Google.
            </li>
            <li>Tu foto de perfil, si decidís subir una.</li>
            <li>
              Lo que publicás en la plataforma: peticiones (con sus fotos y su
              ubicación aproximada, si la marcás), firmas y publicaciones del feed.
            </li>
            <li>Si sos funcionario/a: el cargo y el organismo que informaste.</li>
          </ul>
        </section>

        <section>
          <h2>Quién puede ver tus datos</h2>
          <ul>
            <li>
              <strong>Otros vecinos:</strong> nunca ven tu nombre. Las
              peticiones, las firmas y las publicaciones son anónimas entre
              usuarios.
            </li>
            <li>
              <strong>Funcionarios verificados:</strong> pueden ver quién creó y
              quién firmó cada petición, para poder darle respuesta.
            </li>
            <li>
              <strong>Administradores de la plataforma:</strong> pueden ver la
              información de las cuentas para moderar el contenido.
            </li>
          </ul>
          <p>No vendemos ni compartimos tus datos con terceros con fines comerciales.</p>
        </section>

        <section>
          <h2>Dónde se guardan</h2>
          <p>
            Los datos se almacenan en Supabase, el servicio que usamos como base
            de datos y para el inicio de sesión, protegidos con reglas de acceso
            por usuario.
          </p>
        </section>

        <section>
          <h2>Tus derechos</h2>
          <p>
            Podés pedir ver, corregir o eliminar tus datos y tu cuenta en
            cualquier momento escribiendo a{' '}
            <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a>. También podés editar
            tu nombre y tu foto desde tu perfil.
          </p>
        </section>

        <Link to="/login" className="auth-submit legal-volver">
          Volver a la página
        </Link>
      </main>
    </div>
  )
}

export default Privacidad
