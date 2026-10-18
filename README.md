# ENTS — Everyone Needs To Smile

Plataforma de peticiones vecinales de Córdoba y Villa Allende: los vecinos
publican problemas de su barrio, los firman, y los funcionarios de cada área
del municipio responden y muestran el avance hasta que se resuelven.

Sitio publicado: https://entscordoba.netlify.app

## Cómo correrlo en tu compu

Necesitás [Node.js 22](https://nodejs.org) y Git.

```bash
git clone https://github.com/andradaj09/ENTS.git
cd ENTS
npm install
cp .env.example .env      # en Windows (PowerShell): copy .env.example .env
# completá .env con los datos de Supabase que te pasa Juan por privado
npm run dev
```

Abrí http://localhost:5173 y creá una cuenta. Para tener permisos de
administrador, pedíselo a Juan (se asigna desde la base de datos).

## Comandos

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor local con recarga automática |
| `npm run build` | Compila la versión de producción en `dist/` |
| `npm run lint` | Revisa el código con oxlint |
| `npm test` | Corre los tests (Vitest) |

## Cómo trabajamos

- `main` es lo que está publicado: **cada push a `main` se publica solo en Netlify**.
  Por eso no trabajamos directo sobre `main`.
- Para cada cambio, creá una rama y abrí un Pull Request:

  ```bash
  git checkout main && git pull
  git checkout -b nombre-del-cambio
  # ...cambios...
  git add -A && git commit -m "Qué cambiaste"
  git push -u origin nombre-del-cambio
  ```

  Después, en GitHub, abrí el Pull Request para que otro lo revise antes de unirlo.
- Antes de pedir revisión: `npm run lint`, `npm test` y `npm run build` sin errores.
- La base de datos es compartida (un solo proyecto de Supabase): lo que crees
  probando en local aparece en el sitio publicado. Usá datos de prueba claros y
  borralos al terminar. Los datos de demostración (cuentas `@demo.ents.invalid`)
  se cargan y se borran con los scripts de `supabase/demo`.
- Los cambios en la base (tablas, permisos, funciones) se coordinan con Juan y
  se agregan también a `supabase/schema.sql`.

## Estructura

```
src/
  pages/        Una pantalla por archivo (Inicio, Mapa, Petición, Bandeja, ...)
  components/   Piezas reutilizables (tarjetas, gráficos, comentarios, ...)
  services/     Consultas a Supabase
  hooks/        Datos compartidos entre pantallas (dueño, permisos por panel)
  utils/        Lógica sin pantalla (prioridad, clasificador, moderación, ...)
  styles/       Tema claro (theme.css), oscuro (oscuro.css) y por página
supabase/
  schema.sql    Esquema completo de la base (tablas, permisos y funciones)
  demo/         Datos de demostración: cargarlos y borrarlos (ver LEEME.md)
docs/entrega/   Documentación del trabajo práctico y entregables (HTML y PDF)
public/         Íconos, manifiesto y service worker (app instalable)
```

## Documentación

Los entregables salen de un único archivo de datos. Después de cambiar
`docs/entrega/entregables/datos.cjs`:

```bash
node docs/entrega/entregables/generar.cjs
```

Eso regenera los 7 entregables, el documento combinado y la documentación
general (`docs/entrega/documentacion.html`). Los PDF se imprimen desde Chrome.

## Tecnologías

React 19 + Vite, React Router, Bootstrap 5 con tema propio, Leaflet (mapa),
Supabase (autenticación, base Postgres con RLS y almacenamiento de fotos),
Netlify (publicación) y Vitest (tests).
