// Genera las ilustraciones de demostración (una escena por categoría, en
// dos variantes: de día y al atardecer) como páginas HTML con SVG.
// Después se capturan con Chrome a PNG de 1200×900.
// Uso: node ilustraciones.cjs <carpeta de salida>
const fs = require('fs')
const path = require('path')

const SALIDA = process.argv[2] || path.join(__dirname, 'ilustraciones')
fs.mkdirSync(SALIDA, { recursive: true })

const PALETAS = {
  dia: { cielo1: '#bfdcf7', cielo2: '#eaf3fc', suelo: '#c9c3b2', calle: '#8e8a80', sol: '#ffd36b', pared: '#efe7d6', techo: '#c0573e', luz: '#f6f1e4' },
  tarde: { cielo1: '#f2a96b', cielo2: '#f7d9b0', suelo: '#b7ae98', calle: '#7d786d', sol: '#ffb347', pared: '#e9dcc4', techo: '#a8452f', luz: '#f1e7d2' },
}

// ---------- Piezas reutilizables ----------
const casa = (x, y, w, h, p, grieta = false) => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${p.pared}" stroke="#6b6458" stroke-width="3"/>
  <polygon points="${x - 15},${y} ${x + w / 2},${y - h * 0.45} ${x + w + 15},${y}" fill="${p.techo}" stroke="#6b6458" stroke-width="3"/>
  <rect x="${x + w * 0.4}" y="${y + h * 0.45}" width="${w * 0.2}" height="${h * 0.55}" fill="#8a6a4a"/>
  <rect x="${x + w * 0.1}" y="${y + h * 0.2}" width="${w * 0.2}" height="${w * 0.2}" fill="#9cc3e8" stroke="#6b6458" stroke-width="2"/>
  <rect x="${x + w * 0.7}" y="${y + h * 0.2}" width="${w * 0.2}" height="${w * 0.2}" fill="#9cc3e8" stroke="#6b6458" stroke-width="2"/>
  ${grieta ? `<polyline points="${x + w * 0.65},${y + 5} ${x + w * 0.6},${y + h * 0.3} ${x + w * 0.68},${y + h * 0.5} ${x + w * 0.62},${y + h * 0.8}" fill="none" stroke="#3d3a33" stroke-width="4"/>` : ''}`

const arbol = (x, y, s = 1, seco = false) => `
  <rect x="${x - 8 * s}" y="${y - 90 * s}" width="${16 * s}" height="${90 * s}" fill="#7a5a3a"/>
  ${seco
    ? `<polyline points="${x},${y - 80 * s} ${x - 40 * s},${y - 140 * s}" stroke="#7a5a3a" stroke-width="${8 * s}"/><polyline points="${x},${y - 90 * s} ${x + 45 * s},${y - 150 * s}" stroke="#7a5a3a" stroke-width="${7 * s}"/>`
    : `<circle cx="${x}" cy="${y - 120 * s}" r="${55 * s}" fill="#5f9e5a"/><circle cx="${x - 35 * s}" cy="${y - 95 * s}" r="${38 * s}" fill="#6fae66"/><circle cx="${x + 35 * s}" cy="${y - 95 * s}" r="${38 * s}" fill="#4f8c4b"/>`}`

const farol = (x, y, apagado = true) => `
  <rect x="${x - 6}" y="${y - 260}" width="12" height="260" fill="#4a4a4a"/>
  <rect x="${x - 6}" y="${y - 260}" width="70" height="10" fill="#4a4a4a"/>
  <polygon points="${x + 45},${y - 250} ${x + 80},${y - 250} ${x + 72},${y - 230} ${x + 53},${y - 230}" fill="${apagado ? '#3b3b3b' : '#ffe08a'}"/>`

const persona = (x, y, color = '#3987e5', s = 1) => `
  <circle cx="${x}" cy="${y - 150 * s}" r="${18 * s}" fill="#d9a77c"/>
  <rect x="${x - 20 * s}" y="${y - 130 * s}" width="${40 * s}" height="${70 * s}" rx="${10 * s}" fill="${color}"/>
  <rect x="${x - 18 * s}" y="${y - 60 * s}" width="${14 * s}" height="${60 * s}" fill="#3d4a5c"/>
  <rect x="${x + 4 * s}" y="${y - 60 * s}" width="${14 * s}" height="${60 * s}" fill="#3d4a5c"/>`

const perro = (x, y, color = '#a8794e') => `
  <rect x="${x}" y="${y - 50}" width="90" height="35" rx="14" fill="${color}"/>
  <circle cx="${x + 95}" cy="${y - 55}" r="20" fill="${color}"/>
  <polygon points="${x + 95},${y - 75} ${x + 108},${y - 90} ${x + 110},${y - 68}" fill="${color}"/>
  <rect x="${x + 8}" y="${y - 20}" width="10" height="22" fill="${color}"/><rect x="${x + 70}" y="${y - 20}" width="10" height="22" fill="${color}"/>
  <polyline points="${x},${y - 45} ${x - 22},${y - 65}" stroke="${color}" stroke-width="8"/>`

const cartel = (x, y, texto, fondo = '#1c5cab') => `
  <rect x="${x}" y="${y}" width="${texto.length * 15 + 40}" height="50" rx="8" fill="${fondo}"/>
  <text x="${x + 20}" y="${y + 33}" font-family="Plus Jakarta Sans, Segoe UI, sans-serif" font-size="24" font-weight="700" fill="#fff">${texto}</text>`

const fondo = (p, horizonte = 560) => `
  <defs><linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.cielo1}"/><stop offset="1" stop-color="${p.cielo2}"/></linearGradient></defs>
  <rect width="1200" height="900" fill="url(#cielo)"/>
  <circle cx="1020" cy="140" r="60" fill="${p.sol}" opacity="0.9"/>
  <rect y="${horizonte}" width="1200" height="${900 - horizonte}" fill="${p.suelo}"/>`

const calle = (p, y = 680) => `
  <rect y="${y}" width="1200" height="${900 - y}" fill="${p.calle}"/>
  ${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${i * 220 + 40}" y="${y + 95}" width="120" height="14" fill="#efe9d8"/>`).join('')}`

// ---------- Una escena por categoría ----------
const ESCENAS = {
  // 1 Salud: centro de salud con fila de espera
  1: (p) => `${fondo(p)}
    <rect x="300" y="250" width="600" height="310" fill="${p.luz}" stroke="#6b6458" stroke-width="4"/>
    <rect x="300" y="230" width="600" height="30" fill="#8fb6dd"/>
    <rect x="565" y="270" width="70" height="70" fill="#d94a3a"/><rect x="587" y="282" width="26" height="46" fill="#fff"/><rect x="577" y="292" width="46" height="26" fill="#fff"/>
    <rect x="555" y="420" width="90" height="140" fill="#6f8fb0"/>
    ${[340, 420, 780, 840].map((x) => `<rect x="${x}" y="320" width="50" height="60" fill="#9cc3e8" stroke="#6b6458" stroke-width="2"/>`).join('')}
    ${cartel(360, 180, 'CENTRO DE SALUD', '#1c5cab')}
    ${persona(200, 640, '#e07a5f')}${persona(250, 645, '#3987e5', 0.8)}${persona(130, 640, '#81b29a')}`,
  // 2 Seguridad: esquina a oscuras con farol apagado
  2: (p) => `${fondo({ ...p, cielo1: '#1d2b4a', cielo2: '#3b4a6b', sol: '#e9edf5' })}
    ${casa(120, 380, 220, 180, { ...p, pared: '#8a8579' })}${casa(780, 360, 260, 200, { ...p, pared: '#7d786d' })}
    ${calle(p)}${farol(560, 680, true)}
    <circle cx="1020" cy="140" r="60" fill="#1d2b4a" transform="translate(25 -10)"/>`,
  // 3 Vivienda: casas con grietas y tanque de agua
  3: (p) => `${fondo(p)}
    ${casa(140, 360, 240, 200, p, true)}${casa(470, 340, 260, 220, p, true)}${casa(820, 370, 230, 190, p)}
    <rect x="560" y="230" width="80" height="60" fill="#5b7fa8"/><rect x="590" y="290" width="20" height="50" fill="#5b7fa8"/>`,
  // 4 Educación: escuela con bandera y goteras
  4: (p) => `${fondo(p)}
    <rect x="250" y="270" width="700" height="290" fill="${p.pared}" stroke="#6b6458" stroke-width="4"/>
    <polygon points="230,270 600,170 970,270" fill="${p.techo}" stroke="#6b6458" stroke-width="4"/>
    ${[300, 420, 700, 820].map((x) => `<rect x="${x}" y="330" width="80" height="80" fill="#9cc3e8" stroke="#6b6458" stroke-width="3"/>`).join('')}
    <rect x="550" y="420" width="100" height="140" fill="#8a6a4a"/>
    <rect x="1000" y="250" width="8" height="310" fill="#555"/><rect x="1008" y="255" width="90" height="25" fill="#74acdf"/><rect x="1008" y="280" width="90" height="25" fill="#fff"/><rect x="1008" y="305" width="90" height="25" fill="#74acdf"/>
    ${[350, 460, 740].map((x, i) => `<polygon points="${x},${415 + i * 8} ${x - 9},${440 + i * 8} ${x + 9},${440 + i * 8}" fill="#3987e5"/>`).join('')}
    ${cartel(470, 200, 'ESCUELA N° 152', '#0d366b')}`,
  // 5 Ambiente: basural en un baldío
  5: (p) => `${fondo(p)}
    ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => `<rect x="${i * 100 + 20}" y="430" width="8" height="140" fill="#7a7468"/>`).join('')}
    <rect x="0" y="450" width="1200" height="5" fill="#7a7468"/><rect x="0" y="500" width="1200" height="5" fill="#7a7468"/>
    ${[[380, 700, '#2b2b2b', 70], [470, 720, '#3d5a3a', 60], [560, 700, '#2b2b2b', 80], [640, 730, '#4a4a4a', 55], [520, 650, '#5a4632', 50], [720, 710, '#2b2b2b', 60]].map(([x, y, c, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`).join('')}
    <rect x="300" y="720" width="70" height="40" fill="#b5651d" transform="rotate(-12 335 740)"/>
    <rect x="760" y="690" width="60" height="80" fill="#9aa5b1"/>
    ${arbol(1050, 600, 1.1)}`,
  // 6 Infraestructura: bache con cono en la calle
  6: (p) => `${fondo(p, 520)}
    ${casa(100, 330, 230, 190, p)}${casa(850, 320, 250, 200, p)}
    ${calle(p, 600)}
    <ellipse cx="600" cy="760" rx="210" ry="70" fill="#3f3b35"/><ellipse cx="600" cy="752" rx="175" ry="50" fill="#2a2724"/>
    <ellipse cx="610" cy="770" rx="90" ry="18" fill="#6d8fb2" opacity="0.7"/>
    <polygon points="880,800 940,800 920,690 900,690" fill="#f28c28"/><rect x="895" y="725" width="30" height="16" fill="#fff"/><rect x="860" y="800" width="100" height="14" fill="#f28c28"/>`,
  // 7 Transporte: parada sin refugio y colectivo
  7: (p) => `${fondo(p, 540)}
    ${calle(p, 620)}
    <rect x="160" y="300" width="10" height="320" fill="#555"/><rect x="120" y="300" width="90" height="70" rx="8" fill="#1c5cab"/>
    <text x="135" y="347" font-family="Segoe UI, sans-serif" font-size="30" font-weight="700" fill="#fff">BUS</text>
    <rect x="520" y="430" width="560" height="210" rx="30" fill="#e8b33a"/>
    ${[560, 660, 760, 860, 960].map((x) => `<rect x="${x}" y="460" width="80" height="70" rx="8" fill="#cfe3f6"/>`).join('')}
    <circle cx="620" cy="645" r="38" fill="#2b2b2b"/><circle cx="980" cy="645" r="38" fill="#2b2b2b"/>
    ${persona(260, 620, '#e07a5f')}${persona(330, 620, '#81b29a', 0.9)}`,
  // 8 Servicios públicos: pérdida de agua en la vereda
  8: (p) => `${fondo(p)}
    ${casa(140, 350, 250, 210, p)}${casa(760, 340, 280, 220, p)}
    <rect y="560" width="1200" height="70" fill="#d8d2c2"/>
    <ellipse cx="560" cy="640" rx="260" ry="45" fill="#7fb2e0" opacity="0.8"/>
    <rect x="500" y="600" width="120" height="26" fill="#4a6a8a"/>
    ${[0, 1, 2, 3, 4].map((i) => `<polyline points="${560 + (i - 2) * 18},598 ${560 + (i - 2) * 40},${520 - i % 2 * 30}" stroke="#7fb2e0" stroke-width="7"/>`).join('')}
    <rect x="980" y="180" width="14" height="380" fill="#6b5a45"/><polyline points="0,250 987,200 1200,240" fill="none" stroke="#333" stroke-width="3"/>`,
  // 9 Animales: perros sueltos en la plaza
  9: (p) => `${fondo(p)}
    ${arbol(180, 580)}${arbol(1000, 580, 1.2)}
    <rect x="420" y="520" width="260" height="20" fill="#8a6a4a"/><rect x="430" y="540" width="12" height="40" fill="#555"/><rect x="660" y="540" width="12" height="40" fill="#555"/>
    ${perro(300, 760)}${perro(560, 800, '#4a3a2a')}${perro(780, 750, '#d8c3a0')}`,
  // 10 Accesibilidad: esquina sin rampa
  10: (p) => `${fondo(p, 520)}
    ${calle(p, 640)}
    <rect y="560" width="1200" height="80" fill="#d8d2c2"/><rect y="630" width="1200" height="14" fill="#a39d8f"/>
    <rect x="740" y="380" width="160" height="160" rx="16" fill="#1c5cab"/>
    <circle cx="815" cy="415" r="14" fill="#fff"/><polyline points="815,432 815,480 860,480 875,515" fill="none" stroke="#fff" stroke-width="10"/><circle cx="805" cy="490" r="34" fill="none" stroke="#fff" stroke-width="8"/>
    <polyline points="420,580 520,640" stroke="#d94a3a" stroke-width="10"/><polyline points="520,580 420,640" stroke="#d94a3a" stroke-width="10"/>`,
  // 11 Espacios públicos: hamacas rotas
  11: (p) => `${fondo(p)}
    <polyline points="330,600 420,300 780,300 870,600" fill="none" stroke="#c0573e" stroke-width="16"/>
    <polyline points="500,300 500,500" stroke="#555" stroke-width="5"/><polyline points="560,300 560,500" stroke="#555" stroke-width="5"/><rect x="490" y="500" width="80" height="14" fill="#3987e5"/>
    <polyline points="660,300 660,420" stroke="#555" stroke-width="5"/><polyline points="720,300 700,560" stroke="#555" stroke-width="5"/><rect x="680" y="560" width="80" height="14" fill="#3987e5" transform="rotate(25 720 567)"/>
    ${arbol(160, 600)}${arbol(1050, 600, 0.9)}`,
  // 12 Cultura y deporte: cancha abandonada
  12: (p) => `${fondo(p)}
    <rect x="160" y="520" width="880" height="200" fill="#b98a6a" transform="skewX(-12)"/>
    <rect x="880" y="250" width="14" height="300" fill="#555"/><rect x="820" y="230" width="130" height="90" fill="#f6f1e4" stroke="#555" stroke-width="5"/><ellipse cx="855" cy="330" rx="34" ry="8" fill="none" stroke="#d94a3a" stroke-width="6"/>
    ${[[300, 600], [450, 650], [700, 620]].map(([x, y]) => `<polyline points="${x},${y} ${x + 20},${y - 30} ${x + 40},${y}" fill="none" stroke="#5f9e5a" stroke-width="6"/>`).join('')}`,
  // 13 Desarrollo social: comedor comunitario
  13: (p) => `${fondo(p)}
    <rect x="230" y="260" width="740" height="300" fill="${p.luz}" stroke="#6b6458" stroke-width="4"/>
    ${cartel(420, 200, 'COMEDOR COMUNITARIO', '#81b29a')}
    <rect x="320" y="470" width="560" height="22" fill="#8a6a4a"/>
    ${[380, 520, 660, 800].map((x) => `<rect x="${x - 35}" y="420" width="70" height="50" rx="6" fill="#9aa5b1"/><rect x="${x - 40}" y="415" width="80" height="10" rx="4" fill="#6b7682"/>`).join('')}
    ${persona(150, 650, '#3987e5')}${persona(1050, 650, '#e07a5f')}`,
  // 14 Niñez: apoyo escolar
  14: (p) => `${fondo(p)}
    <rect x="200" y="300" width="800" height="260" fill="${p.luz}" stroke="#6b6458" stroke-width="4"/>
    <rect x="260" y="330" width="300" height="160" fill="#2f5d50"/><text x="290" y="400" font-family="Segoe UI" font-size="40" fill="#fff">2 + 3 = 5</text>
    <rect x="640" y="460" width="260" height="18" fill="#8a6a4a"/>
    ${[680, 760, 840].map((x, i) => `<rect x="${x}" y="${440 - i * 6}" width="50" height="${20 + i * 6}" fill="${['#e07a5f', '#3987e5', '#f2cc8f'][i]}"/>`).join('')}
    ${persona(620, 650, '#f2cc8f', 0.7)}${persona(720, 650, '#81b29a', 0.75)}`,
  // 15 Adultos mayores: banco en la plaza
  15: (p) => `${fondo(p)}
    ${arbol(250, 600, 1.3)}${arbol(980, 600)}
    <rect x="460" y="560" width="300" height="20" fill="#8a6a4a"/><rect x="460" y="510" width="300" height="16" fill="#8a6a4a"/>
    <rect x="475" y="580" width="12" height="50" fill="#555"/><rect x="735" y="580" width="12" height="50" fill="#555"/>
    <circle cx="560" cy="440" r="18" fill="#d9a77c"/><circle cx="560" cy="428" r="16" fill="#e6e6e6"/><rect x="540" y="458" width="40" height="70" rx="10" fill="#7a6a9a"/>
    <polyline points="600,470 640,560" stroke="#6b5a45" stroke-width="6"/>`,
  // 16 Género y diversidad: punto de atención
  16: (p) => `${fondo(p)}
    <rect x="320" y="280" width="560" height="280" fill="${p.luz}" stroke="#6b6458" stroke-width="4"/>
    ${cartel(410, 220, 'PUNTO DE ATENCIÓN', '#7b4fa0')}
    <path d="M600 360 C 560 330, 520 370, 600 440 C 680 370, 640 330, 600 360 Z" fill="#7b4fa0"/>
    <rect x="555" y="460" width="90" height="100" fill="#8a6a4a"/>
    ${arbol(180, 600)}${arbol(1020, 600, 0.9)}`,
}

// Las categorías que más se reclaman tienen dos variantes (día y tarde)
const CATEGORIAS = Object.keys(ESCENAS)
const archivos = []
for (const cat of CATEGORIAS) {
  for (const momento of ['dia', 'tarde']) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="1200" height="900">
      ${ESCENAS[cat](PALETAS[momento])}
      <rect x="932" y="846" width="252" height="40" rx="20" fill="#000" opacity="0.45"/>
      <text x="1058" y="873" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="20" fill="#fff">Imagen ilustrativa</text>
    </svg>`
    const nombre = `cat${String(cat).padStart(2, '0')}_${momento}`
    fs.writeFileSync(path.join(SALIDA, nombre + '.html'), `<!doctype html><html><body style="margin:0">${svg}</body></html>`)
    archivos.push(nombre)
  }
}
console.log(archivos.length, 'escenas en', SALIDA)
