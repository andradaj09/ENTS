// Datos comunes de los entregables de gestión de ENTS.
// Todo lo que se repite entre documentos (equipo, actividades, requisitos,
// historias de usuario y glosario) vive acá, así los 7 entregables y la
// documentación general cuentan exactamente lo mismo.

// ---------------- Equipo ----------------
const EQUIPO = {
  JP: {
    nombre: 'Andrada, Juan Pablo',
    legajo: '27318',
    rol: 'Director del proyecto · Análisis, diseño y desarrollo',
    responsabilidades: 'Dirige el proyecto y prioriza el product backlog; releva requerimientos; diseña la arquitectura, el modelo de datos, la seguridad y la interfaz; desarrolla la mayor parte de las funcionalidades; redacta la documentación técnica y aprueba cada publicación.',
  },
  MP: {
    nombre: 'Patrón, Máximo',
    legajo: '27311',
    rol: 'Configuración inicial · Desarrollo y calidad',
    responsabilidades: 'Configura el repositorio, el proyecto en Supabase y la publicación en Netlify; desarrolla la autenticación y el primer módulo de peticiones, firmas y moderación; ejecuta las pruebas automáticas y de permisos antes de cada publicación.',
  },
  IJ: {
    nombre: 'Jiménez, Ignacio',
    legajo: '28177',
    rol: 'Relevamiento y comunicación con interesados',
    responsabilidades: 'Coordina la encuesta y el estudio de necesidades de los vecinos; mantiene el contacto con los interesados y la cátedra; registra las minutas de las reuniones; colabora en la redacción de documentos y prepara la presentación.',
  },
}
const DIRECTOR = EQUIPO.JP.nombre

// Dedicación estimada: horas por día hábil de trabajo en una actividad
const HORAS_RESPONSABLE = 3
const HORAS_PARTICIPANTE = 1.5

