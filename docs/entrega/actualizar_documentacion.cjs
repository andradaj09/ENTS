// Actualiza la documentación general (documentacion.html) con los mismos
// datos de los entregables (entregables/datos.cjs): historial, glosario,
// actividades con responsables, Gantt, requisitos, historias de usuario y roles.
// Uso: node entregables/generar.cjs && node actualizar_documentacion.cjs
const fs = require('fs')
const path = require('path')
const D = require('./entregables/datos.cjs')
const gantt = require('./entregables/_gantt_fragmento.json')

const ARCHIVO = path.join(__dirname, 'documentacion.html')
let html = fs.readFileSync(ARCHIVO, 'utf8').split('\r').join('')

// Reemplaza una sola vez y avisa si el texto ya no existe (nada queda a medias)
function reemplazar(buscar, poner) {
  const encontrado = typeof buscar === 'string' ? html.includes(buscar) : buscar.test(html)
  if (!encontrado) throw new Error('No se encontró: ' + String(buscar).slice(0, 80))
  html = html.replace(buscar, poner)
}

const corto = (k) => D.EQUIPO[k].nombre.split(',')[0]
const nivel = (p) => `<span class="nivel ${p === 'Alta' ? 'alta' : p === 'Media' ? 'media' : 'baja'}">${p}</span>`
const tabla = (cab, filas, anchos = [], clase = '') => `<table${clase ? ` class="${clase}"` : ''}>
  <thead><tr>${cab.map((c, i) => `<th${anchos[i] ? ` style="width:${anchos[i]}"` : ''}>${c}</th>`).join('')}</tr></thead>
  <tbody>
    ${filas.map((f) => `<tr>${f.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('\n    ')}
  </tbody>
