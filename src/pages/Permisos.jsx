import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePermisos, recargarPermisos } from '../hooks/usePermisos'
import { getPermisosPanel, guardarPermiso } from '../services/participacionService'
import { ROLES_ASIGNABLES } from '../utils/roles'
import { PANELES } from '../utils/paneles'
import Icon from '../components/Icon'

// Interruptor accesible (mismo estilo que el de modo oscuro)
function Interruptor({ encendido, onCambio, etiqueta, deshabilitado }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={encendido}
      aria-label={etiqueta}
      className="permiso-interruptor"
      onClick={onCambio}
      disabled={deshabilitado}
    >
      <span className={`interruptor${encendido ? ' encendido' : ''}`} aria-hidden="true">
        <span />
      </span>
    </button>
  )
}

// Solo el dueño: define qué paneles ve y modifica cada rango.
// La base aplica estas reglas en cada panel (no solo esconde botones).
function Permisos() {
  const { user } = useAuth()
  const { esDueno, listo } = usePermisos(user?.id)

  // { "admin:bandeja": { ver, modificar } }
  const [permisos, setPermisos] = useState({})
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!esDueno) return

    getPermisosPanel()
      .then((filas) => {
        setPermisos(Object.fromEntries(filas.map((f) => [`${f.rol}:${f.panel}`, { ver: f.ver, modificar: f.modificar }])))
      })
      .catch((err) => {
        console.error('Error cargando permisos:', err)
        setError('No se pudieron cargar los permisos.')
      })
      .finally(() => setCargando(false))
  }, [esDueno])

  if (listo && !esDueno) {
    return <Navigate to="/" replace />
  }

  const cambiar = async (rol, panel, accion) => {
    const clave = `${rol}:${panel.clave}`
    const actual = permisos[clave] ?? { ver: false, modificar: false }

    // Modificar implica ver; sacar "ver" saca también "modificar"
    const nuevo = accion === 'ver'
      ? { ver: !actual.ver, modificar: actual.ver ? false : actual.modificar }
      : { ver: actual.ver || !actual.modificar, modificar: !actual.modificar }

    setPermisos((p) => ({ ...p, [clave]: nuevo }))
    setGuardando(clave)
    setError('')

    try {
      await guardarPermiso(rol, panel.clave, nuevo.ver, nuevo.modificar)
      recargarPermisos()
    } catch (err) {
      console.error('Error guardando permiso:', err)
      setPermisos((p) => ({ ...p, [clave]: actual }))
      setError('No se pudo guardar el cambio. Probá de nuevo.')
    } finally {
      setGuardando('')
    }
  }

  return (
    <div className="container py-5">
      <span className="eyebrow">Solo para vos</span>
      <h1 className="page-title mb-2">Permisos</h1>
      <p className="text-muted mb-4">
        Elegí qué paneles ve y modifica cada rango. Los cambios se guardan al instante y la base de
        datos los aplica en cada panel. Inicio lo ven todos; vos, como dueño, siempre tenés acceso a todo.
      </p>

      {error && <div className="alert alert-danger">{error}</div>}
      {(cargando || !listo) && <p className="text-muted">Cargando permisos...</p>}

      {!cargando && (
        <div className="permisos-grid">
          {ROLES_ASIGNABLES.map(([rol, nombre]) => {
            const habilitados = PANELES.filter((p) => permisos[`${rol}:${p.clave}`]?.ver).length

            return (
              <section className="card permisos-rol" key={rol} aria-labelledby={`permisos-${rol}`}>
                <header className="permisos-rol-cabecera">
                  <span className={`permisos-anillo rol-${rol}`} aria-hidden="true" />
                  <div>
                    <h2 id={`permisos-${rol}`}>{nombre}</h2>
                    <small>{habilitados} de {PANELES.length} paneles visibles</small>
                  </div>
                </header>

                <div className="permisos-encabezado" aria-hidden="true">
                  <span>Panel</span>
                  <span>Ver</span>
                  <span>Modificar</span>
                </div>

                <ul className="permisos-lista">
                  {PANELES.map((panel) => {
                    const clave = `${rol}:${panel.clave}`
                    const valor = permisos[clave] ?? { ver: false, modificar: false }

                    return (
                      <li key={panel.clave} className={valor.ver ? '' : 'apagado'}>
                        <span className="permisos-panel">
                          <Icon name={panel.icono} size={18} />
                          <span>
                            <strong>{panel.nombre}</strong>
                            <small>{panel.modificar ?? 'Solo lectura'}</small>
                          </span>
                        </span>

                        <Interruptor
                          encendido={valor.ver}
                          etiqueta={`${nombre}: ver ${panel.nombre}`}
                          onCambio={() => cambiar(rol, panel, 'ver')}
                          deshabilitado={guardando === clave}
                        />

                        {panel.modificar ? (
                          <Interruptor
                            encendido={valor.modificar}
                            etiqueta={`${nombre}: modificar ${panel.nombre} (${panel.modificar.toLowerCase()})`}
                            onCambio={() => cambiar(rol, panel, 'modificar')}
                            deshabilitado={guardando === clave}
                          />
                        ) : (
                          <span className="permisos-na" title="Este panel es de solo lectura">—</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Permisos
