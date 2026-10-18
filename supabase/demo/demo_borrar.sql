-- =====================================================================
-- ENTS · Borrar los datos de demostración
-- =====================================================================
-- Elimina todo lo que cargó demo_cargar.sql. Las peticiones, firmas,
-- comentarios, publicaciones, respuestas, avisos y barrios seguidos se
-- borran en cascada con las cuentas ficticias (@demo.ents.invalid).
-- Las fotos de demostración se borran aparte desde el almacenamiento
-- (carpeta <dueño>/demo/ del bucket "peticiones").

-- Los eventos no se borran en cascada: primero se eliminan los de la demo
delete from public.eventos
where creado_por in (select id from auth.users where email like '%@demo.ents.invalid');

delete from auth.users where email like '%@demo.ents.invalid';

-- Opcional: volver a mostrar las peticiones de prueba ocultadas por la carga.
-- (La 37 tiene contenido ofensivo: no conviene volver a publicarla.)
-- update public.peticiones set estado = 'publicada' where id in (32, 33, 34);
