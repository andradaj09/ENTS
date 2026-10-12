import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { getUsuariosAdmin } from '../services/petitionService'
import { asignarArea, cambiarRol, getAreas, soyDueno } from '../services/participacionService'
import { useAuth } from '../contexts/AuthContext'
import { normalizar } from '../utils/clasificador'
import { nombreRol } from '../utils/roles'
import { tiempoRelativo } from '../utils/format'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'

const FILTROS_ROL = [
  ['todos', 'Todos'],
  ['ciudadano', 'Vecinos'],
  ['funcionario', 'Funcionarios'],
  ['admin', 'Admins'],
  ['solicitud', 'Solicitudes pendientes'],
]

const formatoFecha = (fecha) =>
  fecha ? new Date(fecha).toLocaleDateString('es-AR') : '—'

// Directorio completo de usuarios: solo para administradores.
// La base de datos verifica el rol (usuarios_admin), no solo esta pantalla.
function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState('todos')
  const [areas, setAreas] = useState([])
  const { user } = useAuth()
  const [esDueno, setEsDueno] = useState(false)
  const [aviso, setAviso] = useState('')

  const busquedaDiferida = normalizar(useDeferredValue(busqueda).trim())

  // Solo el dueño del proyecto ve el selector de rol (la base lo vuelve a verificar)
  useEffect(() => {
    soyDueno().then(setEsDueno).catch(() => setEsDueno(false))
  }, [])

  const ROLES = [
    ['ciudadano', 'Vecino/a'],
    ['funcionario', 'Funcionario/a'],
    ['admin', 'Administrador/a'],
  ]

  const elegirRol = async (usuario, rol) => {
    if (rol === usuario.rol) return

    const nombre = `${usuario.nombre} ${usuario.apellido}`
    const avisoAdmin = rol === 'admin'
      ? '\n\nVa a poder moderar, ver los datos de todas las cuentas y el panel analítico.'
      : ''
    if (!window.confirm(`¿Cambiar a ${nombre} de ${nombreRol(usuario.rol)} a ${nombreRol(rol)}?${avisoAdmin}`)) return

    try {
      setAviso('')
      await cambiarRol(usuario.id, rol)
      setUsuarios((actuales) => actuales.map((u) => (u.id === usuario.id
        ? { ...u, rol, rol_solicitado: null, area_id: rol === 'funcionario' ? u.area_id : null }
        : u)))
      setAviso(`${nombre} ahora es ${nombreRol(rol).toLowerCase()}.`)
    } catch (err) {
      console.error('Error cambiando rol:', err)
      setError(err.message?.includes('dueño') ? 'Solo el dueño del proyecto puede cambiar roles.' : 'No se pudo cambiar el rol.')
    }
  }

  useEffect(() => {
    getAreas().then(setAreas).catch((err) => console.error('Error cargando áreas:', err))
  }, [])

  // El área define qué peticiones ve y responde el funcionario en su bandeja
  const cambiarArea = async (usuario, valor) => {
    const areaId = valor ? Number(valor) : null

    try {
      await asignarArea(usuario.id, areaId)
      setUsuarios((actuales) => actuales.map((u) => (u.id === usuario.id ? { ...u, area_id: areaId } : u)))
    } catch (err) {
      console.error('Error asignando área:', err)
      setError('No se pudo asignar el área.')
    }
  }

  useEffect(() => {
    getUsuariosAdmin()
      .then(setUsuarios)
      .catch((err) => {
        console.error('Error cargando usuarios:', err)
        setError('No se pudo cargar el directorio de usuarios.')
      })
      .finally(() => setLoading(false))
  }, [])

  const filtrados = useMemo(() => usuarios.filter((usuario) => {
    const coincideRol =
      filtroRol === 'todos' ||
      (filtroRol === 'solicitud' ? usuario.rol_solicitado === 'funcionario' : usuario.rol === filtroRol)

    const texto = normalizar(
      `${usuario.nombre} ${usuario.apellido} ${usuario.email} ${usuario.cargo ?? ''} ${usuario.organizacion ?? ''}`
    )

    return coincideRol && (!busquedaDiferida || texto.includes(busquedaDiferida))
  }), [usuarios, filtroRol, busquedaDiferida])

  return (
    <div className="container py-5">
      <span className="eyebrow">Panel de administración</span>
      <h1 className="page-title mb-2">Usuarios</h1>
      <p className="text-muted mb-4">
        Información completa de cada cuenta. Entre vecinos todos son anónimos:
        estos datos solo los ven los administradores.
      </p>

      <label className="usuarios-buscador">
        <Icon name="search" size={18} />
        <input
          type="search"
          placeholder="Buscar por nombre, correo, cargo u organismo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </label>

      <div className="chip-filter mb-4">
        {FILTROS_ROL.map(([valor, etiqueta]) => (
          <button
            key={valor}
            className={filtroRol === valor ? 'active' : ''}
            onClick={() => setFiltroRol(valor)}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {loading && <p className="text-muted">Cargando usuarios...</p>}

      {error && <div className="alert alert-danger">{error}</div>}
      {aviso && <div className="alert alert-success">{aviso}</div>}

      {esDueno && (
        <p className="text-muted small">
          <Icon name="lock" size={14} className="me-1" />
          Como dueño del proyecto podés cambiar el rol de cada cuenta. Ningún otro administrador puede hacerlo.
        </p>
      )}

      {!loading && !error && (
        <p className="text-muted small">
          {filtrados.length} de {usuarios.length} {usuarios.length === 1 ? 'usuario' : 'usuarios'}
        </p>
      )}

      {!loading && !error && filtrados.length === 0 && (
        <div className="empty-state">
          <p className="text-muted mb-0">Ningún usuario coincide con la búsqueda.</p>
        </div>
      )}

      <div className="row g-3">
        {filtrados.map((usuario) => (
          <div className="col-12 col-xl-6" key={usuario.id}>
            <div className="card h-100">
              <div className="card-body">
                <div className="usuario-cabecera">
                  <Avatar perfil={usuario} size={52} />

                  <div className="usuario-nombre">
                    <strong>{usuario.nombre} {usuario.apellido}</strong>
                    <a href={`mailto:${usuario.email}`}>{usuario.email}</a>
                  </div>

                  <div className="usuario-etiquetas">
                    <span className={`badge rol-${usuario.rol}`}>{nombreRol(usuario.rol)}</span>
                    {usuario.rol_solicitado === 'funcionario' && (
                      <span className="badge text-bg-light">Pide ser funcionario</span>
                    )}
                    {!usuario.correo_confirmado && (
                      <span className="badge text-bg-light">Correo sin confirmar</span>
                    )}
                  </div>
                </div>

                {(usuario.cargo || usuario.organizacion) && (
                  <div className="info-row">
                    <span>Cargo</span>
                    <span>
                      {[usuario.cargo, usuario.organizacion].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                )}

                {usuario.rol === 'funcionario' && (
                  <div className="info-row align-items-center">
                    <span>Área</span>
                    <select
                      className="form-select form-select-sm w-auto"
                      value={usuario.area_id ?? ''}
                      onChange={(e) => cambiarArea(usuario, e.target.value)}
                      aria-label={`Área de ${usuario.nombre}`}
                    >
                      <option value="">Todas las áreas</option>
                      {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                    </select>
                  </div>
                )}

                {esDueno && usuario.id !== user?.id && (
                  <div className="info-row align-items-center">
                    <span>Rol</span>
                    <select
                      className="form-select form-select-sm w-auto"
                      value={usuario.rol}
                      onChange={(e) => elegirRol(usuario, e.target.value)}
                      aria-label={`Rol de ${usuario.nombre}`}
                    >
                      {ROLES.map(([valor, nombre]) => <option key={valor} value={valor}>{nombre}</option>)}
                    </select>
                  </div>
                )}

                <div className="info-row">
                  <span>Registrado</span>
                  <span>{formatoFecha(usuario.registrado)}</span>
                </div>

                <div className="info-row">
                  <span>Último ingreso</span>
                  <span>{usuario.ultimo_ingreso ? tiempoRelativo(usuario.ultimo_ingreso) : 'Nunca'}</span>
                </div>

                <div className="usuario-actividad">
                  <div>
                    <strong>{usuario.peticiones}</strong>
                    <span>Peticiones</span>
                  </div>
                  <div>
                    <strong>{usuario.firmas}</strong>
                    <span>Firmas</span>
                  </div>
                  <div>
                    <strong>{usuario.publicaciones}</strong>
                    <span>Publicaciones</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Usuarios