// ---------------- Actividades ----------------
// dur = días hábiles · pred = predecesoras (fin → comienzo)
// resp = responsable · part = participantes
const ACTIVIDADES = [
  { id: 'A1', nombre: 'Analizar la propuesta de reorientación y redefinir el proyecto', edt: ['1.1.1'], dur: 3, pred: [], resp: 'JP', part: ['MP', 'IJ'],
    desc: 'Revisar la propuesta original de donaciones, identificar qué partes se conservan y cuáles se reemplazan, y acordar con el docente el nuevo enfoque de peticiones vecinales.',
    entregable: 'Propuesta de reorientación aprobada', criterio: 'El equipo y el docente acuerdan por escrito el nuevo enfoque.', recursos: 'Equipo completo; documentación de la versión 1.0' },
  { id: 'A2', nombre: 'Redactar Project Charter y declaración de alcance', edt: ['1.1.1', '1.1.2'], dur: 3, pred: ['A1'], resp: 'JP', part: ['IJ'],
    desc: 'Escribir el acta de constitución (propósito, objetivos, riesgos, recursos) y la declaración de alcance (requisitos, entregables, exclusiones).',
    entregable: 'Entregables 1 y 2', criterio: 'Documentos completos y aprobados por el docente.', recursos: 'Plantillas de gestión; Guía del PMBOK' },
  { id: 'A3', nombre: 'Definir plan de comunicación y cronograma', edt: ['1.1.3', '1.1.4'], dur: 2, pred: ['A2'], resp: 'IJ', part: ['JP'],
    desc: 'Identificar interesados, definir canales, frecuencias y reuniones, y armar el cronograma inicial con sus dependencias.',
    entregable: 'Entregables 6 y 7 (versión inicial)', criterio: 'Canales, frecuencias, responsables y fechas relativas definidos.', recursos: 'Trello; planilla de cálculo' },
  { id: 'A4', nombre: 'Revisar encuesta y análisis socioeconómico', edt: ['1.2.1', '1.2.2'], dur: 3, pred: ['A1'], resp: 'IJ', part: [],
    desc: 'Releer los resultados de la encuesta a vecinos y el análisis socioeconómico de Córdoba de la versión 1.0, y vincular cada necesidad detectada con una categoría de petición.',
    entregable: 'Informe de necesidades actualizado', criterio: 'Cada necesidad queda asociada a al menos una categoría del sistema.', recursos: 'Resultados de la encuesta; análisis previo' },
  { id: 'A5', nombre: 'Relevar requerimientos y armar product backlog', edt: ['1.2.3', '1.2.4'], dur: 4, pred: ['A2', 'A4'], resp: 'JP', part: ['IJ'],
    desc: 'Redactar los requisitos funcionales y no funcionales y las historias de usuario con sus criterios de aceptación, y ordenarlas por prioridad.',
    entregable: 'Lista de RF y RNF; product backlog priorizado', criterio: 'Cada requisito funcional es trazable a al menos una historia de usuario.', recursos: 'Trello' },
  { id: 'A6', nombre: 'Diseñar arquitectura y elegir tecnologías', edt: ['1.3.1'], dur: 3, pred: ['A5', 'A3'], resp: 'JP', part: ['MP'],
    desc: 'Definir las capas del sistema, los servicios en la nube y las herramientas, priorizando opciones gratuitas y conocidas por el equipo.',
    entregable: 'Documento de arquitectura y diagrama de despliegue', criterio: 'La arquitectura cubre todos los RF y RNF usando solo servicios gratuitos.', recursos: 'Documentación oficial de las tecnologías' },
  { id: 'A7', nombre: 'Diseñar modelo de datos y reglas de seguridad', edt: ['1.3.2', '1.3.4'], dur: 4, pred: ['A6'], resp: 'JP', part: [],
    desc: 'Diseñar las tablas, relaciones y restricciones de la base, y las reglas que definen qué puede ver y hacer cada rol.',
    entregable: 'DER, esquema SQL y políticas de acceso', criterio: 'El esquema se puede recrear completo y las reglas por rol están definidas.', recursos: 'Supabase; PostgreSQL' },
  { id: 'A8', nombre: 'Diseñar interfaz y navegación', edt: ['1.3.3'], dur: 4, pred: ['A5'], resp: 'JP', part: ['IJ'],
    desc: 'Diseñar las pantallas principales, el estilo visual y el recorrido de cada tipo de usuario, recogiendo la opinión de vecinos de prueba.',
    entregable: 'Prototipo de pantallas y mapa del sitio', criterio: 'Los flujos principales de cada rol están aprobados por el equipo.', recursos: 'Figma; equipo' },
  { id: 'A9', nombre: 'Configurar repositorio, base de datos y publicación', edt: ['1.6.1', '1.6.2'], dur: 2, pred: ['A6'], resp: 'MP', part: [],
    desc: 'Crear el repositorio en GitHub, el proyecto en Supabase y el sitio en Netlify, conectados para que cada versión se publique sola.',
    entregable: 'Repositorio, base en la nube y sitio publicado', criterio: 'Un cambio en la rama principal se publica automáticamente.', recursos: 'GitHub; Supabase; Netlify' },
  { id: 'A10', nombre: 'Desarrollar autenticación, roles y anonimato', edt: ['1.4.1'], dur: 5, pred: ['A7', 'A9'], resp: 'MP', part: ['JP'],
    desc: 'Programar el registro, el ingreso con correo o Google, la recuperación de contraseña, los roles y el anonimato entre vecinos.',
    entregable: 'Módulo de cuentas y roles', criterio: 'Registro, ingreso, recuperación y roles funcionan en el sitio publicado.', recursos: 'React; Supabase Auth' },
  { id: 'A11', nombre: 'Desarrollar peticiones, fotos, firmas y moderación', edt: ['1.4.2', '1.4.7'], dur: 6, pred: ['A10', 'A8'], resp: 'MP', part: ['JP'],
    desc: 'Programar el alta de peticiones con fotos y ubicación, la firma única por persona y la moderación previa a la publicación.',
    entregable: 'Módulo de peticiones y moderación', criterio: 'Alta con fotos y ubicación; una firma por persona; nada se publica sin aprobación.', recursos: 'React; Supabase Storage' },
  { id: 'A12', nombre: 'Desarrollar clasificación, barrio, score y similares', edt: ['1.4.3'], dur: 5, pred: ['A11'], resp: 'JP', part: [],
    desc: 'Programar la sugerencia de categoría, la detección del barrio, el score de urgencia y la búsqueda de peticiones similares.',
    entregable: 'Procesamiento automático', criterio: 'Los casos de prueba de cada algoritmo dan el resultado esperado.', recursos: 'PostgreSQL (pg_trgm); OpenStreetMap' },
  { id: 'A13', nombre: 'Desarrollar mapa por barrios, comunidad y eventos', edt: ['1.4.4'], dur: 5, pred: ['A11'], resp: 'JP', part: [],
    desc: 'Programar el mapa con los 111 barrios, el muro vecinal y la agenda de eventos, con filtro por barrio, y que cada vecino vea primero lo de su propio barrio.',
    entregable: 'Mapa, muro vecinal, agenda y barrio del vecino', criterio: 'El filtro por barrio funciona en las tres pantallas y cada una arranca por el barrio del vecino.', recursos: 'Leaflet; OpenStreetMap' },
  { id: 'A14', nombre: 'Desarrollar seguimiento, notificaciones y comentarios', edt: ['1.4.5'], dur: 5, pred: ['A11'], resp: 'JP', part: [],
    desc: 'Programar las cinco etapas de seguimiento con respuesta oficial, los avisos dentro de la app y los comentarios anónimos con denuncias.',
    entregable: 'Seguimiento, avisos y comentarios', criterio: 'Cada cambio de etapa genera un aviso al autor y a los firmantes.', recursos: 'Supabase (disparadores y funciones)' },
  { id: 'A15', nombre: 'Desarrollar estadísticas, panel analítico y exportes', edt: ['1.4.6'], dur: 4, pred: ['A12', 'A13'], resp: 'JP', part: [],
    desc: 'Programar las estadísticas públicas, el panel analítico, la bandeja por área y la exportación de reportes a Excel y PDF.',
    entregable: 'Paneles y reportes', criterio: 'Los números de los paneles coinciden con los datos de la base.', recursos: 'React; funciones de estadísticas' },
  { id: 'A16', nombre: 'Pruebas automáticas y pruebas de permisos por rol', edt: ['1.5.1', '1.5.2'], dur: 4, pred: ['A12', 'A14', 'A15'], resp: 'MP', part: ['JP'],
    desc: 'Escribir y ejecutar las pruebas automáticas del código y simular cada rol en la base para verificar que nadie accede a lo que no le corresponde.',
    entregable: 'Suite de pruebas y reporte de permisos', criterio: 'El 100% de las pruebas se aprueba.', recursos: 'Vitest; consultas por rol' },
  { id: 'A17', nombre: 'Accesibilidad, modo oscuro, app instalable y rendimiento', edt: ['1.5.3', '1.6.3'], dur: 4, pred: ['A15'], resp: 'JP', part: ['MP'],
    desc: 'Agregar navegación con teclado y modo oscuro, convertir el sitio en app instalable y optimizar su fluidez en celulares.',
    entregable: 'App instalable, accesible y fluida', criterio: 'Se navega con teclado, se instala en el celular y no hay animaciones pesadas en celular.', recursos: 'Service worker; manifiesto web' },
  { id: 'A18', nombre: 'Redactar documentación', edt: ['1.7.1'], dur: 5, pred: ['A16', 'A17'], resp: 'JP', part: ['IJ'],
    desc: 'Redactar la documentación del trabajo práctico y actualizar los siete entregables de gestión al sistema implementado.',
    entregable: 'Documentación general y entregables de gestión', criterio: 'Cumple la estructura pedida por la cátedra y no deja términos sin explicar.', recursos: 'Equipo' },
  { id: 'A19', nombre: 'Preparar presentación', edt: ['1.7.2'], dur: 2, pred: ['A18'], resp: 'IJ', part: ['JP', 'MP'],
    desc: 'Armar la presentación para la defensa, repartir las partes de la exposición y ensayarla.',
    entregable: 'Presentación y guion de la defensa', criterio: 'Ensayada completa dentro del tiempo asignado.', recursos: 'Equipo' },
  { id: 'A20', nombre: 'Entrega y defensa', edt: ['1.7.3'], dur: 1, pred: ['A19'], resp: 'JP', part: ['MP', 'IJ'],
    desc: 'Entregar la documentación y defender el proyecto ante la cátedra con una demostración del sitio publicado.',
    entregable: 'Proyecto entregado y defendido', criterio: 'Aprobación del docente.', recursos: 'Equipo completo; sitio publicado' },
]

