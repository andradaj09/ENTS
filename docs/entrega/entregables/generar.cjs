// Genera los 7 entregables de gestión de ENTS y el documento combinado.
// Todos salen de los mismos datos (datos.cjs), así actividades, duraciones,
// responsables, ruta crítica y glosario coinciden en todos los documentos.
// Uso: node generar.cjs   → escribe los .html en esta carpeta
const fs = require('fs')
const path = require('path')
const D = require('./datos.cjs')

const AQUI = __dirname
const {
  EQUIPO, DIRECTOR, HORAS_RESPONSABLE, HORAS_PARTICIPANTE, ACTIVIDADES, porId, DURACION_TOTAL, SEMANAS,
  RUTA, HORAS, HORAS_TOTALES, SPRINTS, sprintDeDia, EDT, CANTIDAD_PAQUETES, RF, RNF, HU, GLOSARIO,
} = D

// ---------------- Datos de la revisión ----------------
const CARRERA = 'Analista Programador'
const VERSION = '3.0'
const FECHA_V2 = '12/10/2026 16:41'
const FECHA_V3 = '12/10/2026 21:32'

// Reuniones (estimación del equipo): minutos por persona
const MIN_SEGUIMIENTO = 15 * 3 * SEMANAS // 3 por semana
const MIN_SPRINT = (45 + 30 + 20) * SPRINTS.length // planificación + revisión + retrospectiva
const HORAS_REUNIONES = Math.round((MIN_SEGUIMIENTO + MIN_SPRINT) / 60 * 10) / 10

const nombre = (k) => EQUIPO[k].nombre
const corto = (k) => EQUIPO[k].nombre.split(',')[0]
const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','))
const nivel = (p) => `<span class="nivel ${p === 'Alta' || p === 'Alto' ? 'alta' : p === 'Media' || p === 'Medio' ? 'media' : 'baja'}">${p}</span>`

// ---------------- Piezas comunes ----------------
// Anillos concéntricos del logo, como marca de agua de la portada
const ANILLOS = `<svg class="portada-anillos" viewBox="0 0 200 200" aria-hidden="true">
  ${[92, 76, 61, 47, 34, 22].map((r, i) => `<ellipse cx="${100 + i * 1.6}" cy="${100 - i * 1.2}" rx="${r}" ry="${r * 0.9}" transform="rotate(${-18 + i * 9} 100 100)" fill="none" stroke="#fff" stroke-width="${3.4 - i * 0.3}"/>`).join('')}
</svg>`

// Portada a página completa; la usan los entregables y la documentación general
function portada({ tipo, titulo, subtitulo, datos, logo = '../../../public/logo.svg' }) {
  return `
<section class="portada">
  <div class="portada-arriba">
    ${ANILLOS}
    <div class="portada-inst">Instituto Cervantes<small>Carrera ${CARRERA} · Cátedra Práctica Profesionalizante</small></div>
    <div class="portada-centro">
      <div class="portada-logo"><img src="${logo}" alt=""></div>
      <div class="portada-tipo">${tipo}</div>
      <h1 class="portada-titulo">${titulo}</h1>
      <div class="portada-sub">${subtitulo}</div>
    </div>
  </div>
  <div class="portada-abajo">
    <div class="portada-datos">
      ${datos.map(([k, v]) => `<div class="portada-dato"><small>${k}</small><span>${v}</span></div>`).join('')}
    </div>
    <div class="portada-autores">
      <small>Autores</small>
      <div>${Object.values(EQUIPO).map((p) => `<div class="portada-autor"><b>${p.nombre}</b><span>Legajo ${p.legajo}</span></div>`).join('')}</div>
    </div>
  </div>
</section>`
}

function caratula({ numero, titulo, subtitulo, codigo, total = 7 }) {
  return portada({
    tipo: numero ? `Entregable ${numero} de ${total}` : 'Entregables de gestión',
    titulo,
    subtitulo,
    datos: [
      ['Proyecto', 'ENTS — Peticiones vecinales'],
      ['Docente', 'Ing. Loza'],
      ['Director del proyecto', DIRECTOR],
      ['Código', codigo],
      ['Versión', VERSION],
      ['Sitio publicado', 'entscordoba.netlify.app'],
    ],
  })
}

function historial(detalleV2, detalleV3) {
  return `
<h1 class="salto">Historial de revisión</h1>
<table>
  <thead><tr><th style="width:9%">Versión</th><th style="width:19%">Fecha y hora</th><th style="width:20%">Autor</th><th>Modificación</th></tr></thead>
  <tbody>
    <tr><td>1.0</td><td>Sprint 0 (*)</td><td>Equipo</td><td>Versión original, para la propuesta de plataforma solidaria de donaciones.</td></tr>
    <tr><td>2.0</td><td>${FECHA_V2}</td><td>${DIRECTOR}</td><td>${detalleV2}</td></tr>
    <tr><td>3.0</td><td>${FECHA_V3}</td><td>${DIRECTOR}</td><td>${detalleV3}</td></tr>
  </tbody>
</table>
<p class="pie">(*) La versión 1.0 se elaboró durante el Sprint 0, antes de que el equipo usara control de versiones, por lo que su fecha y hora exactas no quedaron registradas. Desde la versión 2.0, cada cambio se registra con fecha, hora y autor.</p>`
}

const DETALLE_V3 = 'Revisión integral para la entrega: glosario de siglas y términos, propósito y guía de lectura, responsables y horas estimadas, roles actualizados (moderador y permisos por panel) y eliminación de todos los campos pendientes.'

// Índice en tarjetas: el glosario no lleva número; las secciones, el suyo
const indice = (items) => {
  let n = 0
  return `<div class="toc-titulo salto">Contenido</div><ol class="toc">${items.map((i) => (i === 'Glosario'
    ? '<li class="toc-glosario"><span>G</span>Glosario</li>'
    : `<li><span>${++n}</span>${i}</li>`)).join('')}</ol>`
}

// Número de sección en un chip: <h1>3. Título</h1> → <h1><span class="num">3</span>Título</h1>
const chips = (html) => html.replace(/<h1([^>]*)>(\d+)\.\s+/g, '<h1$1><span class="num">$2</span>')

const FUENTES = '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">'

