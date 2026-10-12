// Genera los entregables 2 a 7 (y el combinado con los 7) a partir de los
// mismos datos, para que actividades, duraciones y ruta crítica coincidan.
// Uso: node generar.cjs   → escribe los .html en esta carpeta
const fs = require('fs')
const path = require('path')

const AQUI = __dirname
const C = (texto) => `<span class="completar">${texto}</span>`

// ---------------- Datos del cronograma ----------------
// dur = días hábiles; pred = predecesoras (fin → comienzo)
const ACTIVIDADES = [
  { id: 'A1', nombre: 'Analizar la propuesta de reorientación y redefinir el proyecto', edt: '1.1.1', dur: 3, pred: [], entregable: 'Propuesta de reorientación aprobada', criterio: 'El equipo y el docente acuerdan el nuevo enfoque', recursos: 'Equipo completo; documentación previa' },
  { id: 'A2', nombre: 'Redactar Project Charter y declaración de alcance', edt: '1.1.1–1.1.2', dur: 3, pred: ['A1'], entregable: 'Project Charter y Declaración de alcance', criterio: 'Documentos completos y aprobados por el docente', recursos: 'Equipo; plantillas de gestión' },
  { id: 'A3', nombre: 'Definir plan de comunicación y cronograma', edt: '1.1.3–1.1.4', dur: 2, pred: ['A2'], entregable: 'Plan de comunicación y cronograma base', criterio: 'Canales, frecuencias y responsables definidos', recursos: 'Equipo' },
  { id: 'A4', nombre: 'Revisar encuesta y análisis socioeconómico', edt: '1.2.1–1.2.2', dur: 3, pred: ['A1'], entregable: 'Informe de necesidades actualizado', criterio: 'Necesidades vinculadas a las categorías del sistema', recursos: 'Resultados de la encuesta; análisis previo' },
  { id: 'A5', nombre: 'Relevar requerimientos y armar product backlog', edt: '1.2.3–1.2.4', dur: 4, pred: ['A2', 'A4'], entregable: 'Requerimientos y product backlog priorizado', criterio: 'Cada requerimiento trazable a una historia de usuario', recursos: 'Equipo; tablero de tareas' },
  { id: 'A6', nombre: 'Diseñar arquitectura y elegir tecnologías', edt: '1.3.1', dur: 3, pred: ['A5', 'A3'], entregable: 'Documento de arquitectura y despliegue', criterio: 'Cubre todos los requerimientos con servicios gratuitos', recursos: 'Equipo; documentación de las tecnologías' },
  { id: 'A7', nombre: 'Diseñar modelo de datos y reglas de seguridad', edt: '1.3.2, 1.3.4', dur: 4, pred: ['A6'], entregable: 'DER, esquema SQL y políticas de acceso', criterio: 'Esquema reproducible y reglas por rol definidas', recursos: 'Supabase; PostgreSQL' },
  { id: 'A8', nombre: 'Diseñar interfaz y navegación', edt: '1.3.3', dur: 4, pred: ['A5'], entregable: 'Prototipo de pantallas y estilo visual', criterio: 'Flujos principales aprobados por el equipo', recursos: 'Editor de diseño; equipo' },
  { id: 'A9', nombre: 'Configurar repositorio, base de datos y publicación', edt: '1.6.1–1.6.2', dur: 2, pred: ['A6'], entregable: 'Repositorio, proyecto Supabase y sitio en Netlify', criterio: 'Cada cambio en la rama principal se publica solo', recursos: 'GitHub; Supabase; Netlify' },
  { id: 'A10', nombre: 'Desarrollar autenticación, roles y anonimato', edt: '1.4.1', dur: 5, pred: ['A7', 'A9'], entregable: 'Módulo de cuentas y roles', criterio: 'Registro, ingreso con Google, recuperación y roles operativos', recursos: 'React; Supabase Auth' },
  { id: 'A11', nombre: 'Desarrollar peticiones, fotos, firmas y moderación', edt: '1.4.2, 1.4.7', dur: 6, pred: ['A10', 'A8'], entregable: 'Módulo de peticiones y moderación', criterio: 'Alta con fotos y ubicación; una firma por persona; moderación previa', recursos: 'React; Supabase; Storage' },
  { id: 'A12', nombre: 'Desarrollar clasificación, barrio, score y similares', edt: '1.4.3', dur: 5, pred: ['A11'], entregable: 'Procesamiento automático', criterio: 'Casos de prueba de cada algoritmo resueltos correctamente', recursos: 'PostgreSQL (pg_trgm); OpenStreetMap' },
  { id: 'A13', nombre: 'Desarrollar mapa por barrios, comunidad y eventos', edt: '1.4.4', dur: 5, pred: ['A11'], entregable: 'Mapa, muro vecinal y agenda', criterio: 'Filtros por barrio operativos en las tres pantallas', recursos: 'Leaflet; OpenStreetMap' },
  { id: 'A14', nombre: 'Desarrollar seguimiento, notificaciones y comentarios', edt: '1.4.5', dur: 5, pred: ['A11'], entregable: 'Seguimiento, avisos y comentarios', criterio: 'Cada cambio de etapa notifica a autor y firmantes', recursos: 'Supabase (disparadores y funciones)' },
  { id: 'A15', nombre: 'Desarrollar estadísticas, panel analítico y exportes', edt: '1.4.6', dur: 4, pred: ['A12', 'A13'], entregable: 'Paneles y reportes Excel/PDF', criterio: 'Los datos de los paneles coinciden con la base', recursos: 'React; funciones de estadísticas' },
  { id: 'A16', nombre: 'Pruebas automáticas y pruebas de permisos por rol', edt: '1.5.1–1.5.2', dur: 4, pred: ['A12', 'A14', 'A15'], entregable: 'Suite de pruebas y reporte de permisos', criterio: '100% de las pruebas aprobadas', recursos: 'Vitest; consultas por rol' },
  { id: 'A17', nombre: 'Accesibilidad, modo oscuro, app instalable y rendimiento', edt: '1.5.3, 1.6.3', dur: 4, pred: ['A15'], entregable: 'App instalable, accesible y fluida en celular', criterio: 'Navegable con teclado; instalable; sin animaciones pesadas en celular', recursos: 'Service worker; manifiesto; CSS' },
  { id: 'A18', nombre: 'Redactar documentación', edt: '1.7.1', dur: 5, pred: ['A16', 'A17'], entregable: 'Documentación del proyecto y entregables de gestión', criterio: 'Cumple la estructura exigida por la cátedra', recursos: 'Equipo' },
  { id: 'A19', nombre: 'Preparar presentación', edt: '1.7.2', dur: 2, pred: ['A18'], entregable: 'Presentación para la defensa', criterio: 'Ensayada y dentro del tiempo asignado', recursos: 'Equipo' },
  { id: 'A20', nombre: 'Entrega y defensa', edt: '1.7.3', dur: 1, pred: ['A19'], entregable: 'Proyecto entregado y defendido', criterio: 'Aprobación del docente', recursos: 'Equipo completo' },
]