</table>`

// ---------- Carátula ----------
reemplazar('Carrera: <span class="completar">[completar]</span>', 'Carrera: Analista Programador')
reemplazar('<tr><td>Fecha de entrega</td><td><span class="completar">[__/__/____]</span></td></tr>', `<tr><td>Director del proyecto</td><td>${D.DIRECTOR}</td></tr>`)

// ---------- Historial ----------
reemplazar(/(<h1 id="historial">Historial de revisión<\/h1>\n)<table>[\s\S]*?<\/table>\n<p class="pie">[^<]*<\/p>/, `$1${tabla(['Versión', 'Fecha y hora', 'Autor', 'Detalle de la modificación'], [
  ['1.0', 'Sprint 0 (*)', 'Equipo', 'Propuesta original: plataforma solidaria de donaciones (Project Charter, alcance, EDT, plan de comunicación, Gantt, product backlog y arquitectura).'],
  ['2.0', '12/10/2026 16:42', D.DIRECTOR, 'Reorientación del proyecto: el módulo de pagos y donaciones se reemplaza por un sistema de peticiones con clasificación automática, firmas, score de urgencia, detección de similares y reportes. Documentación del sistema implementado.'],
  ['3.0', '12/10/2026 21:32', D.DIRECTOR, 'Revisión integral para la entrega: glosario al comienzo, responsables y horas, rol moderador y permisos por panel, requisitos e historias de usuario con trazabilidad, sprints en el Gantt y eliminación de todos los campos pendientes.'],
], ['9%', '18%', '20%'])}
<p class="pie">(*) La versión 1.0 se elaboró durante el Sprint 0, antes de que el equipo usara control de versiones, por lo que su fecha y hora exactas no quedaron registradas. Desde la versión 2.0, cada cambio se registra con fecha, hora y autor.</p>`)

// ---------- Índice: el glosario va primero ----------
reemplazar('  <li><a href="#introduccion">1. Introducción</a></li>', '  <li><a href="#glosario">Glosario</a></li>\n  <li><a href="#introduccion">1. Introducción</a></li>')

// ---------- 3.1 Contexto: sin notas pendientes ----------
reemplazar(/<div class="nota">Incorporar aquí los resultados[\s\S]*?<\/div>/, '<p>El cuestionario, las respuestas y el análisis completos forman parte de la versión 1.0 del proyecto (documento "Everyone Needs To Smile", Sprint 0). De ellos se tomaron tres conclusiones que guían esta versión: los problemas se viven y se reclaman a nivel de barrio; los vecinos no saben qué pasa con sus reclamos; y los mismos temas —salud, seguridad, infraestructura, servicios y ambiente— se repiten en distintas zonas. Esas conclusiones dan origen a las 16 categorías de petición, al enfoque por barrio y al seguimiento visible de cada respuesta.</p>')

// ---------- 3.2 Charter: equipo con roles y horas ----------
reemplazar('<tr><td><b>Equipo</b></td><td>Jiménez, Ignacio · Andrada, Juan Pablo · Patrón, Máximo</td></tr>', `<tr><td><b>Equipo</b></td><td>${Object.values(D.EQUIPO).map((p) => `${p.nombre}: ${p.rol.toLowerCase()}`).join('<br>')}</td></tr>`)
reemplazar('Humanos: 3 integrantes.', `Humanos: 3 integrantes, ≈ ${Math.round(D.HORAS_TOTALES)} horas estimadas en actividades (ver Entregable 1, sección 11.2).`)

// ---------- 3.3 Alcance: cinco roles ----------
reemplazar('<li>Roles: vecino, funcionario por área, administrador y dueño.</li>', '<li>Roles: vecino, funcionario por área, moderador, administrador y dueño, con permisos por panel definidos por el dueño.</li>')

// ---------- 3.5 Actividades con responsables ----------
reemplazar(/(<h2 id="actividades">3\.5 Lista de actividades<\/h2>\n)<p>[\s\S]*?<\/p>\n<table>[\s\S]*?<\/table>\n<div class="nota">[^<]*<\/div>/, `$1<p>Duraciones en días hábiles de trabajo del equipo. Las predecesoras indican qué actividades deben terminar antes de empezar la siguiente (dependencia fin-comienzo). En negrita, las actividades de la ruta crítica. Entre paréntesis, los integrantes que participan junto al responsable.</p>
${tabla(['ID', 'Actividad', 'EDT', 'Duración', 'Predecesoras', 'Responsable'], D.ACTIVIDADES.map((a) => [a.critica ? `<b>${a.id}</b>` : a.id, a.nombre, a.edt.join(', '), a.dur, a.pred.join(', ') || '—', `${corto(a.resp)}${a.part.length ? ` (${a.part.map(corto).join(', ')})` : ''}`]), ['6%', '', '10%', '8%', '12%', '19%'])}`)

// ---------- 3.7 Comunicación: frecuencias y canales definidos ----------
reemplazar('<td>Reunión breve + grupo de mensajería</td><td>2 veces por semana</td>', '<td>Reunión de seguimiento + WhatsApp</td><td>Lunes, miércoles y viernes</td>')
reemplazar('<td>Tablero de tareas</td><td>Inicio de sprint</td>', '<td>Google Meet + Trello</td><td>Inicio de sprint (cada 2 semanas)</td>')
reemplazar('<td>Exportes Excel / PDF</td><td>Periódica</td>', '<td>Exportes Excel / PDF por correo</td><td>Mensual</td>')
reemplazar('<div class="caja"><b>Equipo</b><br>mensajería, GitHub, tablero</div>', '<div class="caja"><b>Equipo</b><br>WhatsApp, GitHub, Trello</div>')

// ---------- 3.8 Gantt con sprints y responsables ----------
reemplazar(/<div class="gantt">[\s\S]*?<div class="g-leyenda">[\s\S]*?<\/div>/, gantt.graficoGantt.trim())
reemplazar(/  \.gantt \{ border: 0\.8pt[\s\S]*?\.g-leyenda i\.rombo \{[^}]*\}\n/, gantt.estiloGantt.replace(/^\n/, '') + '\n')
reemplazar('Las fechas reales de cada entrega de código figuran en el Anexo B.', 'Las barras muestran el responsable de cada actividad y las líneas más marcadas, el comienzo de cada sprint de 2 semanas. Las fechas reales de cada entrega de código figuran en el Anexo A.')

// ---------- 3.9 Requisitos, historias de usuario y trazabilidad ----------
reemplazar(/<h2 id="backlog">[\s\S]*?(?=<h2 id="arquitectura">)/, `<h2 id="backlog">3.9 Requerimientos y product backlog</h2>
<h3>Requerimientos funcionales (RF)</h3>
<p>Describen lo que el sistema debe hacer. Prioridad <b>Alta</b> = imprescindible para que el sistema cumpla su propósito; <b>Media</b> = aporta valor importante; <b>Baja</b> = mejora deseable que se construye al final.</p>
${tabla(['ID', 'Requerimiento', 'Prioridad'], D.RF.map(([id, t, p]) => [`<b>${id}</b>`, t, nivel(p)]), ['8%', '', '11%'])}
<h3>Requerimientos no funcionales (RNF)</h3>
<p>Describen cualidades que el sistema debe tener, independientemente de lo que hace.</p>
${tabla(['ID', 'Atributo', 'Requerimiento'], D.RNF.map(([id, a, t]) => [`<b>${id}</b>`, a, t]), ['9%', '16%'])}
<h3>Product backlog (historias de usuario)</h3>
<p>Cada historia de usuario (HU) expresa una necesidad con la forma <i>"Como [rol], quiero [acción] para [beneficio]"</i>, con criterios de aceptación verificables. La última columna indica qué requerimientos funcionales la implementan (trazabilidad).</p>
${tabla(['ID', 'Historia de usuario', 'Criterios de aceptación', 'Prioridad', 'RF'], D.HU.map(([id, rol, quiero, para, crit, p, rf]) => [`<b>${id}</b>`, `Como <b>${rol}</b>, quiero ${quiero} para ${para}.`, crit, nivel(p), rf.join(', ')]), ['7%', '33%', '', '10%', '10%'])}
<p class="pie">Todos los requerimientos funcionales están cubiertos por al menos una historia de usuario (detalle en el Entregable 2, sección 6).</p>