// Método de la ruta crítica: pasada hacia adelante y hacia atrás
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

// Horas estimadas por integrante a partir de las asignaciones
const HORAS = Object.fromEntries(Object.keys(EQUIPO).map((k) => [k, 0]))
for (const a of ACTIVIDADES) {
  HORAS[a.resp] += a.dur * HORAS_RESPONSABLE
  for (const p of a.part) HORAS[p] += a.dur * HORAS_PARTICIPANTE
}
const HORAS_TOTALES = Object.values(HORAS).reduce((t, h) => t + h, 0)

// Sprints de 2 semanas (10 días hábiles)
const SPRINTS = Array.from({ length: Math.ceil(DURACION_TOTAL / 10) }, (_, i) => ({
  numero: i + 1,
  desde: i * 10,
  hasta: Math.min((i + 1) * 10, DURACION_TOTAL),
}))
const sprintDeDia = (dia) => Math.min(SPRINTS.length, Math.floor(dia / 10) + 1)

// ---------------- EDT ----------------
const EDT = [
  { c: '1.1', n: 'Gestión del proyecto', d: 'Planificación, coordinación y control del proyecto.', h: [
    ['1.1.1', 'Project Charter', 'Acta que autoriza el proyecto y fija propósito, objetivos, riesgos y recursos.'],
    ['1.1.2', 'Declaración de alcance', 'Detalle de qué incluye y qué no incluye el proyecto.'],
    ['1.1.3', 'Plan de comunicación', 'Quién informa qué, a quién, cuándo y por qué canal.'],
    ['1.1.4', 'Cronograma (Gantt)', 'Actividades ubicadas en el tiempo con dependencias y ruta crítica.'],
    ['1.1.5', 'Seguimiento y control', 'Reuniones, minutas y control de cambios durante todo el proyecto.']] },
  { c: '1.2', n: 'Análisis', d: 'Comprensión del problema y de lo que el sistema debe hacer.', h: [
    ['1.2.1', 'Estudio de necesidades y encuesta', 'Encuesta a vecinos sobre los problemas de su barrio.'],
    ['1.2.2', 'Análisis socioeconómico', 'Contexto de Córdoba que justifica las categorías y el enfoque barrial.'],
    ['1.2.3', 'Requerimientos', 'Requisitos funcionales (RF) y no funcionales (RNF).'],
    ['1.2.4', 'Product backlog', 'Historias de usuario priorizadas con criterios de aceptación.']] },
  { c: '1.3', n: 'Diseño', d: 'Definición técnica y visual de la solución.', h: [
    ['1.3.1', 'Arquitectura', 'Capas, tecnologías y diagrama de despliegue.'],
    ['1.3.2', 'Modelo de datos', 'Tablas, relaciones y restricciones (DER y esquema SQL).'],
    ['1.3.3', 'Interfaz y navegación', 'Pantallas, estilo visual y mapa del sitio.'],
    ['1.3.4', 'Seguridad y roles', 'Reglas de acceso por rol, anonimato y permisos por panel.']] },
  { c: '1.4', n: 'Desarrollo', d: 'Construcción de las funcionalidades.', h: [
    ['1.4.1', 'Autenticación y roles', 'Registro, ingreso, recuperación de contraseña y roles.'],
    ['1.4.2', 'Peticiones y firmas', 'Alta con fotos y ubicación, firma única y prioridad.'],
    ['1.4.3', 'Procesamiento automático', 'Categoría, barrio, score de urgencia y similares.'],
    ['1.4.4', 'Mapa y comunidad', 'Mapa por barrios, muro vecinal, agenda de eventos y barrio del vecino.'],
    ['1.4.5', 'Seguimiento y avisos', 'Etapas, respuesta oficial, notificaciones y comentarios.'],
    ['1.4.6', 'Reportes', 'Estadísticas, panel analítico, bandeja por área y exportes.'],
    ['1.4.7', 'Moderación', 'Revisión de peticiones y comentarios antes y después de publicarse.']] },
  { c: '1.5', n: 'Pruebas y calidad', d: 'Verificación de que el producto funciona y es seguro.', h: [
    ['1.5.1', 'Pruebas automáticas', 'Pruebas del código que se ejecutan antes de cada publicación.'],
    ['1.5.2', 'Pruebas de permisos', 'Simulación de cada rol para verificar las reglas de acceso.'],
    ['1.5.3', 'Accesibilidad y rendimiento', 'Uso con teclado, contraste, modo oscuro y fluidez en celular.']] },
  { c: '1.6', n: 'Implementación', d: 'Puesta en producción del sistema.', h: [
    ['1.6.1', 'Base de datos en la nube', 'Proyecto de Supabase con el esquema aplicado.'],
    ['1.6.2', 'Publicación web', 'Sitio en Netlify con HTTPS y publicación automática.'],
    ['1.6.3', 'App instalable', 'Manifiesto y service worker para instalar ENTS en el celular.']] },
  { c: '1.7', n: 'Documentación y cierre', d: 'Documentos, presentación y entrega final.', h: [
    ['1.7.1', 'Documentación', 'Documentación general y entregables de gestión.'],
    ['1.7.2', 'Presentación', 'Diapositivas y guion para la defensa.'],
    ['1.7.3', 'Entrega y defensa', 'Entrega formal y exposición ante la cátedra.']] },
]
const CANTIDAD_PAQUETES = EDT.reduce((t, r) => t + r.h.length, 0)