// Método de la ruta crítica (pasada hacia adelante y hacia atrás)
const porId = new Map(ACTIVIDADES.map((a) => [a.id, a]))
for (const a of ACTIVIDADES) {
  a.inicio = Math.max(0, ...a.pred.map((p) => porId.get(p).fin))
  a.fin = a.inicio + a.dur
}
const DURACION_TOTAL = Math.max(...ACTIVIDADES.map((a) => a.fin))
for (const a of [...ACTIVIDADES].reverse()) {
  const sucesoras = ACTIVIDADES.filter((s) => s.pred.includes(a.id))
  a.sucesoras = sucesoras.map((s) => s.id)
  a.finTardio = sucesoras.length ? Math.min(...sucesoras.map((s) => s.inicioTardio)) : DURACION_TOTAL
  a.inicioTardio = a.finTardio - a.dur
  a.holgura = a.inicioTardio - a.inicio
  a.critica = a.holgura === 0
}
const SEMANAS = Math.ceil(DURACION_TOTAL / 5)
const RUTA = ACTIVIDADES.filter((a) => a.critica).map((a) => a.id)

// ---------------- Plantilla común ----------------
const AUTORES = `
    <table>
      <tr><td>Jiménez, Ignacio</td><td>Legajo 28177</td></tr>
      <tr><td>Andrada, Juan Pablo</td><td>Legajo 27318</td></tr>
      <tr><td>Patrón, Máximo</td><td>Legajo 27311</td></tr>
    </table>`

function caratula({ numero, titulo, subtitulo, codigo }) {
  return `
<section class="caratula">
  <div>
    <div class="inst">Instituto Cervantes</div>
    <div style="font-size:10.5pt;color:#4a5568;margin-top:3pt">Carrera: ${C('[completar]')} · Cátedra: Práctica Profesionalizante</div>
  </div>
  <div>
    <div style="display:flex;align-items:center;gap:14pt">
      <img src="../../../public/logo.svg" alt="" style="width:62pt;height:62pt;border-radius:12pt">
      <div>
        <div class="tipo">Entregable ${numero} de 7</div>
        <h1 class="titulo">${titulo}</h1>
        <div class="sub">${subtitulo}</div>
      </div>
    </div>
    <div class="franja"></div>
    <table>
      <tr><td>Proyecto</td><td>ENTS — Plataforma de peticiones vecinales de Córdoba</td></tr>
      <tr><td>Docente</td><td>Ing. Loza</td></tr>
      <tr><td>Código del documento</td><td>${codigo}</td></tr>
      <tr><td>Versión</td><td>2.0</td></tr>
      <tr><td>Fecha de entrega</td><td>${C('[__/__/____]')}</td></tr>
    </table>
  </div>
  <div>
    <div style="font-size:10pt;color:#4a5568;margin-bottom:4pt">Autores</div>${AUTORES}
  </div>
</section>`
}

function historial(detalle) {
  return `
<h1 class="salto">Historial de revisión</h1>
<table>
  <thead><tr><th style="width:11%">Versión</th><th style="width:22%">Fecha y hora</th><th style="width:22%">Autor</th><th>Modificación</th></tr></thead>
  <tbody>
    <tr><td>1.0</td><td>${C('[fecha] [hh:mm]')}</td><td>Equipo</td><td>Versión original del proyecto de donaciones solidarias.</td></tr>
    <tr><td>2.0</td><td>12/10/2026 ${C('[hh:mm]')}</td><td>Andrada, Juan Pablo</td><td>${detalle}</td></tr>
    <tr><td>&nbsp;</td><td></td><td></td><td></td></tr>
  </tbody>
</table>`
}

function indice(items) {
  return `<h2>Contenido</h2><ol>${items.map((i) => `<li>${i}</li>`).join('')}</ol>`
}

function documento({ archivo, titulo, encabezado, cuerpo, estiloExtra = '' }) {
  return {
    archivo,
    titulo,
    encabezado,
    cuerpo,
    estiloExtra,
    html: `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>ENTS — ${titulo}</title>
<link rel="stylesheet" href="estilos.css">
<style>
  @page { @top-right { content: "${encabezado}"; font: 8pt 'Segoe UI', Arial, sans-serif; color: #9a988f; } }
${estiloExtra}
</style>
</head>
<body>
${cuerpo}
</body>
</html>
`,
  }
}

