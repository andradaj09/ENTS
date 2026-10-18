# Datos de demostración de ENTS

Muestra sintética para exponer la plataforma: 300 vecinos ficticios, 200 peticiones,
≈ 3.300 firmas, respuestas oficiales, 350 comentarios, publicaciones del muro,
15 eventos y 32 ilustraciones (marcadas como "Imagen ilustrativa").

## Archivos

| Archivo | Qué hace |
|---|---|
| `demo_cargar.sql` | Crea los vecinos ficticios (`@demo.ents.invalid`, sin contraseña) y genera todo dentro de la base. El score, la prioridad y las elevaciones los calculan los disparadores reales. Siempre genera la misma muestra (`setseed`). |
| `demo_borrar.sql` | Borra todo lo anterior: los eventos de la demo y las cuentas ficticias (el resto se va en cascada). |
| `ilustraciones.cjs` | Genera las 32 escenas (16 categorías × día/tarde) como HTML con SVG, para capturarlas a PNG de 1200×900. |

## Cargar

1. Ejecutar `demo_cargar.sql` en el editor SQL de Supabase.
2. Generar las ilustraciones: `node ilustraciones.cjs <carpeta>` y capturar cada HTML a PNG.
3. Con la sesión del dueño iniciada, subir los PNG a `peticiones/<id del dueño>/demo/` (sin `upsert`).
4. Asignar las fotos:

```sql
update public.peticiones p
set fotos = array['<id del dueño>/demo/cat' || lpad(p.categoria_id::text, 2, '0')
                  || case when p.id % 2 = 0 then '_dia' else '_tarde' end || '.png']
where p.usuario_id in (select id from auth.users where email like '%@demo.ents.invalid')
  and abs(hashtext(p.id::text)) % 10 < 6;
```

## Borrar

1. Ejecutar `demo_borrar.sql`.
2. Con la sesión del dueño, borrar la carpeta `peticiones/<id del dueño>/demo/` del almacenamiento.
