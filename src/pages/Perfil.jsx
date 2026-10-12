import { useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { subirAvatar, updatePerfil } from '../services/authService'
import Avatar from '../components/Avatar'
import { AVATARES_PREDEFINIDOS } from '../components/avatares'
import { nombreRol, PERMISOS_POR_ROL } from '../utils/roles'
import { useEsDueno } from '../hooks/useEsDueno'
import { usePermisos } from '../hooks/usePermisos'
import Icon from '../components/Icon'
import Insignias from '../components/Insignias'
import BarriosSeguidos from '../components/BarriosSeguidos'

function Perfil() {
  const { user, profile, setProfile } = useAuth()
  const { esDueno } = useEsDueno(user?.id)
  // Editar datos y foto: según el permiso que definió el dueño
  const puedeEditar = usePermisos(user?.id).puede('perfil', 'modificar')
  const archivoRef = useRef(null)

  const [form, setForm] = useState({
    nombre: profile?.nombre ?? '',
    apellido: profile?.apellido ?? '',
  })
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')

  const [guardandoAvatar, setGuardandoAvatar] = useState(false)
  const [errorAvatar, setErrorAvatar] = useState('')

  const actualizarPerfil = async (cambios) => {
    const actualizado = await updatePerfil(user.id, cambios)
    setProfile((actual) => ({ ...actual, ...actualizado }))
  }

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    setMensaje('')
    setError('')
    setGuardando(true)

    try {
      await actualizarPerfil({
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
      })

      setMensaje('Perfil actualizado.')
    } catch (err) {
      console.error('Error actualizando perfil:', err)
      setError('No se pudo actualizar el perfil.')
    } finally {
      setGuardando(false)
    }
  }

  const cambiarAvatar = async (obtenerValor) => {
    setErrorAvatar('')
    setGuardandoAvatar(true)

    try {
      const avatarUrl = await obtenerValor()
      await actualizarPerfil({ avatar_url: avatarUrl })
    } catch (err) {
      console.error('Error actualizando la foto:', err)
      setErrorAvatar(err.message || 'No se pudo actualizar la foto.')
    } finally {
      setGuardandoAvatar(false)
    }
  }

  const handleArchivo = (e) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''

    if (archivo) {
      cambiarAvatar(() => subirAvatar(user.id, archivo))
    }
  }

  const avatarActual = profile?.avatar_url ?? ''

  return (
    <div className="container py-5">
      <span className="eyebrow">Cuenta</span>
      <h1 className="page-title mb-4">Perfil</h1>

      <div className="row g-4">

        <div className="col-12">
          <div className="card">
            <div className="card-body perfil-foto">
              <div className="perfil-foto-actual">
                <Avatar perfil={profile} size={112} dueno={esDueno} />
                {guardandoAvatar && <span className="perfil-foto-cargando" />}
              </div>

              <div className="perfil-foto-opciones">
                <p className="line-label">Foto de perfil</p>

                <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={() => archivoRef.current?.click()}
                    disabled={guardandoAvatar || !puedeEditar}
                  >
                    <Icon name="image" size={18} className="me-2" />
                    Subir foto
                  </button>

                  {avatarActual && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => cambiarAvatar(async () => null)}
                      disabled={guardandoAvatar || !puedeEditar}
                    >
                      Quitar
                    </button>
                  )}

                  <span className="text-muted small">JPG o PNG, hasta 2 MB.</span>

                  <input
                    ref={archivoRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleArchivo}
                    hidden
                  />
                </div>

                {errorAvatar && <div className="alert alert-danger">{errorAvatar}</div>}

                <p className="text-muted small mb-2">O elegí uno predefinido:</p>

                <div className="avatar-galeria">
                  {AVATARES_PREDEFINIDOS.map((_, indice) => {
                    const valor = `preset:${indice}`

                    return (
                      <button
                        key={valor}
                        type="button"
                        className={`avatar-opcion${avatarActual === valor ? ' activa' : ''}`}
                        onClick={() => cambiarAvatar(async () => valor)}
                        disabled={guardandoAvatar || !puedeEditar}
                        aria-label={`Avatar predefinido ${indice + 1}`}
                        aria-pressed={avatarActual === valor}
                      >
                        <Avatar perfil={{ avatar_url: valor }} size={56} sinAnillo />
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card h-100">
            <div className="card-body">
              <p className="line-label">Datos de la cuenta</p>

              <div className="info-row">
                <span>Correo</span>
                <span>{user?.email}</span>
              </div>

              <div className="info-row align-items-center">
                <span>Tipo de cuenta</span>
                <span className={`badge rol-${esDueno ? 'dueno' : profile?.rol ?? 'ciudadano'}`}>
                  {nombreRol(profile?.rol, esDueno)}
                </span>
              </div>

              <div className="perfil-permisos">
                <span>Lo que podés hacer</span>
                <ul>
                  {PERMISOS_POR_ROL[esDueno ? 'dueno' : profile?.rol ?? 'ciudadano']?.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>

              {(profile?.cargo || profile?.organizacion) && (
                <div className="info-row">
                  <span>Cargo</span>
                  <span>{[profile.cargo, profile.organizacion].filter(Boolean).join(' · ')}</span>
                </div>
              )}

              {profile?.rol_solicitado === 'funcionario' && (
                <div className="alert alert-info small mt-3 mb-0">
                  Tu solicitud para ser funcionario/a está en revisión. Un
                  administrador va a verificar tu cargo.
                </div>
              )}

              <p className="text-muted small mt-3 mb-0">
                Tu nombre no se muestra a otros vecinos: las peticiones, firmas
                y publicaciones son anónimas.
              </p>

              <div className="info-row">
                <span>Miembro desde</span>
                <span>
                  {user?.created_at &&
                    new Date(user.created_at).toLocaleDateString('es-AR')}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card h-100">
            <div className="card-body">
              <p className="line-label">Editar datos</p>

              {mensaje && <div className="alert alert-success">{mensaje}</div>}
              {error && <div className="alert alert-danger">{error}</div>}

              {!puedeEditar && (
                <p className="text-muted small">
                  <Icon name="lock" size={14} className="me-1" />
                  Tu rango no puede editar el perfil por ahora.
                </p>
              )}

              <form onSubmit={handleSubmit}>
                <fieldset disabled={!puedeEditar}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Nombre</label>
                    <input
                      className="form-control"
                      name="nombre"
                      value={form.nombre}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="col-md-6 mb-4">
                    <label className="form-label">Apellido</label>
                    <input
                      className="form-control"
                      name="apellido"
                      value={form.apellido}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <button className="btn btn-dark" disabled={guardando || !puedeEditar}>
                  {guardando ? 'Guardando...' : 'Guardar cambios'}
                </button>
                </fieldset>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mt-1">
        <div className="col-lg-7">
          <div className="card h-100">
            <div className="card-body">
              <p className="line-label">Insignias</p>
              <Insignias />
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card h-100">
            <div className="card-body">
              <p className="line-label">Barrios que seguís</p>
              <BarriosSeguidos usuarioId={user?.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Perfil
