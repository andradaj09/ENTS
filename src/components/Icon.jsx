// Íconos de líneas rectas (sin curvas), trazo uniforme.
const paths = {
  home: 'M3 11 L12 3 L21 11 M5 9.5 V21 H19 V9.5 M10 21 V14 H14 V21',
  file: 'M6 3 H14 L19 8 V21 H6 Z M14 3 V8 H19 M9 12 H16 M9 16 H16',
  map: 'M3 5 L9 3 L15 5 L21 3 V19 L15 21 L9 19 L3 21 Z M9 3 V19 M15 5 V21',
  users: 'M7 4 H13 V10 H7 Z M3 20 L5 14 H15 L17 20 Z M16 5 H20 V9 H16 M18 14 H19.5 L21.5 20 H19',
  bell: 'M6 17 V10 L9 5 H15 L18 10 V17 L20 19 H4 Z M10 21 H14',
  user: 'M8 3 H16 V11 H8 Z M4 21 V17 L8 14 H16 L20 17 V21',
  plus: 'M12 5 V19 M5 12 H19',
  list: 'M9 6 H20 M9 12 H20 M9 18 H20 M4 6 H5.5 M4 12 H5.5 M4 18 H5.5',
  chevron: 'M9 6 L15 12 L9 18',
  shield: 'M12 3 L20 6 V12 L12 21 L4 12 V6 Z M9 12 L11 14 L15 10',
  megaphone: 'M3 10 V14 H7 L17 19 V5 L7 10 Z M7 14 L9 21 H11 L10 15 M20 9 V15',
  check: 'M5 12 L10 17 L19 7',
  hourglass: 'M6 3 H18 L12 12 L18 21 H6 L12 12 Z',
  alert: 'M12 3 L22 20 H2 Z M12 9 V14 M12 16.5 V17.5',
  menu: 'M4 6 H20 M4 12 H20 M4 18 H20',
  close: 'M5 5 L19 19 M19 5 L5 19',
  flag: 'M5 21 V3 M5 4 H18 L15 8 L18 12 H5',
  pen: 'M4 20 L8 19 L19 8 L16 5 L5 16 Z M14 7 L17 10',
  login: 'M14 4 H20 V20 H14 M9 8 L13 12 L9 16 M3 12 H13',
  logout: 'M10 4 H4 V20 H10 M14 8 L18 12 L14 16 M8 12 H18',
  steps: 'M3 20 H8 V15 H13 V10 H18 V5 H21',
  search: 'M4 4 H15 V15 H4 Z M15 15 L21 21',
  up: 'M12 20 V5 M5 12 L12 5 L19 12',
  image: 'M3 5 H21 V19 H3 Z M3 16 L9 10 L14 15 L17 12 L21 16 M15 8 H17 V10 H15 Z',
  mail:'M3 5 H21 V19 H3 Z M3 5 L12 13 L21 5',
  lock: 'M5 11 H19 V21 H5 Z M8 11 V7 L10 4 H14 L16 7 V11 M12 15 V17',
  eye: 'M2 12 L7 6 H17 L22 12 L17 18 H7 Z M10 10 H14 V14 H10 Z',
  eyeOff: 'M2 12 L7 6 H17 L22 12 L17 18 H7 Z M4 4 L20 20',
  arrow: 'M4 12 H20 M14 6 L20 12 L14 18',
  download: 'M12 4 V15 M7 10 L12 15 L17 10 M5 20 H19',
  sun: 'M8 8 H16 V16 H8 Z M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22 M5 5 L7 7 M17 17 L19 19 M5 19 L7 17 M17 7 L19 5',
  moon: 'M15 3 L9 6 L7 12 L9 18 L15 21 L11 15 L11 9 Z',
  chart: 'M4 20 H20 M7 17 V12 M12 17 V6 M17 17 V9',
  calendar:'M4 6 H20 V21 H4 Z M4 10 H20 M8 3 V7 M16 3 V7',
  trash: 'M4 7 H20 M9 7 V4 H15 V7 M6 7 L7 21 H17 L18 7',
}

function Icon({ name, size = 20, className = '' }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}

export default Icon