const tabla = (cabeceras, filas, anchos = []) => `
<table>
  <thead><tr>${cabeceras.map((c, i) => `<th${anchos[i] ? ` style="width:${anchos[i]}"` : ''}>${c}</th>`).join('')}</tr></thead>
  <tbody>${filas.map((f) => `<tr>${f.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
</table>`

// ---------------- Datos de alcance ----------------
const RF = [
  ['RF01', 'Registrar usuarios con correo y contraseña o con Google; recuperar la contraseña por correo.', 'Alta'],
  ['RF02', 'Elegir el tipo de cuenta al registrarse (vecino o funcionario, este último sujeto a aprobación).', 'Alta'],
  ['RF03', 'Crear peticiones con título, descripción, hasta 3 fotos y ubicación en el mapa.', 'Alta'],
  ['RF04', 'Sugerir automáticamente la categoría según el texto y el barrio según la ubicación.', 'Alta'],
  ['RF05', 'Calcular automáticamente el score de urgencia (0 a 100) de cada petición.', 'Alta'],
  ['RF06', 'Advertir peticiones similares antes de crear una nueva.', 'Alta'],
  ['RF07', 'Moderar las peticiones antes de publicarlas (aprobar, rechazar, editar, eliminar).', 'Alta'],
  ['RF08', 'Firmar y retirar la firma; ordenar el inicio por prioridad según firmas.', 'Alta'],
  ['RF09', 'Elevar automáticamente al área las peticiones que alcanzan 50 firmas.', 'Media'],
  ['RF10', 'Registrar respuestas oficiales y la etapa de seguimiento con foto.', 'Alta'],
  ['RF11', 'Notificar a autor y firmantes de cada novedad; permitir seguir barrios.', 'Media'],
  ['RF12', 'Comentar en forma anónima, denunciar y moderar comentarios.', 'Media'],
  ['RF13', 'Mostrar el mapa por barrios coloreado por peticiones, firmas o urgencia.', 'Media'],
  ['RF14', 'Ofrecer estadísticas públicas anónimas y un panel analítico para administradores.', 'Media'],
  ['RF15', 'Exportar reportes de peticiones y barrios a Excel y PDF.', 'Media'],
  ['RF16', 'Asignar áreas a funcionarios y mostrarles una bandeja de su área.', 'Media'],
  ['RF17', 'Permitir solo al dueño del proyecto cambiar el rol de las cuentas.', 'Baja'],
  ['RF18', 'Publicar en el muro vecinal y consultar la agenda de eventos por barrio.', 'Baja'],
]
const RNF = [
  ['RNF01', 'Privacidad', 'Anonimato entre vecinos; identidades visibles solo para funcionarios y administradores.'],
  ['RNF02', 'Seguridad', 'Reglas de acceso aplicadas en la base de datos (RLS); comunicación por HTTPS.'],
  ['RNF03', 'Usabilidad', 'Interfaz en español, adaptable a celular, modo claro y oscuro.'],
  ['RNF04', 'Accesibilidad', 'Navegación con teclado, foco visible, movimiento reducido, tablas alternativas a los gráficos.'],
  ['RNF05', 'Rendimiento', 'Carga por partes de cada página; animaciones reducidas en celulares.'],
  ['RNF06', 'Disponibilidad', 'Aplicación instalable (PWA) que abre aun con conexión inestable.'],
  ['RNF07', 'Mantenibilidad', 'Revisión automática de código, pruebas automáticas y esquema SQL versionado.'],
  ['RNF08', 'Legal', 'Política de privacidad publicada; cumplimiento de la Ley 25.326.'],
]

// ---------------- 2. Declaración de alcance ----------------
const alcance = documento({
  archivo: '02_declaracion_de_alcance',
  titulo: 'Declaración de alcance',
  encabezado: 'ENTS · Declaración de alcance (Scope Statement)',
  cuerpo: `
${caratula({ numero: 2, titulo: 'Declaración de alcance', subtitulo: 'Scope Statement del proyecto ENTS — Everyone Needs To Smile', codigo: 'ENTS-GP-02' })}
${historial('Reescritura completa para el sistema de peticiones vecinales: alcance del producto, requisitos, entregables, exclusiones y control de cambios.')}
${indice(['Objetivo del documento', 'Alcance del producto', 'Requisitos funcionales', 'Requisitos no funcionales', 'Entregables del proyecto', 'Criterios de aceptación del producto', 'Exclusiones', 'Supuestos y restricciones', 'Límites e interfaces del sistema', 'Control de cambios del alcance', 'Aprobación'])}

<h1 class="salto">1. Objetivo del documento</h1>
<p>Este documento define en detalle qué incluye y qué no incluye el proyecto ENTS, a partir del alcance preliminar del Project Charter. Sirve como referencia para planificar, ejecutar y aceptar el trabajo, y para evaluar cualquier pedido de cambio.</p>

<h1>2. Alcance del producto</h1>
<p>ENTS es una aplicación web adaptable a celular e instalable (PWA) en la que los vecinos de Córdoba y Villa Allende publican problemas de su barrio, los apoyan con firmas y siguen su resolución; los funcionarios de cada área del municipio responden y registran el avance; y los administradores moderan, analizan y exportan la información. Sus características principales son:</p>
${tabla(['Característica', 'Descripción'], [
  ['Cuentas y roles', 'Registro e ingreso con correo o Google; recuperación de contraseña; roles de vecino, funcionario por área, administrador y dueño.'],
  ['Peticiones', 'Título, descripción, hasta 3 fotos comprimidas y ubicación en mapa; quedan pendientes hasta su moderación.'],
  ['Procesamiento automático', 'Categoría (16) por palabras clave, barrio (111) por cercanía, score de urgencia, detección de similares y revisión de textos.'],
  ['Firmas y prioridad', 'Una firma por persona; cinco niveles de prioridad; elevación al área a las 50 firmas.'],
  ['Seguimiento', 'Etapas recibida → en revisión → derivada → en obra → resuelta, con respuesta oficial y foto.'],
  ['Participación', 'Notificaciones, comentarios anónimos con denuncias, barrios seguidos e insignias.'],
  ['Comunidad', 'Mapa por barrios, muro vecinal y agenda de eventos.'],
  ['Reportes', 'Estadísticas públicas anónimas, panel analítico, exportación a Excel y PDF.'],
  ['Administración', 'Moderación, directorio de usuarios, asignación de áreas, cambio de roles (solo dueño) y documentos privados.'],
], ['26%'])}

<h1>3. Requisitos funcionales</h1>
${tabla(['ID', 'Requisito', 'Prioridad'], RF.map(([id, t, p]) => [id, t, `<span class="nivel ${p === 'Alta' ? 'alta' : p === 'Media' ? 'media' : 'baja'}">${p}</span>`]), ['9%', '', '12%'])}

<h1>4. Requisitos no funcionales</h1>
${tabla(['ID', 'Atributo', 'Requisito'], RNF, ['10%', '17%'])}

<h1>5. Entregables del proyecto</h1>
${tabla(['#', 'Entregable', 'Descripción', 'Criterio de aceptación'], [
  ['1', 'Aplicación web publicada', 'Sitio en producción con todos los módulos del alcance.', 'Todas las características operativas en el sitio publicado.'],
  ['2', 'Base de datos', 'Esquema SQL con tablas, políticas, funciones y disparadores.', 'Se recrea completa ejecutando <code>schema.sql</code>.'],
  ['3', 'Repositorio de código', 'Código fuente versionado con README e instrucciones.', 'Otro integrante puede instalarlo y correrlo siguiendo el README.'],
  ['4', 'Suite de pruebas', 'Pruebas automáticas y pruebas de permisos por rol.', '100% aprobadas antes de cada publicación.'],
  ['5', 'Entregables de gestión', 'Charter, alcance, EDT, actividades, diccionario, comunicación y Gantt.', 'Completos y consistentes entre sí.'],
  ['6', 'Documentación técnica', 'Requerimientos, arquitectura, datos, seguridad, pruebas e implementación.', 'Refleja el sistema implementado.'],
  ['7', 'Presentación', 'Exposición del proyecto para la defensa.', 'Aprobada por el equipo y ensayada.'],
], ['5%', '22%', '', '33%'])}

<h1>6. Criterios de aceptación del producto</h1>
<ul>
  <li>El ciclo completo —pedir, moderar, firmar, priorizar, responder y resolver— funciona en el sitio publicado.</li>
  <li>Toda petición nueva recibe categoría sugerida, barrio y score de urgencia sin intervención manual.</li>
  <li>Un vecino no puede ver la identidad de otros vecinos ni modificar datos ajenos (verificado con pruebas por rol).</li>
  <li>No se publican teléfonos, correos ni documentos en los comentarios.</li>
  <li>La aplicación se puede instalar en el celular y navegar con teclado.</li>
  <li>Las pruebas automáticas se ejecutan sin errores y la compilación de producción es exitosa.</li>
</ul>

<h1>7. Exclusiones</h1>
${tabla(['Fuera del alcance', 'Motivo'], [
  ['Pagos, donaciones o recaudación dentro de la plataforma', 'Complejidad legal y de integración; si se coordinan donaciones, ocurren por fuera.'],
  ['Integración con sistemas internos del municipio', 'Sin acceso a esos sistemas; los funcionarios responden desde ENTS.'],
  ['Notificaciones por correo electrónico o SMS', 'Requiere servicios pagos; se usan notificaciones dentro de la app.'],
  ['Aplicaciones nativas para Android o iOS', 'Se cubre con la aplicación instalable (PWA).'],
  ['Polígonos oficiales de los barrios', 'Se usan los centros de OpenStreetMap; se evalúa como mejora futura.'],
  ['Atención de reclamos en forma directa por el equipo', 'El equipo provee la herramienta; la resolución corresponde a los organismos.'],
], ['45%'])}

<h1>8. Supuestos y restricciones</h1>
<div class="dos-col">
  <div class="tarjeta"><h4>Supuestos</h4><ul>
    <li>Los usuarios tienen acceso a internet y un navegador actualizado.</li>
    <li>Los servicios gratuitos se mantienen durante el proyecto.</li>
    <li>Los organismos designan funcionarios por área para la operación real.</li>
    <li>El equipo mantiene su disponibilidad durante el ciclo lectivo.</li>
  </ul></div>
  <div class="tarjeta"><h4>Restricciones</h4><ul>
    <li>Plazo: calendario de la cátedra.</li>
    <li>Equipo: tres integrantes con dedicación parcial.</li>
    <li>Presupuesto: $0 (solo servicios gratuitos).</li>
    <li>Legales: Ley 25.326 de Protección de Datos Personales.</li>
  </ul></div>
</div>

<h1>9. Límites e interfaces del sistema</h1>
${tabla(['Sistema externo', 'Interfaz', 'Uso'], [
  ['Supabase', 'API REST y cliente JavaScript sobre HTTPS', 'Base de datos, autenticación, almacenamiento de fotos y documentos.'],
  ['Netlify', 'Publicación continua desde GitHub', 'Sitio en producción con HTTPS.'],
  ['OpenStreetMap', 'Teselas del mapa; Nominatim (carga única de barrios)', 'Mapa vecinal y ubicación de barrios.'],
  ['Google', 'OAuth 2.0', 'Ingreso con cuenta de Google (opcional).'],
  ['Navegador del usuario', 'Geolocalización, cámara/archivos, service worker', 'Ubicación de la petición, fotos e instalación de la app.'],
], ['18%', '36%'])}

<h1>10. Control de cambios del alcance</h1>
<ol>
  <li>Cualquier integrante registra el pedido de cambio (qué, por qué, impacto estimado en tiempo y calidad).</li>
  <li>El equipo lo analiza en la siguiente reunión de planificación.</li>
  <li>Si afecta objetivos, entregables o plazos, se presenta al docente para su aprobación.</li>
  <li>Si se aprueba, se actualizan este documento, la EDT, la lista de actividades y el Gantt, y se registra en el historial de revisión.</li>
</ol>
<div class="nota">Ejemplo de cambio aprobado: reemplazo del módulo de pagos y donaciones por el sistema de peticiones (versión 2.0 de este documento).</div>

<h1>11. Aprobación</h1>
<div class="firmas">
  <div class="firma"><b>Ing. Loza</b>Docente — Patrocinador<br>Fecha: ___/___/______</div>
  <div class="firma"><b>${C('[Director del proyecto]')}</b>Director del proyecto<br>Fecha: ___/___/______</div>
</div>
`,
})

// ---------------- 3. EDT ----------------
const EDT = [
  { c: '1.1', n: 'Gestión del proyecto', d: 'Planificación, coordinación y control.', h: [['1.1.1', 'Project Charter'], ['1.1.2', 'Declaración de alcance'], ['1.1.3', 'Plan de comunicación'], ['1.1.4', 'Cronograma (Gantt)'], ['1.1.5', 'Seguimiento y control']] },
  { c: '1.2', n: 'Análisis', d: 'Comprensión del problema y de los requisitos.', h: [['1.2.1', 'Estudio de necesidades y encuesta'], ['1.2.2', 'Análisis socioeconómico'], ['1.2.3', 'Requerimientos'], ['1.2.4', 'Product backlog']] },
  { c: '1.3', n: 'Diseño', d: 'Definición técnica y visual de la solución.', h: [['1.3.1', 'Arquitectura'], ['1.3.2', 'Modelo de datos'], ['1.3.3', 'Interfaz y navegación'], ['1.3.4', 'Seguridad y roles']] },
  { c: '1.4', n: 'Desarrollo', d: 'Construcción de las funcionalidades.', h: [['1.4.1', 'Autenticación y roles'], ['1.4.2', 'Peticiones y firmas'], ['1.4.3', 'Procesamiento automático'], ['1.4.4', 'Mapa y comunidad'], ['1.4.5', 'Seguimiento y avisos'], ['1.4.6', 'Reportes'], ['1.4.7', 'Moderación']] },
  { c: '1.5', n: 'Pruebas y calidad', d: 'Verificación del producto.', h: [['1.5.1', 'Pruebas automáticas'], ['1.5.2', 'Pruebas de permisos'], ['1.5.3', 'Accesibilidad y rendimiento']] },
  { c: '1.6', n: 'Implementación', d: 'Puesta en producción.', h: [['1.6.1', 'Base de datos en la nube'], ['1.6.2', 'Publicación web'], ['1.6.3', 'App instalable']] },
  { c: '1.7', n: 'Documentación y cierre', d: 'Documentos, presentación y entrega.', h: [['1.7.1', 'Documentación'], ['1.7.2', 'Presentación'], ['1.7.3', 'Entrega y defensa']] },
]
const cantidadPaquetes = EDT.reduce((t, r) => t + r.h.length, 0)

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

const edt = documento({
  archivo: '03_edt_wbs',
  titulo: 'EDT / WBS',
  encabezado: 'ENTS · Estructura de desglose del trabajo (EDT / WBS)',
  estiloExtra: estiloEdt,
  cuerpo: `
${caratula({ numero: 3, titulo: 'EDT / WBS', subtitulo: 'Estructura de desglose del trabajo del proyecto ENTS', codigo: 'ENTS-GP-03' })}
${historial('Nueva EDT orientada a entregables para el sistema de peticiones vecinales (7 componentes, ' + cantidadPaquetes + ' paquetes de trabajo).')}
${indice(['Criterios de construcción', 'Diagrama de la EDT', 'EDT en formato de lista', 'Relación con las actividades'])}

<h1 class="salto">1. Criterios de construcción</h1>
<ul>
  <li><b>Orientada a entregables:</b> cada elemento representa un resultado verificable, no una tarea suelta.</li>
  <li><b>Regla del 100%:</b> la EDT incluye todo el trabajo del proyecto y nada que esté fuera del alcance aprobado.</li>
  <li><b>Tres niveles:</b> proyecto (nivel 1), componentes (nivel 2) y paquetes de trabajo (nivel 3).</li>
  <li><b>Codificación jerárquica:</b> cada paquete se identifica con un código (por ejemplo, 1.4.3) que se usa en la lista y el diccionario de actividades.</li>
</ul>
<table class="ficha"><tbody>
  <tr><td>Componentes (nivel 2)</td><td>${EDT.length}</td></tr>
  <tr><td>Paquetes de trabajo (nivel 3)</td><td>${cantidadPaquetes}</td></tr>
  <tr><td>Actividades asociadas</td><td>${ACTIVIDADES.length} (ver Entregable 4)</td></tr>
</tbody></table>

<h1>2. Diagrama de la EDT</h1>
${diagramaEdt}
<p class="pie">Figura 1. EDT del proyecto ENTS (tres niveles).</p>

<h1 class="salto">3. EDT en formato de lista</h1>
<table>
  <thead><tr><th style="width:12%">Código</th><th style="width:35%">Elemento</th><th>Descripción / entregable</th></tr></thead>
  <tbody>
    <tr><td><b>1</b></td><td><b>ENTS — Plataforma de peticiones vecinales</b></td><td>Proyecto completo.</td></tr>
    ${EDT.map((r) => `<tr><td><b>${r.c}</b></td><td><b>${r.n}</b></td><td>${r.d}</td></tr>${r.h.map(([c, n]) => `<tr><td>&nbsp;&nbsp;${c}</td><td>&nbsp;&nbsp;${n}</td><td>${ACTIVIDADES.filter((a) => a.edt.split(/[,–]\s*/).some((e) => e.trim() === c) || (a.edt.includes('–') && dentroDeRango(c, a.edt))).map((a) => a.entregable).join('; ') || '—'}</td></tr>`).join('')}`).join('')}
  </tbody>
</table>

<h1>4. Relación con las actividades</h1>
${tabla(['Componente', 'Actividades'], EDT.map((r) => [`${r.c} ${r.n}`, ACTIVIDADES.filter((a) => a.edt.startsWith(r.c) || a.edt.includes(' ' + r.c)).map((a) => `${a.id} ${a.nombre}`).join('<br>') || '—']), ['30%'])}
`,
})

function dentroDeRango(codigo, rango) {
  const [a, b] = rango.split('–').map((s) => s.trim())
  if (!b) return false
  const partes = (x) => x.split('.').map(Number)
  const [c1, c2, c3] = partes(codigo)
  const [a1, a2, a3] = partes(a)
  const [b1, b2, b3] = partes(b)
  return c1 === a1 && c2 === a2 && a2 === b2 && c3 >= a3 && c3 <= b3 && a1 === b1
}

// ---------------- 4. Lista de actividades ----------------
const lista = documento({
  archivo: '04_lista_de_actividades',
  titulo: 'Lista de actividades',
  encabezado: 'ENTS · Lista de actividades',
  cuerpo: `
${caratula({ numero: 4, titulo: 'Lista de actividades', subtitulo: 'Actividades, duraciones, dependencias y ruta crítica del proyecto ENTS', codigo: 'ENTS-GP-04' })}
${historial('Nueva lista de ' + ACTIVIDADES.length + ' actividades para el sistema de peticiones, con cálculo de ruta crítica.')}
${indice(['Convenciones', 'Lista de actividades', 'Resumen del cronograma', 'Ruta crítica'])}

<h1 class="salto">1. Convenciones</h1>
<ul>
  <li><b>Duración:</b> días hábiles de trabajo del equipo.</li>
  <li><b>Dependencias:</b> de tipo fin-comienzo (la actividad empieza cuando terminan todas sus predecesoras).</li>
  <li><b>Inicio y fin:</b> día hábil relativo al comienzo del proyecto (día 0). Se convierten a fechas una vez fijada la fecha de inicio (${C('[__/__/____]')}).</li>
  <li><b>Holgura:</b> días que la actividad puede atrasarse sin atrasar el proyecto. Holgura 0 = actividad crítica.</li>
</ul>

<h1>2. Lista de actividades</h1>
<table>
  <thead><tr><th style="width:5%">ID</th><th>Actividad</th><th style="width:10%">EDT</th><th style="width:7%">Dur.</th><th style="width:11%">Predecesoras</th><th style="width:7%">Inicio</th><th style="width:6%">Fin</th><th style="width:8%">Holgura</th><th style="width:11%">Responsable</th></tr></thead>
  <tbody>
    ${ACTIVIDADES.map((a) => `<tr><td>${a.critica ? '<b>' + a.id + '</b>' : a.id}</td><td>${a.nombre}</td><td>${a.edt}</td><td>${a.dur}</td><td>${a.pred.join(', ') || '—'}</td><td>${a.inicio}</td><td>${a.fin}</td><td>${a.critica ? '<span class="nivel alta">0 · crítica</span>' : a.holgura}</td><td>${C('[asignar]')}</td></tr>`).join('')}
  </tbody>
</table>

<h1>3. Resumen del cronograma</h1>
<table class="ficha"><tbody>
  <tr><td>Cantidad de actividades</td><td>${ACTIVIDADES.length}</td></tr>
  <tr><td>Duración total del proyecto</td><td>${DURACION_TOTAL} días hábiles (≈ ${SEMANAS} semanas)</td></tr>
  <tr><td>Esfuerzo total (suma de duraciones)</td><td>${ACTIVIDADES.reduce((t, a) => t + a.dur, 0)} días-actividad</td></tr>
  <tr><td>Actividades críticas</td><td>${RUTA.length} de ${ACTIVIDADES.length}</td></tr>
</tbody></table>

<h1>4. Ruta crítica</h1>
<p>La ruta crítica es la secuencia de actividades sin holgura: cualquier atraso en ellas atrasa la entrega final.</p>
<p style="font-weight:600;color:#0d366b">${RUTA.join(' → ')}</p>
<p>Las actividades fuera de la ruta crítica (${ACTIVIDADES.filter((a) => !a.critica).map((a) => `${a.id} con ${a.holgura} días`).join(', ')}) pueden reprogramarse dentro de su holgura para equilibrar la carga del equipo.</p>
<div class="nota">Completar la columna "Responsable" con el integrante a cargo de cada actividad.</div>
`,
})

// ---------------- 5. Diccionario de actividades ----------------
const fichas = ACTIVIDADES.map((a) => `
<table class="ficha">
  <thead><tr><th colspan="2">${a.id} · ${a.nombre}</th></tr></thead>
  <tbody>
    <tr><td>Paquete de la EDT</td><td>${a.edt}</td></tr>
    <tr><td>Entregable</td><td>${a.entregable}</td></tr>
    <tr><td>Recursos</td><td>${a.recursos}</td></tr>
    <tr><td>Duración</td><td>${a.dur} días hábiles (día ${a.inicio} a ${a.fin}) · holgura ${a.holgura}${a.critica ? ' · <b>crítica</b>' : ''}</td></tr>
    <tr><td>Predecesoras / sucesoras</td><td>${a.pred.join(', ') || '—'} / ${a.sucesoras.join(', ') || '—'}</td></tr>
    <tr><td>Criterio de aceptación</td><td>${a.criterio}</td></tr>
    <tr><td>Responsable</td><td>${C('[asignar]')}</td></tr>
  </tbody>
</table>`).join('')

const diccionario = documento({
  archivo: '05_diccionario_de_actividades',
  titulo: 'Diccionario de actividades',
  encabezado: 'ENTS · Diccionario de actividades',
  estiloExtra: `  table.ficha { margin-bottom: 9pt; break-inside: avoid; } table.ficha th { font-size: 9.5pt; } table.ficha td { padding: 2.5pt 6pt; }`,
  cuerpo: `
${caratula({ numero: 5, titulo: 'Diccionario de actividades', subtitulo: 'Ficha detallada de cada actividad del proyecto ENTS', codigo: 'ENTS-GP-05' })}
${historial('Nuevo diccionario con una ficha por cada una de las ' + ACTIVIDADES.length + ' actividades del sistema de peticiones.')}
<h2>Contenido</h2>
<p>Cada ficha describe una actividad de la lista (Entregable 4): el paquete de la EDT al que pertenece, el entregable que produce, los recursos que usa, su duración y ubicación en el cronograma, sus dependencias y el criterio con el que se acepta como terminada.</p>
<h1 class="salto">Fichas de actividades</h1>
${fichas}
`,
})

// ---------------- 6. Plan de comunicación ----------------
const comunicacion = documento({
  archivo: '06_plan_de_comunicacion',
  titulo: 'Plan de comunicación',
  encabezado: 'ENTS · Plan de comunicación',
  estiloExtra: `
  .matriz { display: grid; grid-template-columns: 26pt 1fr 1fr; grid-template-rows: 1fr 1fr 18pt; gap: 4pt; height: 210pt; break-inside: avoid; margin: 6pt 0 12pt; }
  .cuad { border-radius: 5pt; padding: 7pt 9pt; font-size: 8.8pt; }
  .cuad b { display: block; font-size: 9pt; margin-bottom: 3pt; }
  .eje-y { grid-row: 1 / 3; writing-mode: vertical-rl; transform: rotate(180deg); text-align: center; font-size: 8.5pt; color: #4a5568; }
  .eje-x { grid-column: 2 / 4; text-align: center; font-size: 8.5pt; color: #4a5568; }
  .flujo { display: flex; flex-direction: column; gap: 8pt; border: 0.8pt solid #d9d7cf; border-radius: 6pt; padding: 10pt; background: #fbfaf7; break-inside: avoid; }
  .fila { display: flex; gap: 8pt; align-items: center; justify-content: center; }
  .caja { border: 1pt solid #1c5cab; border-radius: 4pt; padding: 5pt 7pt; background: #fff; font-size: 8.6pt; text-align: center; }
  .caja b { color: #0d366b; }
  .flecha { color: #1c5cab; font-weight: 700; font-size: 13pt; }`,
  cuerpo: `
${caratula({ numero: 6, titulo: 'Plan de comunicación', subtitulo: 'Gestión de las comunicaciones del proyecto ENTS', codigo: 'ENTS-GP-06' })}
${historial('Nuevo plan de comunicación con interesados, matriz de comunicaciones, reuniones, escalamiento y plantilla de minuta.')}
${indice(['Objetivo', 'Interesados', 'Matriz de poder e interés', 'Matriz de comunicaciones', 'Reuniones', 'Canales y herramientas', 'Flujo de la comunicación', 'Escalamiento y gestión de cambios', 'Convenciones del equipo', 'Plantilla de minuta'])}

<h1 class="salto">1. Objetivo</h1>
<p>Asegurar que cada interesado reciba la información que necesita, en el momento oportuno y por el canal adecuado, para que el equipo trabaje coordinado, la cátedra conozca el avance y, en la operación de la plataforma, vecinos, funcionarios y organismos estén informados del estado de cada petición.</p>

<h1>2. Interesados</h1>
${tabla(['Interesado', 'Necesidad de información', 'Poder', 'Interés', 'Estrategia'], [
  ['Docente (Ing. Loza)', 'Avance, cambios de alcance, entregables', '<span class="nivel alta">Alto</span>', '<span class="nivel alta">Alto</span>', 'Gestionar de cerca'],
  ['Equipo de proyecto', 'Tareas, bloqueos, decisiones técnicas', '<span class="nivel alta">Alto</span>', '<span class="nivel alta">Alto</span>', 'Gestionar de cerca'],
  ['Áreas del municipio / funcionarios', 'Peticiones de su área, prioridad, elevaciones', '<span class="nivel alta">Alto</span>', '<span class="nivel media">Medio</span>', 'Mantener satisfechos'],
  ['Vecinos', 'Estado de sus peticiones y de su barrio', '<span class="nivel baja">Bajo</span>', '<span class="nivel alta">Alto</span>', 'Mantener informados'],
  ['ONG y organizaciones sociales', 'Reportes por zona y urgencia', '<span class="nivel baja">Bajo</span>', '<span class="nivel media">Medio</span>', 'Mantener informados'],
  ['Instituto Cervantes', 'Resultados del proyecto', '<span class="nivel media">Medio</span>', '<span class="nivel baja">Bajo</span>', 'Monitorear'],
], ['24%', '', '9%', '9%', '17%'])}

<h1>3. Matriz de poder e interés</h1>
<div class="matriz">
  <div class="eje-y">Poder →</div>
  <div class="cuad" style="background:#fdefc8"><b>Mantener satisfechos</b>Áreas del municipio y funcionarios</div>
  <div class="cuad" style="background:#fbe0d4"><b>Gestionar de cerca</b>Docente · Equipo de proyecto</div>
  <div class="cuad" style="background:#eceae3"><b>Monitorear</b>Instituto Cervantes</div>
  <div class="cuad" style="background:#d8efe2"><b>Mantener informados</b>Vecinos · ONG y organizaciones sociales</div>
  <div class="eje-x">Interés →</div>
</div>

<h1>4. Matriz de comunicaciones</h1>
${tabla(['Qué se comunica', 'Emisor', 'Receptor', 'Canal', 'Frecuencia', 'Formato'], [
  ['Avance y bloqueos', 'Cada integrante', 'Equipo', 'Reunión breve + mensajería', C('[frecuencia]'), 'Oral / mensaje'],
  ['Planificación del sprint', 'Director', 'Equipo', 'Reunión + tablero de tareas', 'Inicio de sprint', 'Backlog priorizado'],
  ['Cambios de código', 'Integrante', 'Equipo', 'GitHub: rama + Pull Request', 'Por cambio', 'Descripción del PR'],
  ['Publicación de versiones', 'Director', 'Equipo', 'Netlify (automática) + aviso', 'Por versión', 'Mensaje con el resumen'],
  ['Revisión del sprint', 'Equipo', 'Docente', 'Clase / demostración', 'Fin de sprint', 'Demo del sitio'],
  ['Cambios de alcance', 'Director', 'Docente', 'Reunión + documento', 'Cuando ocurren', 'Pedido de cambio'],
  ['Entregables de gestión', 'Equipo', 'Docente', 'PDF', 'Según calendario', 'Documento'],
  ['Estado de las peticiones', 'Plataforma', 'Vecinos', 'Notificaciones en la app', 'Automática', 'Aviso'],
  ['Respuestas oficiales', 'Funcionarios', 'Vecinos', 'Seguimiento de la petición', 'Por actualización', 'Mensaje + foto'],
  ['Peticiones elevadas', 'Plataforma', 'Funcionarios', 'Notificación + bandeja', 'Al llegar a 50 firmas', 'Aviso'],
  ['Reportes de problemáticas', 'Administración', 'Organismos / ONG', 'Exportes Excel / PDF', C('[periodicidad]'), 'Reporte'],
], ['20%', '12%', '13%', '22%', '14%'])}

<h1>5. Reuniones</h1>
${tabla(['Reunión', 'Propósito', 'Participantes', 'Frecuencia', 'Duración'], [
  ['Seguimiento', 'Qué hice, qué voy a hacer, qué me bloquea', 'Equipo', C('[frecuencia]'), '15 min'],
  ['Planificación de sprint', 'Elegir y repartir tareas del backlog', 'Equipo', 'Inicio de sprint', '45 min'],
  ['Revisión de sprint', 'Mostrar lo terminado y recibir devoluciones', 'Equipo y docente', 'Fin de sprint', '30 min'],
  ['Retrospectiva', 'Qué mejorar en la forma de trabajo', 'Equipo', 'Fin de sprint', '20 min'],
], ['22%', '', '17%', '16%', '10%'])}

<h1>6. Canales y herramientas</h1>
${tabla(['Canal', 'Uso'], [
  [C('[grupo de mensajería]'), 'Coordinación diaria, avisos rápidos y bloqueos.'],
  ['GitHub', 'Código, Pull Requests, revisión entre integrantes e historial de cambios.'],
  [C('[tablero de tareas]'), 'Product backlog, tareas del sprint y estado de cada una.'],
  [C('[videollamada / presencial]'), 'Reuniones de planificación, seguimiento y retrospectiva.'],
  ['Plataforma ENTS', 'Comunicación con vecinos y funcionarios: notificaciones, seguimiento y comentarios.'],
  ['Correo electrónico', 'Comunicaciones formales con el docente y entrega de documentos.'],
], ['30%'])}

<h1>7. Flujo de la comunicación</h1>
<div class="flujo">
  <div class="fila">
    <div class="caja"><b>Vecinos</b><br>peticiones, firmas, comentarios</div><div class="flecha">⇄</div>
    <div class="caja"><b>Plataforma ENTS</b><br>notificaciones y seguimiento</div><div class="flecha">⇄</div>
    <div class="caja"><b>Funcionarios por área</b><br>respuestas oficiales</div><div class="flecha">→</div>
    <div class="caja"><b>Organismos / ONG</b><br>reportes</div>
  </div>
  <div class="fila">
    <div class="caja"><b>Integrantes</b><br>avance diario</div><div class="flecha">⇄</div>
    <div class="caja"><b>Director del proyecto</b><br>coordina y decide</div><div class="flecha">⇄</div>
    <div class="caja"><b>Docente</b><br>aprueba y orienta</div>
  </div>
</div>
<p class="pie">Figura 1. Flujo de la comunicación del proyecto (abajo) y de la plataforma en operación (arriba).</p>

<h1>8. Escalamiento y gestión de cambios</h1>
<ol>
  <li><b>Nivel 1 — Integrante:</b> resuelve el problema dentro de su tarea; si no puede en 1 día, lo avisa en el grupo.</li>
  <li><b>Nivel 2 — Equipo / director:</b> se trata en la reunión de seguimiento; el director redistribuye tareas o ajusta prioridades.</li>
  <li><b>Nivel 3 — Docente:</b> los cambios de alcance, de fechas de entrega o los riesgos críticos se presentan al docente con su impacto.</li>
</ol>

<h1>9. Convenciones del equipo</h1>
<ul>
  <li><b>Ramas:</b> la rama principal (<code>main</code>) es la versión publicada; cada cambio se hace en una rama propia y se integra con Pull Request.</li>
  <li><b>Mensajes de commit:</b> en español, en presente y describiendo el cambio (por ejemplo, "Score de urgencia calculado automáticamente").</li>
  <li><b>Antes de integrar:</b> revisión de código, pruebas automáticas y compilación sin errores.</li>
  <li><b>Documentos:</b> cada modificación se registra en el historial de revisión con autor, fecha y hora.</li>
</ul>

<h1>10. Plantilla de minuta de reunión</h1>
<table class="ficha"><tbody>
  <tr><td>Fecha y hora</td><td>&nbsp;</td></tr>
  <tr><td>Tipo de reunión</td><td>Seguimiento / Planificación / Revisión / Retrospectiva</td></tr>
  <tr><td>Participantes</td><td>&nbsp;</td></tr>
  <tr><td>Temas tratados</td><td>&nbsp;<br>&nbsp;</td></tr>
  <tr><td>Decisiones</td><td>&nbsp;<br>&nbsp;</td></tr>
  <tr><td>Tareas (qué · quién · para cuándo)</td><td>&nbsp;<br>&nbsp;</td></tr>
  <tr><td>Próxima reunión</td><td>&nbsp;</td></tr>
</tbody></table>
`,
})

// ---------------- 7. Gantt ----------------
const ancho = (dias) => ((dias / (SEMANAS * 5)) * 100).toFixed(3)
const hitos = [
  { nombre: 'Charter y alcance aprobados', dia: porId.get('A2').fin },
  { nombre: 'Diseño completo', dia: Math.max(porId.get('A7').fin, porId.get('A8').fin) },
  { nombre: 'Primera versión funcional', dia: porId.get('A11').fin },
  { nombre: 'Producto completo y probado', dia: Math.max(porId.get('A16').fin, porId.get('A17').fin) },
  { nombre: 'Entrega y defensa', dia: DURACION_TOTAL },
]
const COLOR = (a) => (a.critica ? '#eb6834' : '#3987e5')

const filasGantt = ACTIVIDADES.map((a) => `
  <div class="g-fila">
    <div class="g-nombre">${a.critica ? '<b>' + a.id + '</b>' : a.id} ${a.nombre}</div>
    <div class="g-pista">
      ${Array.from({ length: SEMANAS }, (_, i) => `<i class="g-linea" style="left:${ancho(i * 5)}%"></i>`).join('')}
      <span class="g-barra" style="left:${ancho(a.inicio)}%;width:${ancho(a.dur)}%;background:${COLOR(a)}"></span>
      ${a.holgura > 0 ? `<span class="g-holgura" style="left:${ancho(a.fin)}%;width:${ancho(a.holgura)}%"></span>` : ''}
    </div>
  </div>`).join('')

const filasHitos = hitos.map((h) => `
  <div class="g-fila">
    <div class="g-nombre">◆ ${h.nombre}</div>
    <div class="g-pista">
      ${Array.from({ length: SEMANAS }, (_, i) => `<i class="g-linea" style="left:${ancho(i * 5)}%"></i>`).join('')}
      <span class="g-hito" style="left:${ancho(h.dia)}%"></span>
    </div>
  </div>`).join('')

const graficoGantt = `
<div class="gantt">
  <div class="g-fila g-cabecera">
    <div class="g-nombre">Actividad</div>
    <div class="g-pista">${Array.from({ length: SEMANAS }, (_, i) => `<span class="g-semana" style="left:${ancho(i * 5)}%;width:${ancho(5)}%">S${i + 1}</span>`).join('')}</div>
  </div>
  ${filasGantt}
  <div class="g-separador">Hitos</div>
  ${filasHitos}
</div>
<div class="g-leyenda">
  <span><i style="background:#eb6834"></i>Actividad crítica (sin holgura)</span>
  <span><i style="background:#3987e5"></i>Actividad con holgura</span>
  <span><i class="rayas"></i>Holgura disponible</span>
  <span><i class="rombo"></i>Hito</span>
</div>`

const estiloGantt = `
  .gantt { border: 0.8pt solid #d9d7cf; border-radius: 5pt; padding: 6pt 8pt; break-inside: avoid; }
  .g-fila { display: grid; grid-template-columns: 62mm 1fr; align-items: center; min-height: 15pt; border-bottom: 0.5pt solid #eceae3; }
  .g-nombre { font-size: 7.6pt; padding-right: 6pt; line-height: 1.2; }
  .g-pista { position: relative; height: 15pt; }
  .g-linea { position: absolute; top: 0; bottom: 0; border-left: 0.5pt solid #e1e0d9; }
  .g-barra { position: absolute; top: 3.5pt; height: 8pt; border-radius: 2pt; }
  .g-holgura { position: absolute; top: 6pt; height: 3pt; background: repeating-linear-gradient(90deg, #9ec5f4 0 3pt, transparent 3pt 5pt); }
  .g-hito { position: absolute; top: 3pt; width: 9pt; height: 9pt; background: #0d366b; transform: translateX(-4.5pt) rotate(45deg); }
  .g-cabecera { background: #0d366b; color: #fff; font-weight: 600; border-radius: 3pt; }
  .g-cabecera .g-nombre { padding-left: 4pt; font-size: 8pt; }
  .g-semana { position: absolute; top: 3pt; text-align: center; font-size: 7.6pt; }
  .g-separador { font-size: 8pt; font-weight: 700; color: #0d366b; padding: 5pt 0 2pt; }
  .g-leyenda { display: flex; flex-wrap: wrap; gap: 4pt 14pt; font-size: 8pt; color: #4a5568; margin: 6pt 0 10pt; }
  .g-leyenda span { display: inline-flex; align-items: center; gap: 4pt; }
  .g-leyenda i { width: 14pt; height: 7pt; border-radius: 2pt; display: inline-block; }
  .g-leyenda i.rayas { height: 3pt; background: repeating-linear-gradient(90deg, #9ec5f4 0 3pt, transparent 3pt 5pt); }
  .g-leyenda i.rombo { width: 7pt; height: 7pt; background: #0d366b; transform: rotate(45deg); border-radius: 0; }`

const gantt = documento({
  archivo: '07_diagrama_de_gantt',
  titulo: 'Diagrama de Gantt',
  encabezado: 'ENTS · Diagrama de Gantt',
  estiloExtra: estiloGantt,
  cuerpo: `
${caratula({ numero: 7, titulo: 'Diagrama de Gantt', subtitulo: 'Cronograma del proyecto ENTS con ruta crítica e hitos', codigo: 'ENTS-GP-07' })}
${historial('Nuevo cronograma de ' + DURACION_TOTAL + ' días hábiles (' + SEMANAS + ' semanas) calculado a partir de la lista de actividades, con ruta crítica e hitos.')}
${indice(['Diagrama de Gantt', 'Hitos', 'Ruta crítica', 'Conversión a fechas'])}

<h1 class="salto">1. Diagrama de Gantt</h1>
<p>Cada barra representa una actividad de la lista (Entregable 4), ubicada según sus dependencias. Escala: semanas de 5 días hábiles desde el inicio del proyecto.</p>
${graficoGantt}

<h1>2. Hitos</h1>
${tabla(['Hito', 'Día hábil', 'Semana', 'Fecha'], hitos.map((h) => [h.nombre, h.dia, 'S' + Math.max(1, Math.ceil(h.dia / 5)), C('[__/__/____]')]), ['', '14%', '14%', '20%'])}

<h1>3. Ruta crítica</h1>
<p style="font-weight:600;color:#0d366b">${RUTA.join(' → ')}</p>
<p>Duración total: <b>${DURACION_TOTAL} días hábiles</b> (≈ ${SEMANAS} semanas). Un atraso en cualquiera de estas actividades atrasa la entrega. Las demás tienen holgura: ${ACTIVIDADES.filter((a) => !a.critica).map((a) => `${a.id} (${a.holgura} días)`).join(', ')}.</p>

<h1>4. Conversión a fechas</h1>
<p>Al fijar la fecha de inicio del proyecto (${C('[__/__/____]')}), cada día hábil se convierte sumando días laborables (sin fines de semana ni feriados). Las versiones del sistema registradas en el repositorio son: primera versión funcional el 04/10/2026; roles, anonimato e ingreso con Google el 11/10/2026; procesamiento automático, seguimiento, reportes y calidad el 12/10/2026.</p>
`,
})

// ---------------- Escritura ----------------
const DOCS = [alcance, edt, lista, diccionario, comunicacion, gantt]
for (const d of DOCS) {
  fs.writeFileSync(path.join(AQUI, d.archivo + '.html'), d.html)
  console.log('escrito', d.archivo + '.html')
}

// Combinado: Project Charter (escrito a mano) + los 6 generados
const charter = fs.readFileSync(path.join(AQUI, '01_project_charter.html'), 'utf8')
const cuerpoCharter = charter.slice(charter.indexOf('<body>') + 6, charter.indexOf('</body>'))
const estilosCombinados = [estiloEdt, estiloGantt, comunicacion.estiloExtra, diccionario.estiloExtra].join('\n')
const combinado = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>ENTS — Entregables de gestión (completo)</title>
<link rel="stylesheet" href="estilos.css">
<style>
  @page { @top-right { content: "ENTS · Entregables de gestión del proyecto"; font: 8pt 'Segoe UI', Arial, sans-serif; color: #9a988f; } }
  .caratula { break-before: page; }
  .caratula:first-of-type { break-before: auto; }
${estilosCombinados}
</style>
</head>
<body>
${cuerpoCharter}
${DOCS.map((d) => d.cuerpo).join('\n')}
</body>
</html>
`
fs.writeFileSync(path.join(AQUI, '00_entregables_completos.html'), combinado)
console.log('escrito 00_entregables_completos.html')
console.log('Duración total:', DURACION_TOTAL, 'días · ruta crítica:', RUTA.join(' → '))

// Gantt para la documentación general (misma información)
fs.writeFileSync(path.join(AQUI, '_gantt_fragmento.json'), JSON.stringify({ graficoGantt, estiloGantt, DURACION_TOTAL, SEMANAS, RUTA }))