// ---------------- Requisitos e historias de usuario ----------------
const RF = [
  ['RF01', 'Registrar usuarios con correo y contraseña o con Google, y recuperar la contraseña por correo.', 'Alta'],
  ['RF02', 'Elegir el tipo de cuenta al registrarse: vecino o funcionario (esta última queda sujeta a aprobación).', 'Alta'],
  ['RF03', 'Crear peticiones con título, descripción, hasta 3 fotos y ubicación en el mapa.', 'Alta'],
  ['RF04', 'Sugerir automáticamente la categoría según el texto y el barrio según la ubicación.', 'Alta'],
  ['RF05', 'Calcular automáticamente el score de urgencia (0 a 100) de cada petición.', 'Alta'],
  ['RF06', 'Advertir peticiones similares antes de crear una nueva.', 'Alta'],
  ['RF07', 'Moderar las peticiones antes de publicarlas: aprobar, rechazar, editar o eliminar.', 'Alta'],
  ['RF08', 'Firmar una petición publicada y retirar la firma; ordenar el inicio por prioridad según las firmas.', 'Alta'],
  ['RF09', 'Elevar automáticamente al área correspondiente las peticiones que alcanzan 50 firmas.', 'Media'],
  ['RF10', 'Registrar respuestas oficiales y la etapa de seguimiento, con foto opcional.', 'Alta'],
  ['RF11', 'Notificar al autor y a los firmantes cada novedad, y permitir seguir barrios.', 'Media'],
  ['RF12', 'Comentar en forma anónima, denunciar comentarios y moderarlos.', 'Media'],
  ['RF13', 'Mostrar el mapa por barrios coloreado por cantidad de peticiones, firmas o urgencia.', 'Media'],
  ['RF14', 'Ofrecer estadísticas públicas anónimas y un panel analítico para administradores.', 'Media'],
  ['RF15', 'Exportar reportes de peticiones y barrios a Excel y PDF.', 'Media'],
  ['RF16', 'Asignar un área a cada funcionario y mostrarle una bandeja con las peticiones de esa área.', 'Media'],
  ['RF17', 'Permitir solo al dueño del proyecto cambiar el rol de las cuentas.', 'Baja'],
  ['RF18', 'Publicar en el muro vecinal y consultar la agenda de eventos por barrio.', 'Baja'],
  ['RF19', 'Permitir solo al dueño definir qué paneles ve y modifica cada rol (permisos por panel).', 'Baja'],
  ['RF20', 'Permitir a los moderadores revisar peticiones pendientes, comentarios denunciados y publicaciones.', 'Media'],
  ['RF21', 'Elegir el barrio donde vive cada vecino (a mano o con su ubicación), cambiarlo como máximo una vez cada 30 días y mostrar primero lo de ese barrio en el inicio, el mapa, la comunidad, los eventos y los avisos.', 'Media'],
  ['RF22', 'Resumir la actividad del barrio del vecino comparada con el promedio de la ciudad y mostrar un ranking de los barrios más activos y de los que más resolvieron.', 'Baja'],
]
const RNF = [
  ['RNF01', 'Privacidad', 'Anonimato entre vecinos: la identidad del autor y de los firmantes solo la ven los funcionarios del área y los administradores. El barrio donde vive cada vecino no se muestra a nadie, salvo que la persona elija mostrar "Vecino/a de [barrio]" en sus comentarios.'],
  ['RNF02', 'Seguridad', 'Las reglas de acceso se aplican en la base de datos (RLS), no solo en la pantalla; toda la comunicación usa HTTPS.'],
  ['RNF03', 'Usabilidad', 'Interfaz en español, adaptable a celular, con modo claro y oscuro.'],
  ['RNF04', 'Accesibilidad', 'Navegación con teclado, foco visible, respeto del movimiento reducido y tablas alternativas a los gráficos (WCAG 2.2).'],
  ['RNF05', 'Rendimiento', 'Cada página se descarga recién al visitarla; en celulares se desactivan las animaciones continuas.'],
  ['RNF06', 'Disponibilidad', 'Aplicación instalable (PWA) que abre aun con conexión inestable.'],
  ['RNF07', 'Mantenibilidad', 'Revisión automática del código (lint), pruebas automáticas y esquema SQL versionado.'],
  ['RNF08', 'Legal', 'Política de privacidad publicada y cumplimiento de la Ley 25.326 de Protección de Datos Personales.'],
]
// Historias de usuario: id, rol, quiero, para, criterios, prioridad, RF relacionados
const HU = [
  ['HU01', 'vecino', 'registrarme e ingresar, también con Google', 'participar en la plataforma', 'Formulario con nombre, apellido, correo y contraseña; errores en español; recuperación de contraseña por correo.', 'Alta', ['RF01', 'RF02']],
  ['HU02', 'vecino', 'crear una petición con fotos y ubicación', 'visibilizar un problema de mi barrio', 'Categoría y barrio sugeridos automáticamente; hasta 3 fotos; queda pendiente hasta que se modere.', 'Alta', ['RF03', 'RF04', 'RF05']],
  ['HU03', 'vecino', 'ver si ya existe un pedido parecido', 'firmarlo en lugar de repetirlo', 'Mientras escribo se muestran hasta 3 peticiones similares, con barrio, firmas y distancia.', 'Alta', ['RF06']],
  ['HU04', 'vecino', 'firmar una petición', 'darle más prioridad', 'Una firma por persona; puedo retirarla; el orden y el color de prioridad se actualizan.', 'Alta', ['RF08', 'RF09']],
  ['HU05', 'moderador', 'revisar las peticiones antes de publicarlas', 'evitar contenido indebido o con datos personales', 'Aprobar, rechazar, editar o eliminar; las alertas automáticas se muestran primero.', 'Alta', ['RF07', 'RF20']],
  ['HU06', 'funcionario', 'ver las peticiones de mi área ordenadas por prioridad y responderlas', 'atender primero lo más urgente', 'Bandeja filtrada por área; respuesta con etapa, mensaje y foto.', 'Alta', ['RF10', 'RF16']],
  ['HU07', 'vecino', 'seguir el avance de una petición hasta que se resuelva', 'saber que mi reclamo fue atendido', 'Línea de tiempo con 5 etapas y respuestas oficiales; aviso en cada cambio.', 'Alta', ['RF10', 'RF11']],
  ['HU08', 'vecino', 'ver en un mapa los problemas de cada barrio', 'conocer qué pasa en mi zona', 'Mapa con 111 barrios coloreados; filtro por barrio y opción de seguirlo.', 'Media', ['RF11', 'RF13']],
  ['HU09', 'organismo', 'obtener reportes de qué se pide, dónde y con qué urgencia', 'decidir qué atender y rendir cuentas', 'Estadísticas por categoría, barrio y semana; exportes a Excel y PDF.', 'Media', ['RF14', 'RF15']],
  ['HU10', 'vecino', 'comentar en forma anónima', 'aportar datos sobre un problema', 'Se bloquean teléfonos, correos y documentos; un comentario con 3 denuncias se oculta.', 'Media', ['RF12']],
  ['HU11', 'vecino', 'participar del muro vecinal y de la agenda de eventos', 'organizarme con mis vecinos', 'Publicaciones y eventos filtrados por barrio.', 'Baja', ['RF18']],
  ['HU12', 'dueño', 'asignar el rol de cada cuenta', 'controlar quién modera, responde o administra', 'Solo el dueño ve y usa el selector de rol; la base lo vuelve a verificar.', 'Baja', ['RF17']],
  ['HU13', 'dueño', 'definir qué paneles ve y modifica cada rol', 'adaptar los accesos sin cambiar el código', 'Pantalla "Permisos" con cada rol y sus paneles; interruptores de ver y modificar que se guardan al instante.', 'Baja', ['RF19']],
  ['HU14', 'vecino', 'elegir el barrio donde vivo', 'ver primero lo que pasa cerca de mí', 'Se pregunta en el primer ingreso (se puede dejar para después); el inicio agrupa las peticiones en mi barrio, cerca y resto de la ciudad; el mapa, la comunidad, los eventos y los avisos arrancan por mi barrio; se cambia una vez cada 30 días.', 'Media', ['RF21', 'RF22']],
]