`)

// ---------- 3.10 y 3.11: paquetes y modelo de datos ----------
reemplazar('Bandeja, Estadísticas, Moderación, Usuarios, Perfil, Acceso.', 'Bandeja, Estadísticas, Moderación, Usuarios, Perfil, Documentos, Permisos y Acceso.')
reemplazar('Base relacional en PostgreSQL con 13 tablas.', 'Base relacional en PostgreSQL con 14 tablas.')
reemplazar(/(<div class="entidad"><div class="nom">publicaciones \/ eventos<\/div>[\s\S]*?<\/div><\/div>)/, '$1\n  <div class="entidad"><div class="nom">permisos_panel</div><div class="cols">rol (PK)<br>panel (PK)<br>ver, modificar<br><i>solo la edita el dueño</i></div></div>')

// ---------- 3.13 Roles y permisos ----------
reemplazar(/(<h2 id="seguridad">3\.13 Autenticación, roles y seguridad<\/h2>\n)<table>[\s\S]*?<\/table>/, `$1${tabla(['Rol', 'Qué puede hacer (configuración inicial)'], [
  ['Vecino', 'Crear, firmar y comentar peticiones; seguir barrios; publicar en el muro; ver mapa, eventos y estadísticas públicas. Es anónimo para los demás vecinos.'],
  ['Funcionario', 'Todo lo del vecino, más la bandeja de su área: ve autor y firmantes, responde y cambia la etapa de las peticiones de su área. Lo aprueba un administrador.'],
  ['Moderador', 'Todo lo del vecino, más revisar peticiones pendientes, comentarios denunciados y publicaciones del muro. No administra usuarios ni ve el panel analítico.'],
  ['Administrador', 'Todo lo del moderador y del funcionario (en todas las áreas), más el directorio de usuarios, la asignación de áreas, la agenda de eventos y el panel analítico.'],
  ['Dueño (CEO)', 'Una única cuenta de administrador que además cambia el rol de cada cuenta, define los permisos por panel y accede a los documentos privados del proyecto.'],
], ['18%'])}
<p><b>Permisos por panel.</b> La tabla anterior describe la configuración inicial. Desde la pantalla "Permisos", el dueño decide para cada rol y cada panel (mis solicitudes, mapa, comunidad, estadísticas, eventos, perfil, bandeja, moderación, usuarios, panel analítico y documentos) si puede verlo y si puede modificar en él. La configuración se guarda en la tabla <code>permisos_panel</code> y la base de datos la aplica en sus reglas y funciones, por lo que no alcanza con ocultar un botón en la pantalla.</p>`)
reemplazar('(responder, moderar, cambiar rol, estadísticas de administración) verifican el rol dentro de la base.', '(responder, moderar, cambiar rol o permisos, estadísticas de administración) verifican el rol y los permisos por panel dentro de la base.')

// ---------- 3.15 Pruebas ----------
reemplazar('43 pruebas con Vitest sobre prioridad, orden del inicio, clasificación, detección de barrio, moderación de textos, áreas del mapa y exportación.', '49 pruebas con Vitest sobre prioridad, orden del inicio, clasificación, detección de barrio, moderación de textos, áreas del mapa, exportación y permisos de cada rol.')

// ---------- Anexo: el glosario pasa al comienzo; se reordenan las letras ----------
reemplazar(/<h2>A\. Glosario<\/h2>\n<table>[\s\S]*?<\/table>\n/, '')
reemplazar('<h2>B. Hitos reales del repositorio</h2>', '<h2>A. Hitos reales del repositorio</h2>')
reemplazar('<h2>C. Fórmula del score de urgencia (extracto del esquema)</h2>', '<h2>B. Fórmula del score de urgencia (extracto del esquema)</h2>')
reemplazar('<h2>D. Puesta en marcha local</h2>', '<h2>C. Puesta en marcha local</h2>')
reemplazar('<h2>E. Enlaces</h2>', '<h2>D. Enlaces</h2>')
reemplazar('cambio de roles; rendimiento en celulares; score de urgencia automático.', 'cambio de roles; rendimiento en celulares; score de urgencia automático; rol moderador y permisos por panel definidos por el dueño.')

// ---------- Glosario al comienzo (términos que usa el documento) ----------
const texto0 = html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')
let texto = texto0
let usados = []
for (;;) {
  const nuevos = D.GLOSARIO.filter(([, , r]) => r.test(texto))
  if (nuevos.length === usados.length) break
  usados = nuevos
  texto = texto0 + ' ' + usados.map(([, d]) => d).join(' ')
}
usados.sort((a, b) => a[0].localeCompare(b[0], 'es', { sensitivity: 'base' }))
reemplazar('<!-- ===================== 1. INTRODUCCIÓN ===================== -->', `<!-- ===================== GLOSARIO ===================== -->
<h1 id="glosario">Glosario</h1>
<p>Siglas y términos que se usan en este documento, ordenados alfabéticamente. Cada uno se explica en lenguaje simple para que el documento pueda leerse sin conocimientos técnicos previos.</p>
${tabla(['Término', 'Significado'], usados.map(([t, d]) => [`<b>${t}</b>`, d]), ['26%'], 'glosario')}

<!-- ===================== 1. INTRODUCCIÓN ===================== -->`)
reemplazar('  .completar { background: #fff1c2; padding: 0 3pt; border-radius: 2pt; }', `  .completar { background: #fff1c2; padding: 0 3pt; border-radius: 2pt; }
  .nivel { display: inline-block; padding: 0 5pt; border-radius: 8pt; font-size: 8pt; font-weight: 600; }
  .nivel.alta { background: #fbe0d4; color: #8a3418; } .nivel.media { background: #fdefc8; color: #6b4d00; } .nivel.baja { background: #d8efe2; color: #1f5f3f; }
  .sec { color: var(--gris); font-size: 0.9em; }
  table.glosario td { padding: 3pt 6pt; } table.glosario td:first-child { color: var(--marino); }`)

fs.writeFileSync(ARCHIVO, html)
console.log('documentacion.html actualizado ·', usados.length, 'términos en el glosario')
if (html.includes('class="completar"')) console.log('ATENCIÓN: quedan campos para completar')