const tabla = (cabeceras, filas, anchos = [], clase = '') => `
<table${clase ? ` class="${clase}"` : ''}>
  <thead><tr>${cabeceras.map((c, i) => `<th${anchos[i] ? ` style="width:${anchos[i]}"` : ''}>${c}</th>`).join('')}</tr></thead>
  <tbody>${filas.map((f) => `<tr>${f.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
</table>`

// Guía de lectura: qué es el documento, para qué sirve y cómo se relaciona con los demás
const guia = ({ que, paraQue, relacion }) => `
<div class="guia">
  <p><b>Qué es este documento.</b> ${que}</p>
  <p><b>Para qué sirve.</b> ${paraQue}</p>
  <p style="margin:0"><b>Relación con los demás entregables.</b> ${relacion}</p>
</div>`

// Glosario con los términos que efectivamente aparecen en el texto
const textoPlano = (html) => html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')

function glosarioDe(html, titulo = 'Glosario') {
  // Se repite hasta que no aparezcan términos nuevos: una definición puede
  // usar otra sigla (por ejemplo, "Netlify… con HTTPS") que también se explica
  let texto = textoPlano(html)
  let usados = []
  for (;;) {
    const nuevos = GLOSARIO.filter(([, , regex]) => regex.test(texto))
    if (nuevos.length === usados.length) break
    usados = nuevos
    texto += ' ' + usados.map(([, d]) => d).join(' ')
  }
  usados.sort((a, b) => a[0].localeCompare(b[0], 'es', { sensitivity: 'base' }))
  return `
<h1>${titulo}</h1>
<p>Siglas y términos que se usan en este documento, ordenados alfabéticamente. Cada uno se explica en lenguaje simple para que el documento pueda leerse sin conocimientos técnicos previos.</p>
${tabla(['Término', 'Significado'], usados.map(([t, d]) => [`<b>${t}</b>`, d]), ['26%'], 'glosario')}`
}

const firmas = (personas) => `
<div class="firmas">
  ${personas.map(([n, rol]) => `<div class="firma">Firma y aclaración<b>${n}</b>${rol} · Fecha: ____ / ____ / ________</div>`).join('')}
</div>`

const FIRMAS_TODOS = [['Ing. Loza', 'Docente — Patrocinador'], [DIRECTOR, 'Director del proyecto'], [nombre('MP'), 'Integrante del equipo'], [nombre('IJ'), 'Integrante del equipo']]

// El glosario va al principio: después del índice y la guía de lectura,
// antes de la sección 1. Incluye los términos que usa todo el documento.
function conGlosario(portada, contenido) {
  const corte = contenido.indexOf('<h1 class="salto">')
  const glosario = glosarioDe(portada + contenido)
  return `${portada}\n${contenido.slice(0, corte)}\n${glosario}\n${contenido.slice(corte)}`
}

function documento({ archivo, titulo, encabezado, portada, contenido, estiloExtra = '' }) {
  const cuerpo = conGlosario(portada, contenido)
  return {
    archivo, titulo, estiloExtra, portada, contenido,
    html: `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>ENTS — ${titulo}</title>
${FUENTES}
<link rel="stylesheet" href="estilos.css">
<style>
  @page { @top-left { content: "${encabezado}"; } }
${estiloExtra}
</style>
</head>
<body>
${chips(cuerpo)}
</body>
</html>
`,
  }
}

const lista = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`
const etiquetaResp = (a) => `${corto(a.resp)}${a.part.length ? ` <span class="sec">(con ${a.part.map(corto).join(' y ')})</span>` : ''}`

// =====================================================================
// 1. PROJECT CHARTER
// =====================================================================
const HITOS = [
  { id: 'H1', nombre: 'Reorientación del proyecto aprobada', dia: porId.get('A1').fin, real: 'Cumplido' },
  { id: 'H2', nombre: 'Project Charter y alcance aprobados', dia: porId.get('A2').fin, real: 'Cumplido (versión 2.0 de los entregables)' },
  { id: 'H3', nombre: 'Diseño completo: arquitectura, datos, seguridad e interfaz', dia: Math.max(porId.get('A7').fin, porId.get('A8').fin), real: 'Cumplido' },
  { id: 'H4', nombre: 'Primera versión funcional: autenticación, peticiones, firmas y moderación', dia: porId.get('A11').fin, real: 'Cumplido el 04/10/2026' },
  { id: 'H5', nombre: 'Procesamiento automático, seguimiento y reportes', dia: porId.get('A15').fin, real: 'Cumplido el 12/10/2026' },
  { id: 'H6', nombre: 'Producto completo y probado', dia: Math.max(porId.get('A16').fin, porId.get('A17').fin), real: 'Cumplido el 12/10/2026' },
  { id: 'H7', nombre: 'Documentación y presentación completas', dia: porId.get('A19').fin, real: 'Cumplido (versión 3.0)' },
  { id: 'H8', nombre: 'Entrega y defensa', dia: DURACION_TOTAL, real: 'Pendiente: fecha a definir por la cátedra' },
]
const semanaDe = (dia) => Math.max(1, Math.ceil(dia / 5))

const contenidoCharter = `
${indice(['Glosario', 'Información general del proyecto', 'Propósito y justificación', 'Descripción del proyecto y del producto', 'Objetivos y criterios de éxito', 'Requisitos de alto nivel', 'Alcance preliminar', 'Entregables principales', 'Supuestos y restricciones', 'Riesgos iniciales', 'Cronograma de hitos', 'Presupuesto y recursos', 'Interesados', 'Equipo, roles y autoridad', 'Aprobación'])}
${guia({
  que: 'El Project Charter (acta de constitución) es el documento que autoriza formalmente el inicio del proyecto. Resume por qué se hace, qué se espera lograr, con qué recursos y bajo qué condiciones.',
  paraQue: 'Deja por escrito el acuerdo entre el equipo y el patrocinador (el docente) antes de empezar a trabajar, y otorga al director del proyecto la autoridad para usar los recursos.',
  relacion: 'Es el primer entregable. El alcance que aquí se describe en forma preliminar se detalla en el Entregable 2 (Declaración de alcance); los hitos se calculan a partir del cronograma de los Entregables 4 y 7.',
})}

<h1 class="salto">1. Información general del proyecto</h1>
<table class="ficha"><tbody>
  <tr><td>Nombre del proyecto</td><td>ENTS — Everyone Needs To Smile</td></tr>
  <tr><td>Descripción breve</td><td>Plataforma web de peticiones vecinales para Córdoba y Villa Allende que procesa automáticamente los reclamos (categoría, barrio, urgencia y similares) y mide su resolución.</td></tr>
  <tr><td>Organización</td><td>Instituto Cervantes — carrera ${CARRERA}, cátedra Práctica Profesionalizante</td></tr>
  <tr><td>Patrocinador</td><td>Ing. Loza, docente de la cátedra</td></tr>
  <tr><td>Director del proyecto</td><td>${DIRECTOR}</td></tr>
  <tr><td>Equipo</td><td>${Object.values(EQUIPO).map((p) => p.nombre).join(' · ')}</td></tr>
  <tr><td>Duración planificada</td><td>${DURACION_TOTAL} días hábiles (≈ ${SEMANAS} semanas, ${SPRINTS.length} sprints de 2 semanas)</td></tr>
  <tr><td>Fechas de inicio y cierre</td><td>El cronograma se expresa en días hábiles relativos (día 0 = inicio). La fecha de cierre coincide con la defensa, que todavía no fue fijada por la cátedra; una vez confirmada, cada día hábil se convierte a fecha calendario (ver Entregable 7, sección "Conversión a fechas").</td></tr>
  <tr><td>Producto publicado</td><td>https://entscordoba.netlify.app</td></tr>
</tbody></table>

<h1>2. Propósito y justificación</h1>
<h2>2.1 Problema</h2>
<p>En los barrios de Córdoba los mismos problemas —baches, falta de alumbrado, basurales, inseguridad, falta de atención sanitaria— se reclaman una y otra vez, de manera individual y por canales dispersos. El vecino no sabe si alguien recibió su reclamo ni qué pasó con él, y los organismos públicos y las organizaciones sociales no cuentan con información ordenada por zona, urgencia y apoyo vecinal para decidir qué atender primero ni para rendir cuentas de lo realizado.</p>
<h2>2.2 Justificación de la reorientación</h2>
<p>La primera versión del proyecto (1.0) proponía una plataforma de donaciones. Durante el análisis se concluyó que el módulo de pagos implicaba integraciones con pasarelas de pago, obligaciones legales y trazabilidad de fondos desproporcionadas para un equipo de tres personas y el plazo de la cátedra, y que el mayor valor estaba en <b>ordenar y procesar la demanda vecinal</b>. Por eso el proyecto se reorientó hacia un sistema de peticiones ciudadanas que:</p>
${lista([
  'concentra los reclamos de un barrio en peticiones únicas, apoyadas con firmas;',
  'las procesa automáticamente: categoría, barrio, score de urgencia y detección de peticiones similares;',
  'las pone a disposición de las áreas del municipio para que respondan y registren el avance;',
  'genera reportes para organismos y ONG, y estadísticas públicas para la comunidad.',
])}
<p>La reorientación conserva lo ya trabajado —encuesta y estudio de necesidades, análisis socioeconómico de Córdoba, arquitectura en capas, base de datos SQL, autenticación y seguridad, y enfoque de evaluación de impacto— y reemplaza el módulo de pagos por el de reportes.</p>

<h1>3. Descripción del proyecto y del producto</h1>
<p>El proyecto consiste en analizar, diseñar, desarrollar, probar, publicar y documentar una aplicación web, instalable en el celular, compuesta por los siguientes módulos:</p>
${tabla(['Módulo', 'Descripción'], [
  ['Cuentas y roles', 'Registro e ingreso con correo o Google y recuperación de contraseña. Cinco roles: vecino, funcionario (por área), moderador, administrador y dueño. El dueño define qué paneles ve y modifica cada rol.'],
  ['Peticiones', 'Alta con texto, hasta 3 fotos y ubicación; moderación previa a la publicación.'],
  ['Procesamiento automático', 'Categoría según el texto, barrio según la ubicación, score de urgencia de 0 a 100, detección de peticiones similares y revisión de datos personales y lenguaje ofensivo.'],
  ['Firmas y prioridad', 'Una firma por persona; cinco niveles de prioridad según las firmas; elevación automática al área al llegar a 50.'],
  ['Seguimiento', 'Cinco etapas (recibida, en revisión, derivada, en obra, resuelta) con respuesta oficial y foto; avisos al autor y a los firmantes.'],
  ['Comunidad', 'Mapa por barrios, muro vecinal, agenda de eventos, comentarios anónimos y barrios seguidos.'],
  ['Reportes', 'Estadísticas públicas anónimas, panel analítico y exportación a Excel y PDF.'],
], ['26%'])}

<h1>4. Objetivos y criterios de éxito</h1>
<h2>4.1 Objetivo general</h2>
<p>Poner en funcionamiento una plataforma web que permita a los vecinos de Córdoba y Villa Allende visibilizar, apoyar y seguir la resolución de los problemas de su barrio, y que procese esa información para que los organismos prioricen y registren su respuesta.</p>
<h2>4.2 Objetivos específicos medibles</h2>
<p>Cada objetivo tiene un indicador (qué se mide) y una meta (el valor que hay que alcanzar para darlo por cumplido).</p>
${tabla(['#', 'Objetivo', 'Indicador', 'Meta', 'Resultado'], [
  ['1', 'Publicar la plataforma en la web y como app instalable.', 'Sitio en línea con HTTPS y manifiesto de app', 'Disponible al cierre', 'Cumplido'],
  ['2', 'Clasificar automáticamente cada petición nueva.', '% de peticiones con categoría, barrio y score asignados', '100%', 'Cumplido'],
  ['3', 'Cubrir el territorio de Córdoba y Villa Allende.', 'Barrios cargados con ubicación', '≥ 100 barrios', 'Cumplido (111)'],
  ['4', 'Completar el ciclo de la petición.', 'Etapas de seguimiento operativas', '5 de 5', 'Cumplido'],
  ['5', 'Garantizar la privacidad entre vecinos.', 'Pruebas de permisos por rol aprobadas', '100%', 'Cumplido'],
  ['6', 'Asegurar la calidad del código.', 'Pruebas automáticas aprobadas antes de publicar', '100%', 'Cumplido (49 de 49)'],
  ['7', 'Entregar la documentación de gestión.', 'Entregables completos', '7 de 7', 'Cumplido'],
], ['5%', '', '29%', '14%', '16%'])}
<h2>4.3 Criterios de éxito del proyecto</h2>
${lista([
  'El ciclo completo —pedir, firmar, priorizar, responder y resolver— funciona de punta a punta en el sitio publicado.',
  'Ningún vecino puede ver la identidad de otro vecino ni datos personales ajenos.',
  'La documentación cumple la estructura exigida por la cátedra y es aprobada por el docente.',
])}

<h1>5. Requisitos de alto nivel</h1>
<p>Los requisitos funcionales describen lo que el sistema hace; los no funcionales, las cualidades con que lo hace. Aquí se enumeran en forma resumida; el Entregable 2 los detalla y numera (RF01 a RF20 y RNF01 a RNF08).</p>
<div class="dos-col">
  <div class="tarjeta"><h4>Funcionales</h4>${lista(['Crear, moderar, firmar y comentar peticiones.', 'Asignar categoría, barrio y urgencia automáticamente.', 'Avisar peticiones similares antes de crear una nueva.', 'Registrar respuestas oficiales por área.', 'Notificar novedades a los interesados.', 'Mostrar mapa por barrios y estadísticas.', 'Exportar reportes para organismos.', 'Administrar roles y permisos por panel.'])}</div>
  <div class="tarjeta"><h4>No funcionales</h4>${lista(['Privacidad: anonimato entre vecinos.', 'Seguridad: reglas aplicadas en la base de datos y HTTPS.', 'Usabilidad: español, adaptable a celular y modo oscuro.', 'Accesibilidad: teclado, contraste y movimiento reducido.', 'Rendimiento: carga por partes y fluidez en celulares.', 'Mantenibilidad: pruebas automáticas y esquema versionado.'])}</div>
</div>

<h1>6. Alcance preliminar</h1>
<div class="dos-col">
  <div class="tarjeta"><h4>Dentro del alcance</h4>${lista(['Aplicación web e instalable (PWA).', 'Base de datos con reglas de seguridad por fila.', 'Procesamiento automático de peticiones.', 'Seguimiento, notificaciones y comentarios.', 'Mapa, comunidad y eventos.', 'Estadísticas, panel analítico y exportes.', 'Roles y permisos por panel.', 'Documentación y presentación del proyecto.'])}</div>
  <div class="tarjeta"><h4>Fuera del alcance</h4>${lista(['Pagos, donaciones o recaudación dentro de la plataforma.', 'Integración con sistemas internos del municipio.', 'Notificaciones por correo o SMS.', 'Aplicaciones nativas para las tiendas de Android o iOS.', 'Límites oficiales (polígonos) de cada barrio.'])}</div>
</div>
<p>El detalle completo, con los motivos de cada exclusión, está en el Entregable 2.</p>

<h1>7. Entregables principales</h1>
${tabla(['#', 'Entregable', 'Descripción'], [
  ['1', 'Aplicación web publicada', 'Sitio en producción con todos los módulos del alcance.'],
  ['2', 'Base de datos documentada', 'Esquema SQL completo y reproducible, con políticas y funciones.'],
  ['3', 'Repositorio de código', 'Código fuente versionado, con instrucciones de instalación y pruebas.'],
  ['4', 'Entregables de gestión', 'Project Charter, declaración de alcance, EDT, lista y diccionario de actividades, plan de comunicación y diagrama de Gantt.'],
  ['5', 'Documentación técnica', 'Requerimientos, arquitectura, modelo de datos, seguridad, pruebas e implementación.'],
  ['6', 'Presentación', 'Exposición del proyecto para la defensa, con su guion.'],
], ['5%', '30%'])}

<h1>8. Supuestos y restricciones</h1>
<p>Un <b>supuesto</b> es una condición que se da por cierta para planificar; si deja de cumplirse, se convierte en un riesgo. Una <b>restricción</b> es un límite que el proyecto no puede superar.</p>
<h2>8.1 Supuestos</h2>
${lista([
  'Los vecinos cuentan con un celular o computadora con conexión a internet y un navegador actualizado.',
  'Los servicios en la nube elegidos (GitHub, Supabase, Netlify, OpenStreetMap) mantienen sus planes gratuitos durante el proyecto.',
  'Para la operación real, los organismos designan funcionarios por área que responden las peticiones.',
  'Los integrantes del equipo mantienen su disponibilidad durante el ciclo lectivo.',
])}
<h2>8.2 Restricciones</h2>
${lista([
  '<b>Tiempo:</b> el proyecto se entrega dentro del calendario de la cátedra.',
  '<b>Equipo:</b> tres integrantes con dedicación parcial (ver sección 11.2).',
  '<b>Presupuesto:</b> sin financiamiento; solo herramientas y servicios gratuitos.',
  '<b>Técnicas:</b> sin acceso a los sistemas internos del municipio; límites de uso de los planes gratuitos.',
  '<b>Legales:</b> cumplimiento de la Ley 25.326 de Protección de Datos Personales y publicación de una política de privacidad.',
])}

<h1>9. Riesgos iniciales</h1>
<p>Cada riesgo se evalúa con dos escalas. <b>Probabilidad:</b> baja (es poco probable que ocurra), media (puede ocurrir) o alta (es probable que ocurra). <b>Impacto:</b> bajo (molestia menor), medio (atrasa o reduce una funcionalidad) o alto (compromete un objetivo del proyecto). La respuesta es la acción planificada para reducirlo.</p>
${tabla(['#', 'Riesgo', 'Prob.', 'Impacto', 'Respuesta planificada', 'Responsable'], [
  ['R1', 'Baja participación de vecinos al inicio', nivel('Media'), nivel('Alto'), 'Prueba piloto en un barrio, difusión en redes y app instalable de uso simple.', corto('IJ')],
  ['R2', 'Publicación de datos personales o contenido ofensivo', nivel('Media'), nivel('Alto'), 'Moderación previa, revisión automática de textos, denuncias y ocultamiento automático.', corto('JP')],
  ['R3', 'Acceso indebido a identidades o datos', nivel('Baja'), nivel('Alto'), 'Reglas de seguridad en la base (RLS y permisos por columna) y pruebas por rol.', corto('MP')],
  ['R4', 'Superar los límites de los planes gratuitos', nivel('Baja'), nivel('Medio'), 'Compresión de fotos, control del uso y plan de migración a un plan pago.', corto('MP')],
  ['R5', 'Caída o cambio de un servicio externo', nivel('Baja'), nivel('Medio'), 'Esquema SQL versionado para recrear la base; código independiente del proveedor de publicación.', corto('JP')],
  ['R6', 'Indisponibilidad de un integrante', nivel('Media'), nivel('Medio'), 'Repositorio documentado, revisión cruzada y tareas repartidas en sprints cortos.', corto('JP')],
  ['R7', 'Cambios de alcance tardíos', nivel('Media'), nivel('Medio'), 'Control de cambios con aprobación del docente (Entregable 2, sección 10).', corto('JP')],
], ['5%', '25%', '9%', '9%', '', '12%'])}

<h1>10. Cronograma de hitos</h1>
<p>Un hito marca un momento clave del proyecto. La columna "Semana" indica en qué semana del cronograma planificado (Entregable 7) se alcanza; la columna "Estado" indica si ya se cumplió y, cuando corresponde, la fecha real registrada en el repositorio.</p>
${tabla(['#', 'Hito', 'Semana', 'Estado'], HITOS.map((h) => [h.id, h.nombre, `S${semanaDe(h.dia)}`, h.real]), ['5%', '', '10%', '30%'])}

<h1>11. Presupuesto y recursos</h1>
<h2>11.1 Recursos tecnológicos</h2>
${tabla(['Recurso', 'Uso', 'Costo'], [
  ['GitHub', 'Repositorio privado y control de versiones', 'Plan gratuito — $0'],
  ['Supabase', 'Base de datos PostgreSQL, autenticación y almacenamiento de fotos', 'Plan gratuito — $0'],
  ['Netlify', 'Publicación del sitio con HTTPS', 'Plan gratuito — $0'],
  ['OpenStreetMap', 'Mapa de fondo y ubicación de barrios', 'Gratuito — $0'],
  ['Google Cloud (OAuth)', 'Ingreso con cuenta de Google', 'Gratuito — $0'],
  ['Trello, WhatsApp, Google Meet', 'Tablero de tareas, mensajería y reuniones', 'Gratuitos — $0'],
  ['Herramientas de desarrollo', 'Node.js, React, Vite, editor de código', 'Código abierto — $0'],
], ['24%', '', '20%'])}
<h2>11.2 Recursos humanos (estimación)</h2>
<p>Las horas se estiman a partir de la asignación de actividades del Entregable 4: el responsable de una actividad le dedica ${HORAS_RESPONSABLE} h por día hábil y cada participante ${fmt(HORAS_PARTICIPANTE)} h. A eso se suman las reuniones del plan de comunicación (${fmt(HORAS_REUNIONES)} h por persona).</p>
${tabla(['Integrante', 'Rol', 'Horas en actividades', 'Horas en reuniones', 'Total'], [
  ...Object.keys(EQUIPO).map((k) => [EQUIPO[k].nombre, EQUIPO[k].rol, fmt(HORAS[k]) + ' h', fmt(HORAS_REUNIONES) + ' h', '<b>' + fmt(HORAS[k] + HORAS_REUNIONES) + ' h</b>']),
  ['<b>Total del equipo</b>', '', '<b>' + fmt(HORAS_TOTALES) + ' h</b>', '<b>' + fmt(HORAS_REUNIONES * 3) + ' h</b>', '<b>' + fmt(HORAS_TOTALES + HORAS_REUNIONES * 3) + ' h</b>'],
], ['22%', '', '14%', '14%', '11%'])}
<div class="nota">El costo monetario directo del proyecto es $0 gracias a los planes gratuitos. Como se trata de un proyecto académico sin remuneración, el esfuerzo del equipo se expresa en horas y no se le asigna un valor en dinero.</div>

<h1>12. Interesados</h1>
<p>Un interesado es cualquier persona u organización afectada por el proyecto o con influencia sobre él. La influencia indica cuánto puede modificar el rumbo del proyecto.</p>
${tabla(['Interesado', 'Rol en el proyecto', 'Interés / expectativa', 'Influencia'], [
  ['Docente (Ing. Loza)', 'Patrocinador; aprueba el alcance y los entregables', 'Cumplimiento de los objetivos académicos y de la metodología', nivel('Alta')],
  ['Equipo de proyecto', 'Planifica, desarrolla y documenta', 'Entregar un producto funcional y aprobar la materia', nivel('Alta')],
  ['Vecinos de Córdoba y Villa Allende', 'Usuarios principales', 'Que sus reclamos se vean, se atiendan y se resuelvan', nivel('Media')],
  ['Áreas del municipio y funcionarios', 'Usuarios que responden', 'Información priorizada por zona y urgencia', nivel('Alta')],
  ['ONG y organizaciones sociales', 'Destinatarios de reportes', 'Datos para orientar su trabajo territorial', nivel('Media')],
  ['Instituto Cervantes', 'Institución educativa', 'Calidad de la formación y de los proyectos', nivel('Media')],
], ['22%', '27%', '', '11%'])}

<h1>13. Equipo, roles y autoridad</h1>
${tabla(['Integrante', 'Rol', 'Responsabilidades principales'], Object.values(EQUIPO).map((p) => [`${p.nombre}<br><span class="sec">Legajo ${p.legajo}</span>`, p.rol, p.responsabilidades]), ['22%', '24%'])}
<h2>13.1 Autoridad del director del proyecto</h2>
${lista([
  'Asignar y redistribuir tareas entre los integrantes dentro de cada sprint.',
  'Priorizar el product backlog dentro del alcance aprobado.',
  'Aprobar la publicación de nuevas versiones del sitio.',
  'Escalar al docente los cambios de alcance o de plazo y los riesgos críticos.',
])}

<h1>14. Aprobación</h1>
<p>Con la firma de este documento se autoriza formalmente el proyecto ENTS con el propósito, los objetivos, el alcance preliminar y los recursos aquí descritos.</p>
${firmas(FIRMAS_TODOS)}
`
const charter = documento({
  archivo: '01_project_charter', titulo: 'Project Charter', encabezado: 'ENTS · Project Charter (Acta de constitución)',
  portada: caratula({ numero: 1, titulo: 'Project Charter', subtitulo: 'Acta de constitución del proyecto ENTS — Everyone Needs To Smile', codigo: 'ENTS-GP-01' }) + historial('Reescritura completa para el sistema de peticiones vecinales: propósito, objetivos, alcance, hitos, riesgos, presupuesto e interesados.', DETALLE_V3),
  contenido: contenidoCharter,
})

// =====================================================================
// 2. DECLARACIÓN DE ALCANCE
// =====================================================================
const contenidoAlcance = `
${indice(['Glosario', 'Objetivo del documento', 'Alcance del producto', 'Requisitos funcionales', 'Requisitos no funcionales', 'Historias de usuario', 'Trazabilidad entre historias y requisitos', 'Entregables del proyecto', 'Criterios de aceptación del producto', 'Exclusiones', 'Supuestos y restricciones', 'Límites e interfaces del sistema', 'Control de cambios del alcance', 'Aprobación'])}
${guia({
  que: 'La declaración de alcance (scope statement) describe en detalle qué incluye el proyecto y qué queda afuera: el producto, sus requisitos, sus entregables y los criterios con que se aceptan.',
  paraQue: 'Es la referencia para planificar, para verificar al final que se entregó lo acordado y para evaluar cualquier pedido de cambio sin que el proyecto crezca sin control.',
  relacion: 'Detalla el alcance preliminar del Entregable 1. Sus entregables se descomponen en la EDT (Entregable 3) y sus requisitos dan origen a las actividades de los Entregables 4 y 5.',
})}

<h1 class="salto">1. Objetivo del documento</h1>
<p>Definir con precisión el alcance del proyecto ENTS a partir del alcance preliminar del Project Charter, de modo que el equipo y el docente compartan la misma idea de qué se va a construir y entregar.</p>

<h1>2. Alcance del producto</h1>
<p>ENTS es una aplicación web adaptable a celular e instalable (PWA) en la que los vecinos de Córdoba y Villa Allende publican problemas de su barrio, los apoyan con firmas y siguen su resolución; los funcionarios de cada área del municipio responden y registran el avance; los moderadores revisan el contenido; y los administradores analizan y exportan la información. Sus características principales son:</p>
${tabla(['Característica', 'Descripción'], [
  ['Cuentas y roles', 'Registro e ingreso con correo o Google; recuperación de contraseña; roles de vecino, funcionario por área, moderador, administrador y dueño.'],
  ['Permisos por panel', 'El dueño decide, para cada rol, qué paneles ve y en cuáles puede modificar; la base de datos aplica esa configuración.'],
  ['Peticiones', 'Título, descripción, hasta 3 fotos comprimidas y ubicación en el mapa; quedan pendientes hasta su moderación.'],
  ['Procesamiento automático', 'Categoría (16 posibles) por palabras clave, barrio (111) por cercanía, score de urgencia, detección de similares y revisión de textos.'],
  ['Firmas y prioridad', 'Una firma por persona; cinco niveles de prioridad; elevación al área a las 50 firmas.'],
  ['Seguimiento', 'Etapas recibida → en revisión → derivada → en obra → resuelta, con respuesta oficial y foto.'],
  ['Participación', 'Notificaciones, comentarios anónimos con denuncias, barrios seguidos e insignias.'],
  ['Comunidad', 'Mapa por barrios, muro vecinal y agenda de eventos.'],
  ['Reportes', 'Estadísticas públicas anónimas, panel analítico y exportación a Excel y PDF.'],
  ['Administración', 'Moderación, directorio de usuarios, asignación de áreas, cambio de roles y documentos privados del proyecto.'],
], ['24%'])}

<h1>3. Requisitos funcionales</h1>
<p>Un requisito funcional (RF) describe algo que el sistema debe hacer. La prioridad indica su importancia: <b>Alta</b> = imprescindible para que el sistema cumpla su propósito; <b>Media</b> = aporta valor importante pero el sistema funciona sin él; <b>Baja</b> = mejora deseable que se construye al final.</p>
${tabla(['ID', 'Requisito', 'Prioridad'], RF.map(([id, t, p]) => [`<b>${id}</b>`, t, nivel(p)]), ['8%', '', '11%'])}

<h1>4. Requisitos no funcionales</h1>
<p>Un requisito no funcional (RNF) describe una cualidad que el sistema debe tener, independientemente de lo que hace: seguridad, rendimiento, facilidad de uso, etc.</p>
${tabla(['ID', 'Atributo', 'Requisito'], RNF.map(([id, a, t]) => [`<b>${id}</b>`, a, t]), ['9%', '16%'])}

<h1>5. Historias de usuario</h1>
<p>Una historia de usuario (HU) expresa una necesidad desde el punto de vista de quien usa el sistema, con la forma <i>"Como [rol], quiero [acción] para [beneficio]"</i>. Cada una tiene criterios de aceptación: las condiciones que deben cumplirse para darla por terminada. En conjunto forman el product backlog del proyecto.</p>
${tabla(['ID', 'Historia de usuario', 'Criterios de aceptación', 'Prioridad'], HU.map(([id, rol, quiero, para, crit, p]) => [`<b>${id}</b>`, `Como <b>${rol}</b>, quiero ${quiero} para ${para}.`, crit, nivel(p)]), ['7%', '38%', '', '11%'])}

<h1>6. Trazabilidad entre historias y requisitos</h1>
<p>La trazabilidad permite verificar que cada requisito funcional responde a una necesidad real de un usuario (al menos una historia) y que ninguna historia quedó sin requisitos que la implementen.</p>
${tabla(['Requisito', 'Historias que lo originan'], RF.map(([id]) => [`<b>${id}</b>`, HU.filter((h) => h[6].includes(id)).map((h) => h[0]).join(', ') || '—']), ['14%'])}
<p class="pie">Todos los requisitos funcionales están cubiertos por al menos una historia de usuario.</p>

<h1>7. Entregables del proyecto</h1>
${tabla(['#', 'Entregable', 'Descripción', 'Criterio de aceptación'], [
  ['1', 'Aplicación web publicada', 'Sitio en producción con todos los módulos del alcance.', 'Todas las características operativas en el sitio publicado.'],
  ['2', 'Base de datos', 'Esquema SQL con tablas, políticas, funciones y disparadores.', 'Se recrea completa ejecutando el archivo <code>schema.sql</code>.'],
  ['3', 'Repositorio de código', 'Código fuente versionado con README e instrucciones.', 'Otro integrante puede instalarlo y ejecutarlo siguiendo el README.'],
  ['4', 'Suite de pruebas', 'Pruebas automáticas y pruebas de permisos por rol.', '100% aprobadas antes de cada publicación.'],
  ['5', 'Entregables de gestión', 'Charter, alcance, EDT, actividades, diccionario, comunicación y Gantt.', 'Completos, consistentes entre sí y sin términos sin explicar.'],
  ['6', 'Documentación técnica', 'Requerimientos, arquitectura, datos, seguridad, pruebas e implementación.', 'Refleja el sistema implementado.'],
  ['7', 'Presentación', 'Exposición del proyecto para la defensa, con su guion.', 'Ensayada dentro del tiempo asignado.'],
], ['5%', '20%', '', '32%'])}

<h1>8. Criterios de aceptación del producto</h1>
<p>El producto se considera aceptado cuando se cumplen todas estas condiciones:</p>
${lista([
  'El ciclo completo —pedir, moderar, firmar, priorizar, responder y resolver— funciona en el sitio publicado.',
  'Toda petición nueva recibe categoría sugerida, barrio y score de urgencia sin intervención manual.',
  'Un vecino no puede ver la identidad de otros vecinos ni modificar datos ajenos (verificado con pruebas por rol).',
  'No se publican teléfonos, correos ni números de documento en los comentarios.',
  'Los permisos por panel que define el dueño se aplican tanto en la pantalla como en la base de datos.',
  'La aplicación se puede instalar en el celular y navegar con teclado.',
  'Las pruebas automáticas se ejecutan sin errores y la compilación de producción es exitosa.',
])}

<h1>9. Exclusiones</h1>
<p>Lo siguiente queda explícitamente fuera del proyecto. Incluirlo requiere un pedido de cambio (sección 12).</p>
${tabla(['Fuera del alcance', 'Motivo'], [
  ['Pagos, donaciones o recaudación dentro de la plataforma', 'Complejidad legal y de integración; si se coordinan donaciones, ocurren por fuera de ENTS.'],
  ['Integración con sistemas internos del municipio', 'El equipo no tiene acceso a esos sistemas; los funcionarios responden desde ENTS.'],
  ['Notificaciones por correo electrónico o SMS', 'Requieren servicios pagos; se usan avisos dentro de la app.'],
  ['Aplicaciones nativas para Android o iOS', 'Se cubre con la aplicación instalable (PWA).'],
  ['Límites oficiales (polígonos) de cada barrio', 'Se usa el punto central de cada barrio según OpenStreetMap; queda como mejora futura.'],
  ['Resolución de los reclamos', 'El equipo provee la herramienta; resolver cada problema corresponde a los organismos.'],
], ['44%'])}

<h1>10. Supuestos y restricciones</h1>
<div class="dos-col">
  <div class="tarjeta"><h4>Supuestos</h4>${lista(['Los usuarios tienen acceso a internet y un navegador actualizado.', 'Los servicios gratuitos se mantienen durante el proyecto.', 'Los organismos designan funcionarios por área para la operación real.', 'El equipo mantiene su disponibilidad durante el ciclo lectivo.'])}</div>
  <div class="tarjeta"><h4>Restricciones</h4>${lista(['Plazo: calendario de la cátedra.', 'Equipo: tres integrantes con dedicación parcial.', 'Presupuesto: $0 (solo servicios gratuitos).', 'Legales: Ley 25.326 de Protección de Datos Personales.'])}</div>
</div>

<h1>11. Límites e interfaces del sistema</h1>
<p>Estos son los sistemas externos con los que ENTS se comunica y el modo en que lo hace.</p>
${tabla(['Sistema externo', 'Interfaz', 'Uso'], [
  ['Supabase', 'API REST y cliente JavaScript sobre HTTPS', 'Base de datos, autenticación y almacenamiento de fotos y documentos.'],
  ['Netlify', 'Publicación automática desde GitHub', 'Sitio en producción con HTTPS.'],
  ['OpenStreetMap', 'Teselas (imágenes) del mapa; Nominatim para la carga única de barrios', 'Mapa vecinal y ubicación de los barrios.'],
  ['Google', 'OAuth 2.0', 'Ingreso opcional con una cuenta de Google.'],
  ['Navegador del usuario', 'Geolocalización, cámara o archivos, service worker', 'Ubicación de la petición, fotos e instalación de la app.'],
], ['18%', '36%'])}

<h1>12. Control de cambios del alcance</h1>
<ol>
  <li>Cualquier integrante registra el pedido de cambio: qué se quiere cambiar, por qué y cuál es su impacto estimado en tiempo y calidad.</li>
  <li>El equipo lo analiza en la siguiente reunión de planificación de sprint.</li>
  <li>Si afecta objetivos, entregables o plazos, el director lo presenta al docente para su aprobación.</li>
  <li>Si se aprueba, se actualizan este documento, la EDT, la lista de actividades y el Gantt, y se registra en el historial de revisión.</li>
</ol>
<div class="nota">Ejemplos de cambios aprobados: el reemplazo del módulo de donaciones por el sistema de peticiones (versión 2.0) y la incorporación del rol moderador y de los permisos por panel (versión 3.0).</div>

<h1>13. Aprobación</h1>
${firmas([['Ing. Loza', 'Docente — Patrocinador'], [DIRECTOR, 'Director del proyecto']])}
`
const alcance = documento({
  archivo: '02_declaracion_de_alcance', titulo: 'Declaración de alcance', encabezado: 'ENTS · Declaración de alcance (Scope Statement)',
  portada: caratula({ numero: 2, titulo: 'Declaración de alcance', subtitulo: 'Scope Statement del proyecto ENTS — Everyone Needs To Smile', codigo: 'ENTS-GP-02' }) + historial('Reescritura completa para el sistema de peticiones vecinales: alcance del producto, requisitos, entregables, exclusiones y control de cambios.', DETALLE_V3 + ' Se agregan historias de usuario y su trazabilidad con los requisitos.'),
  contenido: contenidoAlcance,
})

// =====================================================================
// 3. EDT
// =====================================================================
const actividadesDe = (codigo) => ACTIVIDADES.filter((a) => a.edt.includes(codigo))

const diagramaEdt = `
<div class="edt">
  <div class="edt-raiz">1. ENTS — Plataforma de peticiones vecinales</div>
  <div class="edt-ramas">
    ${EDT.map((r) => `<div class="edt-rama"><div class="cab">${r.c} ${r.n}</div>${r.h.map(([c, n]) => `<div class="hoja">${c} ${n}</div>`).join('')}</div>`).join('')}
  </div>
</div>`

const estiloEdt = `
  .edt { display: flex; flex-direction: column; align-items: center; gap: 8pt; break-inside: avoid; margin: 8pt 0; }
  .edt-raiz { background: #0d366b; color: #fff; font-weight: 700; padding: 6pt 14pt; border-radius: 4pt; font-size: 10pt; }
  .edt-ramas { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4pt; width: 100%; }
  .edt-rama { display: flex; flex-direction: column; gap: 3pt; }
  .edt-rama .cab { background: #1c5cab; color: #fff; font-weight: 600; font-size: 7.6pt; padding: 4pt; border-radius: 3pt; text-align: center; min-height: 30pt; }
  .edt-rama .hoja { border: 0.7pt solid #1c5cab; color: #14213d; font-size: 7.2pt; padding: 3pt; border-radius: 3pt; background: #f2f7fd; }`

const contenidoEdt = `
${indice(['Glosario', 'Criterios de construcción', 'Diagrama de la EDT', 'EDT en formato de lista (diccionario de la EDT)', 'Relación con las actividades'])}
${guia({
  que: 'La EDT (estructura de desglose del trabajo, en inglés WBS) divide todo el proyecto en partes cada vez más pequeñas, hasta llegar a paquetes de trabajo que se pueden asignar, estimar y verificar.',
  paraQue: 'Asegura que no falte ni sobre trabajo: todo lo que está en la EDT forma parte del alcance y todo el alcance está en la EDT. Es la base para definir las actividades y el cronograma.',
  relacion: 'Descompone los entregables del Entregable 2. Cada paquete de trabajo se realiza mediante una o más actividades del Entregable 4, que el Entregable 5 describe en detalle.',
})}

<h1 class="salto">1. Criterios de construcción</h1>
${lista([
  '<b>Orientada a entregables:</b> cada elemento representa un resultado verificable, no una tarea suelta.',
  '<b>Regla del 100%:</b> la EDT incluye todo el trabajo del proyecto y nada que esté fuera del alcance aprobado.',
  '<b>Tres niveles:</b> el proyecto completo (nivel 1), sus componentes principales (nivel 2) y los paquetes de trabajo (nivel 3).',
  '<b>Codificación jerárquica:</b> cada elemento tiene un código que indica su ubicación (por ejemplo, 1.4.3 es el tercer paquete del componente 1.4). Ese código se usa en la lista y en el diccionario de actividades.',
])}
<table class="ficha"><tbody>
  <tr><td>Componentes (nivel 2)</td><td>${EDT.length}</td></tr>
  <tr><td>Paquetes de trabajo (nivel 3)</td><td>${CANTIDAD_PAQUETES}</td></tr>
  <tr><td>Actividades asociadas</td><td>${ACTIVIDADES.length} (ver Entregable 4)</td></tr>
</tbody></table>

<h1>2. Diagrama de la EDT</h1>
<p>Se lee de arriba hacia abajo: el recuadro superior es el proyecto; cada columna es un componente y, debajo, sus paquetes de trabajo.</p>
${diagramaEdt}
<p class="pie">Figura 1. EDT del proyecto ENTS (tres niveles).</p>

<h1 class="salto">3. EDT en formato de lista (diccionario de la EDT)</h1>
<p>Para cada elemento se indica qué contiene y qué actividades lo producen.</p>
<table>
  <thead><tr><th style="width:9%">Código</th><th style="width:23%">Elemento</th><th>Descripción</th><th style="width:16%">Actividades</th></tr></thead>
  <tbody>
    <tr><td><b>1</b></td><td><b>ENTS — Plataforma de peticiones vecinales</b></td><td>Proyecto completo.</td><td>A1 a A20</td></tr>
    ${EDT.map((r) => `<tr><td><b>${r.c}</b></td><td><b>${r.n}</b></td><td>${r.d}</td><td></td></tr>${r.h.map(([c, n, d]) => `<tr><td>&nbsp;&nbsp;${c}</td><td>&nbsp;&nbsp;${n}</td><td>${d}</td><td>${actividadesDe(c).map((a) => a.id).join(', ') || (c === '1.1.5' ? 'Todas (reuniones y control)' : '—')}</td></tr>`).join('')}`).join('')}
  </tbody>
</table>
<p class="pie">El paquete 1.1.5 (seguimiento y control) no es una actividad aislada: se realiza durante todo el proyecto mediante las reuniones del Entregable 6.</p>

<h1>4. Relación con las actividades</h1>
${tabla(['Componente', 'Actividades'], EDT.map((r) => [`${r.c} ${r.n}`, ACTIVIDADES.filter((a) => a.edt.some((e) => e.startsWith(r.c + '.'))).map((a) => `${a.id} ${a.nombre}`).join('<br>') || '—']), ['28%'])}
`
const edt = documento({
  archivo: '03_edt_wbs', titulo: 'EDT / WBS', encabezado: 'ENTS · Estructura de desglose del trabajo (EDT / WBS)', estiloExtra: estiloEdt,
  portada: caratula({ numero: 3, titulo: 'EDT / WBS', subtitulo: 'Estructura de desglose del trabajo del proyecto ENTS', codigo: 'ENTS-GP-03' }) + historial(`Nueva EDT orientada a entregables para el sistema de peticiones vecinales (${EDT.length} componentes, ${CANTIDAD_PAQUETES} paquetes de trabajo).`, DETALLE_V3 + ' Se agrega la descripción de cada paquete de trabajo.'),
  contenido: contenidoEdt,
})

// =====================================================================
// 4. LISTA DE ACTIVIDADES
// =====================================================================
const contenidoLista = `
${indice(['Glosario', 'Cómo leer la lista', 'Lista de actividades', 'Asignación por integrante', 'Resumen del cronograma', 'Ruta crítica'])}
${guia({
  que: 'La lista de actividades enumera todo el trabajo necesario para producir los paquetes de la EDT, con su duración, sus dependencias y su responsable.',
  paraQue: 'Permite calcular cuánto dura el proyecto, qué actividades no pueden atrasarse (ruta crítica) y cómo se reparte el trabajo entre los integrantes.',
  relacion: 'Se deriva de la EDT (Entregable 3). Cada actividad se detalla en una ficha del Entregable 5 y se dibuja como una barra en el Gantt del Entregable 7.',
})}

<h1 class="salto">1. Cómo leer la lista</h1>
${tabla(['Columna', 'Significado'], [
  ['ID', 'Código de la actividad (A1 a A20). En negrita, las actividades de la ruta crítica.'],
  ['EDT', 'Paquete o paquetes de trabajo de la EDT que produce la actividad.'],
  ['Dur.', 'Duración en días hábiles de trabajo del equipo.'],
  ['Predecesoras', 'Actividades que deben terminar antes de que esta empiece (dependencia fin-comienzo).'],
  ['Inicio / Fin', 'Día hábil en que empieza y termina, contando desde el inicio del proyecto (día 0). Por ejemplo, "Inicio 3, Fin 6" ocupa los días hábiles 4, 5 y 6.'],
  ['Holgura', 'Días que puede atrasarse sin atrasar el proyecto. Holgura 0 significa que la actividad es crítica.'],
  ['Responsable', 'Integrante a cargo; entre paréntesis, quienes participan.'],
], ['18%'])}

<h1>2. Lista de actividades</h1>
<table>
  <thead><tr><th style="width:5%">ID</th><th>Actividad</th><th style="width:9%">EDT</th><th style="width:5%">Dur.</th><th style="width:10%">Predec.</th><th style="width:6%">Inicio</th><th style="width:5%">Fin</th><th style="width:9%">Holgura</th><th style="width:15%">Responsable</th></tr></thead>
  <tbody>
    ${ACTIVIDADES.map((a) => `<tr><td>${a.critica ? '<b>' + a.id + '</b>' : a.id}</td><td>${a.nombre}</td><td>${a.edt.join(', ')}</td><td>${a.dur}</td><td>${a.pred.join(', ') || '—'}</td><td>${a.inicio}</td><td>${a.fin}</td><td>${a.critica ? '<span class="nivel alta">0 · crítica</span>' : a.holgura}</td><td>${etiquetaResp(a)}</td></tr>`).join('')}
  </tbody>
</table>

<h1>3. Asignación por integrante</h1>
<p>Horas estimadas con ${HORAS_RESPONSABLE} h por día hábil para el responsable y ${fmt(HORAS_PARTICIPANTE)} h para cada participante (sin contar reuniones).</p>
${tabla(['Integrante', 'Responsable de', 'Participa en', 'Horas estimadas'], Object.keys(EQUIPO).map((k) => [EQUIPO[k].nombre, ACTIVIDADES.filter((a) => a.resp === k).map((a) => a.id).join(', '), ACTIVIDADES.filter((a) => a.part.includes(k)).map((a) => a.id).join(', ') || '—', fmt(HORAS[k]) + ' h']), ['24%', '', '', '14%'])}

<h1>4. Resumen del cronograma</h1>
<table class="ficha"><tbody>
  <tr><td>Cantidad de actividades</td><td>${ACTIVIDADES.length}</td></tr>
  <tr><td>Duración total del proyecto</td><td>${DURACION_TOTAL} días hábiles (≈ ${SEMANAS} semanas, ${SPRINTS.length} sprints de 2 semanas)</td></tr>
  <tr><td>Suma de duraciones</td><td>${ACTIVIDADES.reduce((t, a) => t + a.dur, 0)} días: es mayor que la duración total porque varias actividades se hacen en paralelo.</td></tr>
  <tr><td>Actividades críticas</td><td>${RUTA.length} de ${ACTIVIDADES.length}</td></tr>
</tbody></table>

<h1>5. Ruta crítica</h1>
<p>La ruta crítica es la cadena de actividades sin holgura: cualquier atraso en ellas atrasa la entrega final. Se obtiene calculando, para cada actividad, la fecha más temprana y la más tardía en que puede empezar; cuando ambas coinciden, la actividad es crítica.</p>
<p class="ruta">${RUTA.join(' → ')}</p>
<p>Las actividades fuera de la ruta crítica pueden reprogramarse dentro de su holgura para equilibrar la carga del equipo: ${ACTIVIDADES.filter((a) => !a.critica).map((a) => `${a.id} (${a.holgura} días)`).join(', ')}.</p>
`
const listaActividades = documento({
  archivo: '04_lista_de_actividades', titulo: 'Lista de actividades', encabezado: 'ENTS · Lista de actividades',
  portada: caratula({ numero: 4, titulo: 'Lista de actividades', subtitulo: 'Actividades, duraciones, dependencias, responsables y ruta crítica del proyecto ENTS', codigo: 'ENTS-GP-04' }) + historial(`Nueva lista de ${ACTIVIDADES.length} actividades para el sistema de peticiones, con cálculo de ruta crítica.`, DETALLE_V3 + ' Se asigna responsable a cada actividad.'),
  contenido: contenidoLista,
})

// =====================================================================
// 5. DICCIONARIO DE ACTIVIDADES
// =====================================================================
const fichas = ACTIVIDADES.map((a) => `
<table class="ficha">
  <thead><tr><th colspan="2">${a.id} · ${a.nombre}${a.critica ? ' · crítica' : ''}</th></tr></thead>
  <tbody>
    <tr><td>Descripción</td><td>${a.desc}</td></tr>
    <tr><td>Paquete de la EDT</td><td>${a.edt.map((c) => `${c} ${EDT.flatMap((r) => r.h).find((h) => h[0] === c)[1]}`).join('; ')}</td></tr>
    <tr><td>Entregable</td><td>${a.entregable}</td></tr>
    <tr><td>Responsable</td><td>${nombre(a.resp)}${a.part.length ? ` · participan: ${a.part.map(nombre).join('; ')}` : ''}</td></tr>
    <tr><td>Recursos</td><td>${a.recursos}</td></tr>
    <tr><td>Duración y ubicación</td><td>${a.dur} días hábiles · del día ${a.inicio} al ${a.fin} · semana ${semanaDe(a.inicio + 1)}${semanaDe(a.fin) !== semanaDe(a.inicio + 1) ? ` a ${semanaDe(a.fin)}` : ''} · sprint ${sprintDeDia(a.inicio)}</td></tr>
    <tr><td>Holgura</td><td>${a.critica ? '0 días: actividad crítica' : `${a.holgura} días`}</td></tr>
    <tr><td>Predecesoras / sucesoras</td><td>${a.pred.join(', ') || 'ninguna (inicia el proyecto)'} / ${a.sucesoras.join(', ') || 'ninguna (cierra el proyecto)'}</td></tr>
    <tr><td>Criterio de aceptación</td><td>${a.criterio}</td></tr>
  </tbody>
</table>`).join('')

const contenidoDiccionario = `
${indice(['Glosario', 'Cómo leer las fichas', 'Fichas de actividades'])}
${guia({
  que: 'El diccionario de actividades contiene una ficha por cada actividad de la lista, con toda la información necesaria para ejecutarla y controlarla.',
  paraQue: 'Evita ambigüedades: el responsable sabe exactamente qué hacer, con qué recursos, en qué plazo y cómo se verifica que terminó.',
  relacion: 'Amplía cada fila de la lista de actividades (Entregable 4). Las duraciones y dependencias son las mismas que se dibujan en el Gantt (Entregable 7).',
})}

<h1 class="salto">1. Cómo leer las fichas</h1>
${tabla(['Campo', 'Significado'], [
  ['Descripción', 'Qué trabajo se realiza en la actividad.'],
  ['Paquete de la EDT', 'Paquete de trabajo del Entregable 3 que la actividad produce.'],
  ['Entregable', 'Resultado concreto que deja la actividad al terminar.'],
  ['Responsable', 'Integrante a cargo y quienes participan.'],
  ['Recursos', 'Herramientas, servicios o información que se necesitan.'],
  ['Duración y ubicación', 'Días hábiles que dura y en qué días, semanas y sprint del cronograma se realiza.'],
  ['Holgura', 'Días que puede atrasarse sin atrasar el proyecto.'],
  ['Predecesoras / sucesoras', 'Qué actividades deben terminar antes y cuáles esperan a que esta termine.'],
  ['Criterio de aceptación', 'Condición que debe cumplirse para darla por terminada.'],
], ['26%'])}

<h1 class="salto">2. Fichas de actividades</h1>
${fichas}
`
const diccionario = documento({
  archivo: '05_diccionario_de_actividades', titulo: 'Diccionario de actividades', encabezado: 'ENTS · Diccionario de actividades',
  estiloExtra: '  table.ficha { margin-bottom: 9pt; break-inside: avoid; } table.ficha th { font-size: 9.5pt; } table.ficha td { padding: 2.5pt 6pt; }',
  portada: caratula({ numero: 5, titulo: 'Diccionario de actividades', subtitulo: 'Ficha detallada de cada actividad del proyecto ENTS', codigo: 'ENTS-GP-05' }) + historial(`Nuevo diccionario con una ficha por cada una de las ${ACTIVIDADES.length} actividades del sistema de peticiones.`, DETALLE_V3 + ' Cada ficha suma descripción, responsable, semana y sprint.'),
  contenido: contenidoDiccionario,
})

// =====================================================================
// 6. PLAN DE COMUNICACIÓN
// =====================================================================
const estiloComunicacion = `
  .matriz { display: grid; grid-template-columns: 26pt 1fr 1fr; grid-template-rows: 1fr 1fr 18pt; gap: 4pt; height: 210pt; break-inside: avoid; margin: 6pt 0 12pt; }
  .cuad { border-radius: 5pt; padding: 7pt 9pt; font-size: 8.8pt; }
  .cuad b { display: block; font-size: 9pt; margin-bottom: 3pt; }
  .eje-y { grid-row: 1 / 3; writing-mode: vertical-rl; transform: rotate(180deg); text-align: center; font-size: 8.5pt; color: #4a5568; }
  .eje-x { grid-column: 2 / 4; text-align: center; font-size: 8.5pt; color: #4a5568; }
  .flujo { display: flex; flex-direction: column; gap: 8pt; border: 0.8pt solid #d9d7cf; border-radius: 6pt; padding: 10pt; background: #fbfaf7; break-inside: avoid; }
  .fila { display: flex; gap: 8pt; align-items: center; justify-content: center; }
  .caja { border: 1pt solid #1c5cab; border-radius: 4pt; padding: 5pt 7pt; background: #fff; font-size: 8.6pt; text-align: center; }
  .caja b { color: #0d366b; }
  .flecha { color: #1c5cab; font-weight: 700; font-size: 13pt; }`

const contenidoComunicacion = `
${indice(['Glosario', 'Objetivo', 'Interesados', 'Matriz de poder e interés', 'Matriz de comunicaciones', 'Reuniones', 'Canales y herramientas', 'Flujo de la comunicación', 'Escalamiento y gestión de cambios', 'Convenciones del equipo', 'Plantilla de minuta'])}
${guia({
  que: 'El plan de comunicación define qué información se intercambia en el proyecto, quién la envía, quién la recibe, por qué canal, con qué frecuencia y en qué formato.',
  paraQue: 'Asegura que el equipo trabaje coordinado, que el docente conozca el avance y que, cuando la plataforma esté en uso, vecinos, funcionarios y organismos estén informados del estado de cada petición.',
  relacion: 'Toma los interesados identificados en el Project Charter (Entregable 1). Las reuniones aquí definidas son el paquete 1.1.5 de la EDT (Entregable 3) y su tiempo se incluye en las horas del Entregable 1.',
})}

<h1 class="salto">1. Objetivo</h1>
<p>Que cada interesado reciba la información que necesita, en el momento oportuno y por el canal adecuado, evitando tanto la falta de información como el exceso de mensajes.</p>

<h1>2. Interesados</h1>
<p>Para cada interesado se indica qué necesita saber, cuánto poder tiene sobre el proyecto, cuánto le interesa y la estrategia de comunicación resultante (explicada en la sección 3).</p>
${tabla(['Interesado', 'Necesidad de información', 'Poder', 'Interés', 'Estrategia'], [
  ['Docente (Ing. Loza)', 'Avance, cambios de alcance y entregables', nivel('Alto'), nivel('Alto'), 'Gestionar de cerca'],
  ['Equipo de proyecto', 'Tareas, bloqueos y decisiones técnicas', nivel('Alto'), nivel('Alto'), 'Gestionar de cerca'],
  ['Áreas del municipio y funcionarios', 'Peticiones de su área, prioridad y elevaciones', nivel('Alto'), nivel('Medio'), 'Mantener satisfechos'],
  ['Vecinos', 'Estado de sus peticiones y de su barrio', nivel('Bajo'), nivel('Alto'), 'Mantener informados'],
  ['ONG y organizaciones sociales', 'Reportes por zona y urgencia', nivel('Bajo'), nivel('Medio'), 'Mantener informados'],
  ['Instituto Cervantes', 'Resultados del proyecto', nivel('Medio'), nivel('Bajo'), 'Monitorear'],
], ['24%', '', '9%', '9%', '17%'])}

<h1>3. Matriz de poder e interés</h1>
<p>La matriz ubica a cada interesado según su poder (eje vertical) y su interés (eje horizontal). Cada cuadrante define una estrategia: <b>gestionar de cerca</b> (comunicación frecuente y participación en decisiones), <b>mantener satisfechos</b> (información relevante sin saturar), <b>mantener informados</b> (avisos regulares) y <b>monitorear</b> (comunicación mínima).</p>
<div class="matriz">
  <div class="eje-y">Poder →</div>
  <div class="cuad" style="background:#fdefc8"><b>Mantener satisfechos</b>Áreas del municipio y funcionarios</div>
  <div class="cuad" style="background:#fbe0d4"><b>Gestionar de cerca</b>Docente · Equipo de proyecto</div>
  <div class="cuad" style="background:#eceae3"><b>Monitorear</b>Instituto Cervantes</div>
  <div class="cuad" style="background:#d8efe2"><b>Mantener informados</b>Vecinos · ONG y organizaciones sociales</div>
  <div class="eje-x">Interés →</div>
</div>
<p class="pie">Figura 1. Matriz de poder e interés.</p>

<h1>4. Matriz de comunicaciones</h1>
${tabla(['Qué se comunica', 'Emisor', 'Receptor', 'Canal', 'Frecuencia', 'Formato'], [
  ['Avance y bloqueos', 'Cada integrante', 'Equipo', 'Reunión de seguimiento + WhatsApp', 'Lunes, miércoles y viernes', 'Oral / mensaje'],
  ['Planificación del sprint', corto('JP'), 'Equipo', 'Google Meet + Trello', 'Inicio de cada sprint (cada 2 semanas)', 'Backlog priorizado en Trello'],
  ['Cambios de código', 'Integrante', 'Equipo', 'GitHub: rama + Pull Request', 'Por cada cambio', 'Descripción del Pull Request'],
  ['Publicación de versiones', corto('JP'), 'Equipo', 'Netlify (automática) + aviso por WhatsApp', 'Por cada versión', 'Mensaje con el resumen'],
  ['Minutas de reunión', corto('IJ'), 'Equipo', 'Trello (tarjeta de la reunión)', 'Después de cada reunión', 'Minuta (sección 10)'],
  ['Revisión del sprint', 'Equipo', 'Docente', 'Clase presencial con demostración', 'Fin de cada sprint', 'Demostración del sitio'],
  ['Cambios de alcance', corto('JP'), 'Docente', 'Reunión + correo electrónico', 'Cuando ocurren', 'Pedido de cambio'],
  ['Entregables de gestión', 'Equipo', 'Docente', 'Correo electrónico (PDF)', 'Según calendario de la cátedra', 'Documento PDF'],
  ['Estado de las peticiones', 'Plataforma', 'Vecinos', 'Avisos en la app', 'Automática, en cada novedad', 'Notificación'],
  ['Respuestas oficiales', 'Funcionarios', 'Vecinos', 'Seguimiento de la petición', 'Por cada actualización', 'Mensaje + foto'],
  ['Peticiones elevadas', 'Plataforma', 'Funcionarios', 'Aviso + bandeja del área', 'Al llegar a 50 firmas', 'Notificación'],
  ['Reportes de problemáticas', 'Administración', 'Organismos y ONG', 'Exportes Excel / PDF por correo', 'Mensual', 'Reporte'],
], ['19%', '11%', '12%', '21%', '17%'])}

<h1>5. Reuniones</h1>
<p>El proyecto se organiza en ${SPRINTS.length} sprints de 2 semanas. Cada sprint empieza con una planificación y termina con una revisión ante el docente y una retrospectiva del equipo.</p>
${tabla(['Reunión', 'Propósito', 'Participantes', 'Frecuencia', 'Duración'], [
  ['Seguimiento', 'Cada integrante cuenta qué hizo, qué va a hacer y qué lo bloquea', 'Equipo', 'Lunes, miércoles y viernes', '15 min'],
  ['Planificación de sprint', 'Elegir y repartir las historias del backlog para el sprint', 'Equipo', 'Inicio de sprint', '45 min'],
  ['Revisión de sprint', 'Mostrar lo terminado y recibir devoluciones', 'Equipo y docente', 'Fin de sprint', '30 min'],
  ['Retrospectiva', 'Acordar qué mejorar en la forma de trabajar', 'Equipo', 'Fin de sprint', '20 min'],
], ['20%', '', '16%', '18%', '10%'])}
<p>Tiempo total estimado en reuniones por integrante: <b>${fmt(HORAS_REUNIONES)} h</b> a lo largo del proyecto.</p>

<h1>6. Canales y herramientas</h1>
${tabla(['Canal', 'Uso'], [
  ['WhatsApp (grupo del equipo)', 'Coordinación diaria, avisos rápidos y bloqueos.'],
  ['Trello', 'Product backlog, tareas de cada sprint y su estado; minutas de las reuniones.'],
  ['Google Meet', 'Reuniones de seguimiento y planificación cuando no son presenciales.'],
  ['Clases presenciales', 'Revisiones de sprint y consultas con el docente.'],
  ['GitHub', 'Código, Pull Requests, revisión entre integrantes e historial de cambios.'],
  ['Correo electrónico', 'Comunicaciones formales con el docente y entrega de documentos.'],
  ['Plataforma ENTS', 'Comunicación con vecinos y funcionarios: avisos, seguimiento y comentarios.'],
], ['28%'])}

<h1>7. Flujo de la comunicación</h1>
<div class="flujo">
  <div class="fila">
    <div class="caja"><b>Vecinos</b><br>peticiones, firmas, comentarios</div><div class="flecha">⇄</div>
    <div class="caja"><b>Plataforma ENTS</b><br>avisos y seguimiento</div><div class="flecha">⇄</div>
    <div class="caja"><b>Funcionarios por área</b><br>respuestas oficiales</div><div class="flecha">→</div>
    <div class="caja"><b>Organismos / ONG</b><br>reportes</div>
  </div>
  <div class="fila">
    <div class="caja"><b>Integrantes</b><br>avance de cada tarea</div><div class="flecha">⇄</div>
    <div class="caja"><b>Director del proyecto</b><br>coordina y decide</div><div class="flecha">⇄</div>
    <div class="caja"><b>Docente</b><br>aprueba y orienta</div>
  </div>
</div>
<p class="pie">Figura 2. Arriba, la comunicación de la plataforma en uso; abajo, la comunicación interna del proyecto. Las flechas dobles indican ida y vuelta.</p>

<h1>8. Escalamiento y gestión de cambios</h1>
<p>Escalar un problema es llevarlo al nivel siguiente cuando no se puede resolver en el actual.</p>
<ol>
  <li><b>Nivel 1 — Integrante:</b> resuelve el problema dentro de su tarea; si no puede en 1 día hábil, lo avisa en el grupo.</li>
  <li><b>Nivel 2 — Director del proyecto (${corto('JP')}):</b> lo trata en la siguiente reunión de seguimiento; redistribuye tareas o ajusta prioridades.</li>
  <li><b>Nivel 3 — Docente:</b> los cambios de alcance, de fechas de entrega o los riesgos críticos se presentan al docente con su impacto (procedimiento del Entregable 2, sección 12).</li>
</ol>

<h1>9. Convenciones del equipo</h1>
${lista([
  '<b>Ramas:</b> la rama principal (<code>main</code>) es la versión publicada; cada cambio se hace en una rama propia y se integra con un Pull Request.',
  '<b>Mensajes de commit:</b> en español y describiendo el cambio (por ejemplo, "Score de urgencia calculado automáticamente").',
  '<b>Antes de integrar:</b> revisión del código por otro integrante, pruebas automáticas aprobadas y compilación sin errores.',
  '<b>Documentos:</b> cada modificación se registra en el historial de revisión con versión, fecha, hora y autor.',
])}

<h1>10. Plantilla de minuta de reunión</h1>
<p>La completa ${nombre('IJ')} después de cada reunión y queda guardada en Trello.</p>
<table class="ficha"><tbody>
  <tr><td>Fecha y hora</td><td>&nbsp;</td></tr>
  <tr><td>Tipo de reunión</td><td>Seguimiento / Planificación / Revisión / Retrospectiva</td></tr>
  <tr><td>Participantes</td><td>&nbsp;</td></tr>
  <tr><td>Temas tratados</td><td>&nbsp;<br>&nbsp;</td></tr>
  <tr><td>Decisiones</td><td>&nbsp;<br>&nbsp;</td></tr>
  <tr><td>Tareas (qué · quién · para cuándo)</td><td>&nbsp;<br>&nbsp;</td></tr>
  <tr><td>Próxima reunión</td><td>&nbsp;</td></tr>
</tbody></table>
<p class="pie">Los espacios en blanco de la plantilla se completan en cada reunión.</p>
`
const comunicacion = documento({
  archivo: '06_plan_de_comunicacion', titulo: 'Plan de comunicación', encabezado: 'ENTS · Plan de comunicación', estiloExtra: estiloComunicacion,
  portada: caratula({ numero: 6, titulo: 'Plan de comunicación', subtitulo: 'Gestión de las comunicaciones del proyecto ENTS', codigo: 'ENTS-GP-06' }) + historial('Nuevo plan de comunicación con interesados, matriz de comunicaciones, reuniones, escalamiento y plantilla de minuta.', DETALLE_V3 + ' Se definen frecuencias, canales y responsable de las minutas.'),
  contenido: contenidoComunicacion,
})

// =====================================================================
// 7. GANTT
// =====================================================================
const ancho = (dias) => ((dias / (SEMANAS * 5)) * 100).toFixed(3)
const COLOR = (a) => (a.critica ? '#eb6834' : '#3987e5')
const lineas = Array.from({ length: SEMANAS }, (_, i) => `<i class="g-linea${i % 2 === 0 ? ' g-sprint' : ''}" style="left:${ancho(i * 5)}%"></i>`).join('')

const graficoGantt = `
<div class="gantt">
  <div class="g-fila g-cabecera">
    <div class="g-nombre">Sprint</div>
    <div class="g-pista">${SPRINTS.map((s) => `<span class="g-semana" style="left:${ancho(s.desde)}%;width:${ancho(s.hasta - s.desde)}%">Sprint ${s.numero}</span>`).join('')}</div>
  </div>
  <div class="g-fila g-cabecera g-sub">
    <div class="g-nombre">Actividad · responsable</div>
    <div class="g-pista">${Array.from({ length: SEMANAS }, (_, i) => `<span class="g-semana" style="left:${ancho(i * 5)}%;width:${ancho(5)}%">S${i + 1}</span>`).join('')}</div>
  </div>
  ${ACTIVIDADES.map((a) => `
  <div class="g-fila">
    <div class="g-nombre">${a.critica ? '<b>' + a.id + '</b>' : a.id} ${a.nombre} <span class="sec">· ${corto(a.resp)}</span></div>
    <div class="g-pista">${lineas}
      <span class="g-barra" style="left:${ancho(a.inicio)}%;width:${ancho(a.dur)}%;background:${COLOR(a)}"></span>
      ${a.holgura > 0 ? `<span class="g-holgura" style="left:${ancho(a.fin)}%;width:${ancho(a.holgura)}%"></span>` : ''}
    </div>
  </div>`).join('')}
  <div class="g-separador">Hitos</div>
  ${HITOS.map((h) => `
  <div class="g-fila">
    <div class="g-nombre">◆ ${h.id} ${h.nombre}</div>
    <div class="g-pista">${lineas}<span class="g-hito" style="left:${ancho(h.dia)}%"></span></div>
  </div>`).join('')}
</div>
<div class="g-leyenda">
  <span><i style="background:#eb6834"></i>Actividad crítica (sin holgura)</span>
  <span><i style="background:#3987e5"></i>Actividad con holgura</span>
  <span><i class="rayas"></i>Holgura disponible</span>
  <span><i class="rombo"></i>Hito</span>
  <span><i class="corte"></i>Comienzo de sprint</span>
</div>`

const estiloGantt = `
  .gantt { border: 0.8pt solid #d9d7cf; border-radius: 5pt; padding: 6pt 8pt; break-inside: avoid; }
  .g-fila { display: grid; grid-template-columns: 66mm 1fr; align-items: center; min-height: 15pt; border-bottom: 0.5pt solid #eceae3; }
  .g-nombre { font-size: 7.4pt; padding-right: 6pt; line-height: 1.2; }
  .g-pista { position: relative; height: 15pt; }
  .g-linea { position: absolute; top: 0; bottom: 0; border-left: 0.5pt solid #e1e0d9; }
  .g-linea.g-sprint { border-left: 0.9pt solid #b9b6aa; }
  .g-barra { position: absolute; top: 3.5pt; height: 8pt; border-radius: 2pt; }
  .g-holgura { position: absolute; top: 6pt; height: 3pt; background: repeating-linear-gradient(90deg, #9ec5f4 0 3pt, transparent 3pt 5pt); }
  .g-hito { position: absolute; top: 3pt; width: 9pt; height: 9pt; background: #0d366b; transform: translateX(-4.5pt) rotate(45deg); }
  .g-cabecera { background: #0d366b; color: #fff; font-weight: 600; border-radius: 3pt; }
  .g-cabecera.g-sub { background: #1c5cab; margin-top: 2pt; }
  .g-cabecera .g-nombre { padding-left: 4pt; font-size: 8pt; }
  .g-semana { position: absolute; top: 3pt; text-align: center; font-size: 7.6pt; }
  .g-separador { font-size: 8pt; font-weight: 700; color: #0d366b; padding: 5pt 0 2pt; }
  .g-leyenda { display: flex; flex-wrap: wrap; gap: 4pt 14pt; font-size: 8pt; color: #4a5568; margin: 6pt 0 10pt; }
  .g-leyenda span { display: inline-flex; align-items: center; gap: 4pt; }
  .g-leyenda i { width: 14pt; height: 7pt; border-radius: 2pt; display: inline-block; }
  .g-leyenda i.rayas { height: 3pt; background: repeating-linear-gradient(90deg, #9ec5f4 0 3pt, transparent 3pt 5pt); }
  .g-leyenda i.rombo { width: 7pt; height: 7pt; background: #0d366b; transform: rotate(45deg); border-radius: 0; }
  .g-leyenda i.corte { width: 0; height: 10pt; border-left: 1.2pt solid #b9b6aa; border-radius: 0; }`

const contenidoGantt = `
${indice(['Glosario', 'Cómo leer el diagrama', 'Diagrama de Gantt', 'Sprints', 'Hitos', 'Ruta crítica', 'Conversión a fechas'])}
${guia({
  que: 'El diagrama de Gantt muestra el cronograma del proyecto: cada actividad es una barra ubicada en el tiempo según su duración y sus dependencias.',
  paraQue: 'Permite ver de un vistazo qué se hace en cada semana, qué actividades ocurren en paralelo, cuáles son críticas y cuánta holgura tienen las demás.',
  relacion: 'Se calcula automáticamente a partir de la lista de actividades (Entregable 4): las mismas duraciones, dependencias y responsables. Los hitos coinciden con los del Project Charter (Entregable 1).',
})}

<h1 class="salto">1. Cómo leer el diagrama</h1>
${lista([
  '<b>Eje horizontal:</b> tiempo, en semanas de 5 días hábiles (S1 a S' + SEMANAS + '), agrupadas en ' + SPRINTS.length + ' sprints de 2 semanas.',
  '<b>Cada fila:</b> una actividad con su código, nombre y responsable.',
  '<b>Barra naranja:</b> actividad crítica; si se atrasa, se atrasa todo el proyecto.',
  '<b>Barra azul:</b> actividad con holgura; la línea punteada a su derecha muestra cuántos días puede atrasarse.',
  '<b>Rombo:</b> hito, un momento clave sin duración.',
])}

<h1 class="salto">2. Diagrama de Gantt</h1>
${graficoGantt}

<h1>3. Sprints</h1>
${tabla(['Sprint', 'Días hábiles', 'Semanas', 'Actividades que se trabajan'], SPRINTS.map((s) => [`Sprint ${s.numero}`, `${s.desde + 1} a ${s.hasta}`, `S${s.desde / 5 + 1}–S${Math.ceil(s.hasta / 5)}`, ACTIVIDADES.filter((a) => a.inicio < s.hasta && a.fin > s.desde).map((a) => a.id).join(', ')]), ['11%', '14%', '12%'])}

<h1>4. Hitos</h1>
${tabla(['Hito', 'Día hábil', 'Semana', 'Estado'], HITOS.map((h) => [`${h.id} ${h.nombre}`, h.dia, 'S' + semanaDe(h.dia), h.real]), ['', '11%', '10%', '30%'])}

<h1>5. Ruta crítica</h1>
<p class="ruta">${RUTA.join(' → ')}</p>
<p>Duración total: <b>${DURACION_TOTAL} días hábiles</b> (≈ ${SEMANAS} semanas). Un atraso en cualquiera de estas actividades atrasa la entrega. Las demás tienen holgura: ${ACTIVIDADES.filter((a) => !a.critica).map((a) => `${a.id} (${a.holgura} días)`).join(', ')}.</p>

<h1>6. Conversión a fechas</h1>
<p>El cronograma se expresa en días hábiles relativos porque la fecha de defensa todavía no fue fijada por la cátedra. Una vez confirmada, la fecha de inicio se obtiene contando ${DURACION_TOTAL} días hábiles hacia atrás desde la defensa, y cada día del diagrama se convierte sumando días laborables a esa fecha de inicio (sin contar fines de semana ni feriados).</p>
<p>Como referencia del avance real, el repositorio registra estas versiones del sistema: primera versión funcional el 04/10/2026; panel vecinal, roles, anonimato e ingreso con Google el 11/10/2026; procesamiento automático, seguimiento, reportes, calidad y permisos por panel el 12/10/2026.</p>
`
const gantt = documento({
  archivo: '07_diagrama_de_gantt', titulo: 'Diagrama de Gantt', encabezado: 'ENTS · Diagrama de Gantt', estiloExtra: estiloGantt,
  portada: caratula({ numero: 7, titulo: 'Diagrama de Gantt', subtitulo: 'Cronograma del proyecto ENTS con sprints, ruta crítica e hitos', codigo: 'ENTS-GP-07' }) + historial(`Nuevo cronograma de ${DURACION_TOTAL} días hábiles (${SEMANAS} semanas) calculado a partir de la lista de actividades, con ruta crítica e hitos.`, DETALLE_V3 + ' Se agregan sprints y responsables al diagrama.'),
  contenido: contenidoGantt,
})

// =====================================================================
// Escritura
// =====================================================================
const DOCS = [charter, alcance, edt, listaActividades, diccionario, comunicacion, gantt]
for (const d of DOCS) {
  fs.writeFileSync(path.join(AQUI, d.archivo + '.html'), d.html)
  console.log('escrito', d.archivo + '.html')
}

// Combinado: portada general, glosario completo y los 7 entregables
const glosarioCompleto = `
<h1 class="salto">Glosario general</h1>
<p>Todas las siglas y términos que aparecen en los siete entregables, ordenados alfabéticamente. Cada entregable individual incluye además su propio glosario con los términos que usa.</p>
${tabla(['Término', 'Significado'], [...GLOSARIO].sort((a, b) => a[0].localeCompare(b[0], 'es', { sensitivity: 'base' })).map(([t, d]) => [`<b>${t}</b>`, d]), ['26%'], 'glosario')}`

const portadaCombinado = `
${caratula({ numero: null, titulo: 'Entregables de gestión del proyecto', subtitulo: 'Los siete entregables de ENTS — Everyone Needs To Smile en un único documento', codigo: 'ENTS-GP-00' })}
<h1 class="salto">Contenido</h1>
<p>Este documento reúne los siete entregables de gestión del proyecto, en el orden en que se construyen. Cada uno conserva su carátula, su historial de revisión y su numeración interna, de modo que también puede leerse por separado.</p>
${tabla(['#', 'Entregable', 'Código', 'Qué responde'], [
  ['1', 'Project Charter', 'ENTS-GP-01', '¿Por qué se hace el proyecto y quién lo autoriza?'],
  ['2', 'Declaración de alcance', 'ENTS-GP-02', '¿Qué incluye y qué no incluye?'],
  ['3', 'EDT / WBS', 'ENTS-GP-03', '¿En qué partes se divide el trabajo?'],
  ['4', 'Lista de actividades', 'ENTS-GP-04', '¿Qué tareas hay, cuánto duran y quién las hace?'],
  ['5', 'Diccionario de actividades', 'ENTS-GP-05', '¿Cómo se ejecuta y se acepta cada tarea?'],
  ['6', 'Plan de comunicación', 'ENTS-GP-06', '¿Quién informa qué, a quién y cuándo?'],
  ['7', 'Diagrama de Gantt', 'ENTS-GP-07', '¿Cuándo se hace cada tarea?'],
], ['5%', '26%', '15%'])}
${glosarioCompleto}`

const estilosCombinados = [estiloEdt, estiloGantt, estiloComunicacion, diccionario.estiloExtra].join('\n')
const combinado = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>ENTS — Entregables de gestión (completo)</title>
${FUENTES}
<link rel="stylesheet" href="estilos.css">
<style>
  @page { @top-left { content: "ENTS · Entregables de gestión del proyecto"; } }
  .caratula { break-before: page; }
  .caratula:first-of-type { break-before: auto; }
${estilosCombinados}
</style>
</head>
<body>
${chips(portadaCombinado + '\n' + DOCS.map((d) => conGlosario(d.portada, d.contenido)).join('\n'))}
</body>
</html>
`
fs.writeFileSync(path.join(AQUI, '00_entregables_completos.html'), combinado)
console.log('escrito 00_entregables_completos.html')
console.log('Duración total:', DURACION_TOTAL, 'días · ruta crítica:', RUTA.join(' → '))
console.log('Horas:', JSON.stringify(HORAS), 'reuniones por persona:', HORAS_REUNIONES)

// ---------------- Diseño de la documentación general ----------------
// Misma portada, tipografía, encabezados y estilos que los entregables.
// Se puede ejecutar todas las veces que haga falta: cada paso es idempotente.
{
  const ARCHIVO_DOC = path.join(AQUI, '..', 'documentacion.html')
  let doc = fs.readFileSync(ARCHIVO_DOC, 'utf8').split('\r').join('')
  const portadaDoc = portada({
    tipo: 'Documentación del trabajo práctico',
    titulo: 'Everyone Needs To Smile',
    subtitulo: 'Plataforma de peticiones vecinales con procesamiento de datos y medición de impacto',
    logo: '../../public/logo.svg',
    datos: [
      ['Cátedra', 'Práctica Profesionalizante'],
      ['Docente', 'Ing. Loza'],
      ['Director del proyecto', DIRECTOR],
      ['Contenido', 'Documentación y entregables'],
      ['Versión', VERSION],
      ['Sitio publicado', 'entscordoba.netlify.app'],
    ],
  })
  doc = doc.replace(/<section class="(caratula|portada)">[\s\S]*?<\/section>/, portadaDoc.trim())
  // Las reglas de página propias se reemplazan por las comunes
  doc = doc.replace(/  @page \{\n[\s\S]*?\n  \}\n  @page :first \{[^\n]*\}\n/, '')
  if (!doc.includes('entregables/estilos.css')) {
    doc = doc.replace('</head>', `${FUENTES}\n<link rel="stylesheet" href="entregables/estilos.css">\n<style>\n  @page { @top-left { content: "ENTS · Documentación del trabajo práctico"; } }\n  h1 { break-before: page; }\n  .portada + h1 { break-before: auto; }\n</style>\n</head>`)
  }
  fs.writeFileSync(ARCHIVO_DOC, chips(doc))
  console.log('documentacion.html con el diseño común')
}

// Datos para la documentación general (misma información)
fs.writeFileSync(path.join(AQUI, '_gantt_fragmento.json'), JSON.stringify({ graficoGantt, estiloGantt, DURACION_TOTAL, SEMANAS, RUTA }))