// ---------------- Glosario ----------------
// [término, definición, expresión que lo detecta en el texto]
const GLOSARIO = [
  ['ENTS', 'Everyone Needs To Smile ("Todos necesitan sonreír"): nombre del proyecto y de la plataforma.', /\bENTS\b/],
  ['Petición', 'Pedido que un vecino publica sobre un problema de su barrio (por ejemplo, un bache o falta de alumbrado).', /petici[oó]n/i],
  ['Firma', 'Apoyo de un vecino a una petición publicada. Cada persona puede firmar una sola vez y retirar su firma.', /\bfirma/i],
  ['Prioridad por firmas', 'Nivel de una petición según su cantidad de firmas: nueva (0–4), baja (5–9), media (10–19), alta (20–49) y máxima (50 o más).', /prioridad/i],
  ['Elevación', 'Aviso automático a los funcionarios del área cuando una petición alcanza 50 firmas.', /elevaci[oó]n|elevar|eleva /i],
  ['Score de urgencia', 'Puntaje de 0 a 100 que calcula el sistema según la gravedad de la categoría, palabras de riesgo, firmas, velocidad de apoyo y fotos.', /score/i],
  ['Seguimiento', 'Etapas por las que pasa una petición publicada: recibida, en revisión, derivada, en obra y resuelta.', /seguimiento/i],
  ['Moderación', 'Revisión de las peticiones y comentarios para que no se publique contenido ofensivo ni datos personales.', /moderaci[oó]n|moderar/i],
  ['Barrio del vecino (mi barrio)', 'Barrio donde vive cada vecino, elegido por él mismo. Ordena lo que ve primero en la plataforma y solo se muestra a otros si la persona lo permite.', /mi barrio|barrio (del vecino|propio)/i],
  ['Geolocalización', 'Obtención de la ubicación del dispositivo (con permiso de la persona) para completar el barrio automáticamente.', /geolocalizaci[oó]n|con (su|la) ubicaci[oó]n/i],
  ['Datos de demostración', 'Cuentas, peticiones y fotos ficticias cargadas para mostrar la plataforma con actividad; se identifican con el dominio demo.ents.invalid y se borran con un solo script.', /datos de demostraci[oó]n|sint[eé]tic/i],
  ['Barrio (zona)', 'Cada uno de los 111 barrios de Córdoba y Villa Allende cargados en el sistema con su ubicación.', /barrio/i],
  ['Área', 'Dependencia del municipio responsable de un grupo de categorías (por ejemplo, Salud u Obras públicas).', /(?:^|[^\wáéíóú])[aá]reas?\b/i],
  ['Bandeja', 'Pantalla donde cada funcionario ve las peticiones de su área ordenadas por prioridad para responderlas.', /bandeja/i],
  ['Rol (rango)', 'Tipo de cuenta que define qué puede hacer cada usuario: vecino, funcionario, moderador, administrador o dueño.', /\broles?\b|rango/i],
  ['Vecino', 'Rol base: crea, firma y comenta peticiones. Para los demás vecinos es anónimo.', /vecino/i],
  ['Funcionario', 'Rol de un empleado del municipio: responde las peticiones de su área. Lo aprueba un administrador.', /funcionario/i],
  ['Moderador', 'Rol que revisa peticiones, comentarios y publicaciones; no administra usuarios.', /moderador/i],
  ['Administrador', 'Rol que modera, gestiona usuarios y áreas, y accede al panel analítico.', /administrador/i],
  ['Dueño (CEO)', 'Cuenta única del responsable del proyecto: además de administrar, cambia roles y define los permisos de cada rol.', /due[ñn]o/i],
  ['Permisos por panel', 'Configuración que define, para cada rol, qué paneles puede ver y en cuáles puede modificar. Solo la cambia el dueño.', /permisos? por panel|permisos/i],
  ['Panel analítico', 'Pantalla de administración con indicadores de uso, moderación y participación, exportable a Excel y PDF.', /panel anal[ií]tico/i],
  ['Anonimato', 'Regla por la que un vecino nunca ve quién creó o firmó una petición.', /an[oó]nim/i],
  ['RF', 'Requisito funcional: algo que el sistema debe hacer (por ejemplo, "crear peticiones con fotos"). Se numeran RF01, RF02…', /\bRF\d*\b/],
  ['RNF', 'Requisito no funcional: una cualidad que el sistema debe cumplir (seguridad, rendimiento, accesibilidad…). Se numeran RNF01, RNF02…', /\bRNF\d*\b/],
  ['HU', 'Historia de usuario: necesidad escrita desde el punto de vista del usuario con la forma "Como [rol], quiero [acción] para [beneficio]". Se numeran HU01, HU02…', /\bHU\d*\b|historias? de usuario/i],
  ['Criterio de aceptación', 'Condición verificable que debe cumplirse para dar por terminado un requisito, historia o actividad.', /criterios? de aceptaci[oó]n/i],
  ['Product backlog', 'Lista priorizada de todo lo que hay que construir en el producto, expresada en historias de usuario.', /backlog/i],
  ['Scrum', 'Marco de trabajo ágil que organiza el desarrollo en ciclos cortos (sprints) con reuniones de planificación, revisión y retrospectiva.', /scrum/i],
  ['Sprint', 'Ciclo de trabajo de duración fija (en este proyecto, 2 semanas) al final del cual se muestra un avance funcionando.', /sprint/i],
  ['Retrospectiva', 'Reunión al final de cada sprint para analizar qué mejorar en la forma de trabajar.', /retrospectiva/i],
  ['Project Charter', 'Acta de constitución: documento que autoriza formalmente el proyecto y fija su propósito, objetivos y recursos.', /charter/i],
  ['EDT / WBS', 'Estructura de desglose del trabajo (en inglés, Work Breakdown Structure): descomposición jerárquica del proyecto en entregables y paquetes de trabajo.', /\bEDT\b|\bWBS\b/],
  ['Paquete de trabajo', 'Último nivel de la EDT: un entregable concreto que se puede asignar, estimar y verificar.', /paquetes? de trabajo/i],
  ['Entregable', 'Resultado verificable que produce el proyecto (un documento, un módulo del sistema, una presentación).', /entregable/i],
  ['Actividad', 'Trabajo concreto que produce un entregable. Se identifica con un código A1, A2…', /actividad/i],
  ['Día hábil', 'Día de trabajo del equipo (lunes a viernes, sin feriados). Las duraciones del cronograma se expresan en días hábiles.', /d[ií]as? h[aá]bil/i],
  ['Predecesora / sucesora', 'Una actividad predecesora debe terminar antes de que empiece su sucesora.', /predecesora|sucesora/i],
  ['Dependencia fin-comienzo', 'Tipo de relación en la que una actividad empieza cuando terminan todas sus predecesoras.', /fin-comienzo|fin → comienzo/i],
  ['Ruta crítica', 'Secuencia de actividades sin holgura: si una se atrasa, se atrasa todo el proyecto.', /ruta cr[ií]tica|cr[ií]tica/i],
  ['Holgura', 'Días que una actividad puede atrasarse sin atrasar la fecha de fin del proyecto.', /holgura/i],
  ['Hito', 'Momento clave del proyecto sin duración (por ejemplo, "primera versión funcional"). Se dibuja con un rombo.', /\bhitos?\b/i],
  ['Diagrama de Gantt', 'Gráfico que muestra cada actividad como una barra a lo largo del tiempo.', /gantt/i],
  ['Interesado', 'Persona u organización afectada por el proyecto o que influye en él (en inglés, stakeholder).', /interesado/i],
  ['Patrocinador', 'Interesado que autoriza el proyecto y aprueba sus entregables; en este caso, el docente de la cátedra.', /patrocinador/i],
  ['Matriz de poder e interés', 'Cuadro que clasifica a los interesados según su poder sobre el proyecto y su interés en él, para decidir cómo comunicarse con cada uno.', /poder e inter[eé]s/i],
  ['Minuta', 'Registro escrito de una reunión: temas, decisiones y tareas asignadas.', /minuta/i],
  ['Riesgo', 'Evento incierto que, si ocurre, afecta al proyecto. Se evalúa por su probabilidad y su impacto.', /riesgo/i],
  ['PMBOK', 'Guía de los fundamentos para la dirección de proyectos del Project Management Institute; base de la metodología de los entregables.', /PMBOK/],
  ['Supuesto', 'Condición que se da por cierta para planificar, aunque no esté comprobada.', /supuesto/i],
  ['Restricción', 'Límite que el proyecto no puede superar (plazo, presupuesto, equipo, normas).', /restricci[oó]n/i],
  ['Control de cambios', 'Procedimiento para proponer, evaluar y aprobar cambios al alcance aprobado.', /control de cambios/i],
  ['PWA', 'Progressive Web App (aplicación web progresiva): sitio web que se puede instalar en el celular y abrir como una aplicación.', /\bPWA\b|instalable/i],
  ['Service worker', 'Programa que el navegador ejecuta en segundo plano y permite que la app abra aun con mala conexión.', /service worker/i],
  ['HTTPS', 'Protocolo de comunicación cifrado entre el navegador y el servidor.', /\bHTTPS\b/],
  ['API', 'Interfaz de programación: conjunto de operaciones que un sistema ofrece a otros programas.', /\bAPI\b/],
  ['REST', 'Estilo de API que usa las operaciones estándar de la web sobre direcciones (URL).', /\bREST\b/],
  ['OAuth', 'Protocolo que permite ingresar con una cuenta de otro servicio (en ENTS, Google) sin compartir la contraseña.', /OAuth|con Google/],
  ['SQL', 'Lenguaje estándar para definir y consultar bases de datos relacionales.', /\bSQL\b/],
  ['PostgreSQL', 'Motor de base de datos relacional de código abierto que usa ENTS.', /PostgreSQL/],
  ['Supabase', 'Servicio en la nube que provee la base de datos PostgreSQL, la autenticación y el almacenamiento de archivos.', /Supabase/],
  ['Netlify', 'Servicio que publica el sitio web con HTTPS cada vez que se actualiza el repositorio.', /Netlify/],
  ['GitHub', 'Plataforma donde se guarda el código con su historial de cambios (repositorio).', /GitHub/],
  ['Repositorio', 'Lugar donde se guarda el código fuente con todo su historial de versiones.', /repositorio/i],
  ['Rama (branch)', 'Copia paralela del código para trabajar un cambio sin afectar la versión principal (main).', /\brama/i],
  ['Commit', 'Cada cambio guardado en el repositorio, con autor, fecha y descripción.', /commit/i],
  ['Pull Request (PR)', 'Pedido para integrar los cambios de una rama a la principal, que otro integrante revisa antes de aceptar.', /pull request|\bPR\b/i],
  ['README', 'Archivo del repositorio que explica qué es el proyecto y cómo instalarlo y ejecutarlo.', /README/],
  ['OpenStreetMap', 'Mapa colaborativo y gratuito del que se obtienen el mapa de fondo y la ubicación de los barrios.', /OpenStreetMap/],
  ['Nominatim', 'Servicio de búsqueda de OpenStreetMap que convierte nombres de lugares en coordenadas.', /Nominatim/],
  ['Leaflet', 'Biblioteca que dibuja mapas interactivos en la web.', /Leaflet/],
  ['React', 'Biblioteca de JavaScript con la que se construye la interfaz de ENTS.', /\bReact\b/],
  ['Vite', 'Herramienta que compila y sirve la aplicación durante el desarrollo.', /\bVite\b/],
  ['Vitest', 'Herramienta con la que se escriben y ejecutan las pruebas automáticas.', /Vitest/],
  ['Lint', 'Revisión automática del código que detecta errores y malas prácticas (en ENTS, con oxlint).', /\blint\b|oxlint/i],
  ['Prueba automática', 'Programa que verifica que una parte del código da el resultado esperado, sin intervención manual.', /pruebas? autom[aá]tica/i],
  ['RLS', 'Row Level Security (seguridad por fila): reglas de la base de datos que deciden qué filas puede ver o modificar cada usuario.', /\bRLS\b|seguridad por fila/],
  ['RPC', 'Remote Procedure Call: función de la base de datos que la aplicación invoca para operaciones sensibles, verificando el rol adentro de la base.', /\bRPC\b/],
  ['Disparador (trigger)', 'Función que la base ejecuta sola cuando ocurre un cambio (por ejemplo, recalcular el score al recibir una firma).', /disparador|trigger/i],
  ['pg_trgm', 'Extensión de PostgreSQL que compara textos por trigramas (grupos de 3 letras) para encontrar peticiones parecidas.', /pg_trgm|trigrama/i],
  ['DER', 'Diagrama entidad-relación: dibujo de las tablas de la base y cómo se relacionan.', /\bDER\b/],
  ['PK', 'Primary key (clave primaria): columna que identifica cada fila de una tabla en forma única.', /\bPK\b/],
  ['FK', 'Foreign key (clave foránea): columna que apunta a la clave primaria de otra tabla y crea la relación entre ambas.', /\bFK\b/],
  ['MVC', 'Modelo-vista-controlador: forma de separar el sistema en datos (modelo), pantallas (vista) y lógica que los conecta (controlador).', /\bMVC\b/],
  ['CDN', 'Red de distribución de contenido: servidores repartidos que entregan el sitio desde el lugar más cercano al usuario.', /\bCDN\b/],
  ['UI / UX', 'Interfaz de usuario (lo que se ve) y experiencia de usuario (cómo se siente usarla).', /\bUI\b|\bUX\b/],
  ['CSS', 'Lenguaje que define el aspecto visual de las páginas web.', /\bCSS\b/],
  ['CSV / Excel', 'Formatos de planilla de cálculo usados para exportar reportes.', /\bCSV\b|Excel/],
  ['PDF', 'Formato de documento portable que se ve igual en cualquier dispositivo.', /\bPDF\b/],
  ['MDN Web Docs', 'Documentación de referencia de tecnologías web publicada por Mozilla.', /\bMDN\b/],
  ['JavaScript', 'Lenguaje de programación de las páginas web; en él está escrita la aplicación.', /JavaScript/],
  ['Node.js', 'Entorno que ejecuta JavaScript fuera del navegador; se usa para desarrollar y compilar la aplicación.', /Node\.js/],
  ['Bootstrap', 'Biblioteca de estilos para construir interfaces adaptables a celular.', /Bootstrap/],
  ['WCAG','Web Content Accessibility Guidelines: pautas internacionales de accesibilidad web del W3C.', /WCAG/],
  ['Accesibilidad', 'Posibilidad de que cualquier persona, incluso con discapacidad, use el sistema (teclado, contraste, lectores de pantalla).', /accesibilidad/i],
  ['Modo oscuro', 'Esquema de colores con fondo oscuro que reduce el brillo de la pantalla.', /modo oscuro/i],
  ['ONG', 'Organización no gubernamental: organización social sin fines de lucro.', /\bONG\b/],
  ['SMS', 'Mensaje de texto por celular.', /\bSMS\b/],
  ['Ley 25.326', 'Ley argentina de Protección de los Datos Personales.', /25\.326/],
  ['Código del documento (ENTS-GP)', 'Identificador de cada entregable: ENTS-GP-01 a ENTS-GP-07 (GP = gestión del proyecto).', /ENTS-GP/],
  ['ID', 'Identificador: código único de cada elemento de una lista (por ejemplo, RF01, HU03 o A7).', /\bID\b/],
  ['URL', 'Dirección de una página o recurso en internet (por ejemplo, https://entscordoba.netlify.app).', /\bURL\b/],
  ['Versión del documento', 'Número que cambia con cada modificación registrada en el historial de revisión (1.0, 2.0, 3.0, 4.0).', /historial de revisi[oó]n/i],
]

module.exports = {
  EQUIPO, DIRECTOR, HORAS_RESPONSABLE, HORAS_PARTICIPANTE,
  ACTIVIDADES, porId, DURACION_TOTAL, SEMANAS, RUTA, HORAS, HORAS_TOTALES, SPRINTS, sprintDeDia,
  EDT, CANTIDAD_PAQUETES, RF, RNF, HU, GLOSARIO,
}
