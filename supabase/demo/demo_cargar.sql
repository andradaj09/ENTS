-- =====================================================================
-- ENTS · Datos de demostración (sintéticos)
-- =====================================================================
-- Carga una muestra grande y realista para exponer la plataforma:
-- 300 vecinos ficticios, 200 peticiones, ≈ 4.000 firmas, respuestas
-- oficiales, comentarios, publicaciones del muro y eventos.
--
-- · Todas las cuentas ficticias usan correos @demo.ents.invalid y no tienen
--   contraseña: nadie puede iniciar sesión con ellas.
-- · Todo cuelga de esas cuentas, así que demo_borrar.sql lo elimina completo.
-- · El score, la prioridad, las elevaciones y los avisos los calculan los
--   disparadores reales de la base, igual que con datos verdaderos.
-- · setseed() hace que la muestra sea siempre la misma.
-- =====================================================================

do $$
declare
  nombres text[] := array['Lucía','Martina','Sofía','Valentina','Camila','Florencia','Agustina','Julieta','Micaela','Carolina','Paula','Romina','Natalia','Gabriela','Silvia','Graciela','Mónica','Laura','Andrea','Verónica','Rocío','Milagros','Belén','Daniela','Mariana','Juan','Mateo','Santiago','Tomás','Nicolás','Facundo','Martín','Lucas','Joaquín','Franco','Gonzalo','Diego','Pablo','Marcelo','Sergio','Ricardo','Jorge','Hernán','Gustavo','Alejandro','Federico','Matías','Ezequiel','Emiliano','Ramiro'];
  apellidos text[] := array['González','Rodríguez','Gómez','Fernández','López','Díaz','Martínez','Pérez','García','Sánchez','Romero','Sosa','Álvarez','Torres','Ruiz','Ramírez','Flores','Acosta','Benítez','Medina','Herrera','Aguirre','Pereyra','Gutiérrez','Giménez','Molina','Silva','Castro','Rojas','Ortiz','Núñez','Luna','Juárez','Cabrera','Ríos','Ferreyra','Godoy','Morales','Domínguez','Moreno','Peralta','Vega','Carrizo','Quiroga','Ledesma','Bustos','Villarreal','Ponce','Olmos','Funes'];
  calles text[] := array['Av. Colón','Av. Vélez Sarsfield','Bv. San Juan','Av. Rafael Núñez','Av. Sabattini','Av. Fuerza Aérea','Av. Duarte Quirós','Av. Juan B. Justo','Av. Monseñor Pablo Cabrera','Av. Castro Barros','Av. Patria','Av. Japón','Bv. Los Granaderos','Av. O''Higgins','Av. Armada Argentina','calle Obispo Salguero','calle Rondeau','calle Ituzaingó','calle Chacabuco','calle Caseros','calle 27 de Abril','calle La Rioja','calle Santa Rosa','calle Jujuy','calle Tucumán','calle Lima','calle Mendoza','calle Pringles','calle Maipú','calle Bolívar'];
  -- Barrios con más actividad aparecen varias veces (más peticiones)
  barrios bigint[] := array[1,1,2,2,3,3,4,4,5,6,7,7,8,8,9,10,11,11,12,13,14,15,16,17,18,19,20,21,21,22,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,52,53,54,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,111];
  -- Categorías: las más reclamadas pesan más
  cats bigint[] := array[6,6,6,6,2,2,2,2,8,8,8,5,5,5,1,1,1,7,7,4,4,3,3,9,9,10,11,12,13,14,15,16];

  usuarios uuid[] := '{}';
  funcionarios uuid[] := '{}';
  moderador uuid;
  uid uuid;
  i int; j int; n int; k int;
  pid bigint; v_cat bigint; zona bigint; zona_nombre text; area bigint;
  plantilla record; titulo text; descr text; calle text; calle2 text; altura text;
  creada timestamptz; estado text; etapa text; etapas text[]; meta int;
  r float;
begin
  perform setseed(0.42);

  -- -------------------------------------------------------------------
  -- 1. Plantillas de texto por categoría
  -- -------------------------------------------------------------------
  create temp table plantillas (cat bigint, titulo text, descr text) on commit drop;
  insert into plantillas values
  -- 6 Infraestructura
  (6,'Bache peligroso en {calle} al {n}','Hay un bache profundo en {calle} al {n}, en {barrio}. Ya rompió varias cubiertas y de noche no se ve. Pedimos que se repare antes de que haya un accidente.'),
  (6,'Calle de tierra intransitable cuando llueve en {barrio}','Las calles de tierra de {barrio} quedan llenas de barro con cada lluvia. Los colectivos no entran y los chicos no pueden llegar a la escuela. Pedimos enripiado o pavimento.'),
  (6,'Desagüe tapado inunda la esquina de {calle}','El desagüe de {calle} y la esquina siguiente está tapado. Con cada tormenta el agua entra a las casas de {barrio}. Pedimos limpieza y mantenimiento del desagüe.'),
  (6,'Veredas rotas en {calle} al {n}','Las veredas de {calle} al {n} están levantadas por las raíces y hay baldosas sueltas. Varios adultos mayores de {barrio} ya se cayeron.'),
  (6,'Puente peatonal deteriorado en {barrio}','El puente peatonal de {barrio} tiene barandas flojas y tablones rotos. Lo cruzan chicos todos los días para ir a la escuela. Es urgente repararlo.'),
  (6,'Luminarias apagadas en toda la cuadra de {calle}','Desde hace semanas no funciona ninguna luminaria en {calle} al {n}, en {barrio}. De noche la cuadra queda completamente a oscuras.'),
  -- 10 Accesibilidad
  (10,'Faltan rampas para sillas de ruedas en {calle}','En las esquinas de {calle} en {barrio} no hay rampas. Las personas en silla de ruedas y con cochecitos tienen que bajar a la calle.'),
  (10,'Parada de colectivo sin acceso para personas con movilidad reducida en {barrio}','La parada de {calle} al {n} tiene un escalón alto y no hay rampa. Pedimos adaptarla para personas con movilidad reducida.'),
  -- 2 Seguridad
  (2,'Robos reiterados en la parada de {calle}','En la parada de colectivos de {calle} al {n}, en {barrio}, hubo varios arrebatos en las últimas semanas, sobre todo a la mañana temprano. Pedimos más presencia policial.'),
  (2,'Plaza de {barrio} a oscuras e insegura de noche','La plaza principal de {barrio} no tiene luz desde hace un mes. De noche se juntan grupos y los vecinos tienen miedo de pasar. Pedimos iluminación y patrullaje.'),
  (2,'Motochorros en la zona de {calle}','Vecinos de {barrio} denuncian robos con moto en {calle}. Pedimos cámaras de seguridad y patrullaje en el horario de salida de las escuelas.'),
  (2,'Falta de patrullaje nocturno en {barrio}','Después de las 22 h no se ve ningún patrullero en {barrio}. Hubo intentos de robo en casas de {calle}. Pedimos un recorrido nocturno.'),
  (2,'Esquina peligrosa por falta de iluminación en {calle} y {calle2}','La esquina de {calle} y {calle2} está a oscuras y ya hubo dos asaltos este mes en {barrio}.'),
  -- 8 Servicios públicos
  (8,'Cortes de agua diarios en {barrio}','Desde hace dos semanas en {barrio} nos quedamos sin agua todas las tardes. Hay familias con chicos y adultos mayores. Pedimos una solución urgente.'),
  (8,'Recolección de residuos irregular en {barrio}','El camión de residuos no pasa por {calle} desde hace más de una semana. La basura se acumula en las esquinas y aparecen roedores.'),
  (8,'Cortes de luz frecuentes en {barrio}','En {barrio} hay cortes de luz casi todos los días, a veces por varias horas. Se queman electrodomésticos y hay vecinos electrodependientes.'),
  (8,'Pérdida de agua en la vereda de {calle} al {n}','Hay una pérdida de agua potable en la vereda de {calle} al {n} hace más de un mes. Se pierde muchísima agua y se está hundiendo la vereda.'),
  (8,'Sin señal de internet ni teléfono fijo en {barrio}','Desde la última tormenta, varias cuadras de {barrio} siguen sin servicio de teléfono fijo ni internet.'),
  -- 5 Ambiente
  (5,'Microbasural en el baldío de {calle}','En el terreno baldío de {calle} al {n}, en {barrio}, se formó un basural. Hay olor, moscas y ratas. Pedimos limpieza y un cartel de prohibido arrojar residuos.'),
  (5,'Árboles secos con riesgo de caída en {barrio}','Sobre {calle} hay varios árboles secos que pueden caerse con el viento sobre autos o personas. Pedimos poda o extracción.'),
  (5,'Quema de basura en {barrio} afecta a los vecinos','Todas las noches queman basura cerca de {calle}. El humo entra a las casas y hay chicos con problemas respiratorios.'),
  (5,'Pedimos más contenedores de reciclaje en {barrio}','En {barrio} no hay puntos limpios ni contenedores diferenciados. Muchos vecinos queremos separar residuos pero no tenemos dónde llevarlos.'),
  -- 9 Animales
  (9,'Perros sueltos en la plaza de {barrio}','Una jauría de perros sueltos permanece en la plaza de {barrio}. Hubo mordeduras a chicos. Pedimos castración, vacunación y un operativo de adopción.'),
  (9,'Pedimos campaña de castración gratuita en {barrio}','En {barrio} hay muchos perros y gatos en la calle. Pedimos una campaña de castración y vacunación antirrábica.'),
  -- 11 Espacios públicos
  (11,'Juegos rotos en la plaza de {barrio}','Los juegos de la plaza de {barrio} tienen hierros expuestos y hamacas rotas. Los chicos se lastiman. Pedimos reparación y mantenimiento.'),
  (11,'Pedimos bancos y sombra en la plaza de {calle}','La plaza de {calle} en {barrio} no tiene bancos ni árboles. Los adultos mayores no tienen dónde sentarse.'),
  -- 1 Salud
  (1,'Dispensario de {barrio} sin pediatra los fines de semana','El dispensario de {barrio} no tiene pediatra sábados ni domingos. Las familias tienen que viajar al hospital con chicos enfermos.'),
  (1,'Faltan turnos en el centro de salud de {barrio}','En el centro de salud de {barrio} hay que ir a las 5 de la mañana para conseguir un turno y muchos se quedan sin atención.'),
  (1,'Foco de dengue en {barrio}: agua estancada en {calle}','En {calle} hay agua estancada desde hace semanas y muchos mosquitos. Ya hay vecinos de {barrio} con síntomas. Pedimos fumigación y descacharrado.'),
  (1,'Centro de salud de {barrio} sin ambulancia propia','El centro de salud de {barrio} no tiene ambulancia asignada y las emergencias esperan más de una hora.'),
  -- 7 Transporte
  (7,'El colectivo nocturno no cumple la frecuencia en {barrio}','Después de las 22 h el colectivo que pasa por {barrio} tarda más de una hora. Muchos vecinos vuelven de trabajar a esa hora.'),
  (7,'Semáforo apagado en {calle} y {calle2}','El semáforo de {calle} y {calle2} no funciona hace días. Es una esquina con mucho tránsito y ya hubo choques.'),
  (7,'Falta reductor de velocidad frente a la escuela de {barrio}','Los autos pasan muy rápido frente a la escuela de {calle}, en {barrio}. Pedimos lomos de burro y senda peatonal pintada.'),
  (7,'Parada de colectivo sin refugio en {calle}','La parada de {calle} al {n} no tiene techo ni banco. Con lluvia o calor es imposible esperar.'),
  -- 4 Educación
  (4,'Escuela de {barrio} con filtraciones en las aulas','Cada vez que llueve se filtra agua en varias aulas de la escuela de {barrio}. Se suspenden clases y hay riesgo eléctrico.'),
  (4,'Jardín de infantes de {barrio} sin calefacción','El jardín de infantes de {barrio} no tiene calefacción funcionando y los chicos pasan frío durante las clases.'),
  (4,'Faltan bancos y pizarrones en la escuela de {barrio}','La escuela de {barrio} tiene aulas con bancos rotos y chicos que toman clase parados.'),
  -- 3 Vivienda
  (3,'Familias de {barrio} sin conexión a la red de agua','Varias familias de {barrio} no tienen conexión a la red de agua potable y dependen de un camión cisterna que pasa una vez por semana.'),
  (3,'Viviendas sociales con problemas estructurales en {barrio}','Las viviendas sociales de {barrio} presentan grietas y humedad a pocos años de entregadas. Pedimos una inspección técnica.'),
  -- 12 Cultura y deporte
  (12,'Pedimos recuperar el polideportivo de {barrio}','El polideportivo de {barrio} está abandonado. Pedimos que se recupere para actividades deportivas de chicos y adultos mayores.'),
  (12,'La biblioteca popular de {barrio} necesita reparaciones','La biblioteca popular de {barrio} tiene el techo dañado y peligra el material. Pedimos ayuda para repararla.'),
  -- 13 Desarrollo social
  (13,'El comedor comunitario de {barrio} necesita más alimentos','El comedor de {barrio} atiende cada vez a más familias y no alcanzan los alimentos. Pedimos refuerzo de la asistencia alimentaria.'),
  -- 14 Niñez y adolescencia
  (14,'Pedimos un espacio de apoyo escolar en {barrio}','Muchos chicos de {barrio} no tienen dónde hacer la tarea ni quién los ayude. Pedimos un espacio de apoyo escolar por la tarde.'),
  -- 15 Adultos mayores
  (15,'Adultos mayores de {barrio} sin centro de jubilados','En {barrio} no hay ningún centro de jubilados. Pedimos un espacio de encuentro y actividades para adultos mayores.'),
  -- 16 Género y diversidad
  (16,'Pedimos un punto de atención por violencia de género en {barrio}','En {barrio} no hay ningún lugar cercano donde recibir orientación ante situaciones de violencia de género.');

  -- -------------------------------------------------------------------
  -- 2. Vecinos ficticios (sin contraseña: no pueden iniciar sesión)
  -- -------------------------------------------------------------------
  for i in 1..300 loop
    uid := ('de300000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid;
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                            confirmation_token, recovery_token, email_change_token_new, email_change,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'vecino' || lpad(i::text, 3, '0') || '@demo.ents.invalid', '', now(),
            '', '', '', '',
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('nombre', nombres[1 + floor(random() * 50)::int], 'apellido', apellidos[1 + floor(random() * 50)::int]),
            now() - (random() * 75 || ' days')::interval, now());
    usuarios := usuarios || uid;
  end loop;

  -- Avatares predefinidos para la mitad
  update public.profiles set avatar_url = 'preset:' || floor(random() * 8)::int
  where id = any (usuarios) and random() < 0.5;

  -- Un funcionario por área y dos moderadores
  for area in select id from public.areas order by id loop
    uid := usuarios[290 - area::int];
    update public.profiles
    set rol = 'funcionario', area_id = area,
        cargo = 'Coordinador/a de ' || (select nombre from public.areas where id = area),
        organizacion = 'Municipalidad de Córdoba'
    where id = uid;
    funcionarios := funcionarios || uid;
  end loop;
  update public.profiles set rol = 'moderador' where id in (usuarios[299], usuarios[300]);
  moderador := usuarios[300];

  -- Barrios seguidos
  insert into public.barrios_seguidos (usuario_id, zona_id)
  select u, barrios[1 + floor(random() * array_length(barrios, 1))::int]
  from unnest(usuarios) as u
  on conflict do nothing;

  -- -------------------------------------------------------------------
  -- 3. Peticiones, firmas y seguimiento
  -- -------------------------------------------------------------------
  etapas := array['recibida', 'en_revision', 'derivada', 'en_obra', 'resuelta'];

  for i in 1..200 loop
    v_cat := cats[1 + floor(random() * array_length(cats, 1))::int];
    select * into plantilla from plantillas pl where pl.cat = v_cat order by random() limit 1;
    zona := barrios[1 + floor(random() * array_length(barrios, 1))::int];
    select nombre into zona_nombre from public.zonas where id = zona;
    -- La calle, la esquina y la altura se sortean una vez: título y descripción coinciden
    calle := calles[1 + floor(random() * 30)::int];
    calle2 := calles[1 + floor(random() * 30)::int];
    altura := (100 + floor(random() * 40) * 100)::text;
    titulo := replace(replace(replace(replace(plantilla.titulo, '{barrio}', zona_nombre), '{calle}', calle), '{calle2}', calle2), '{n}', altura);
    descr := replace(replace(replace(replace(plantilla.descr, '{barrio}', zona_nombre), '{calle}', calle), '{calle2}', calle2), '{n}', altura);

    -- Estado: la mayoría publicadas; algunas pendientes (recientes) y rechazadas
    r := random();
    if i <= 14 then
      estado := 'pendiente';
      creada := now() - (random() * 4 || ' days')::interval;
    elsif i <= 22 then
      estado := 'rechazada';
      creada := now() - (5 + random() * 60 || ' days')::interval;
    else
      estado := 'publicada';
      -- Más peticiones recientes que antiguas
      creada := now() - ((power(random(), 1.6) * 68 + 1) || ' days')::interval;
    end if;

    insert into public.peticiones (usuario_id, titulo, descripcion, categoria_id, zona_id, estado, lat, lng, created_at, updated_at)
    select usuarios[1 + floor(random() * 280)::int], titulo, descr, v_cat, zona, estado,
           z.lat + (random() - 0.5) * 0.012, z.lng + (random() - 0.5) * 0.014, creada, creada
    from public.zonas z where z.id = zona
    returning id into pid;

    continue when estado <> 'publicada';

    -- Firmas: pocas peticiones juntan mucho apoyo, la mayoría poco
    r := random();
    meta := case
      when r < 0.08 then 60 + floor(random() * 150)::int   -- máxima (elevadas)
      when r < 0.30 then 20 + floor(random() * 30)::int    -- alta
      when r < 0.55 then 10 + floor(random() * 10)::int    -- media
      when r < 0.80 then 5 + floor(random() * 5)::int      -- baja
      else floor(random() * 5)::int                        -- nueva
    end;

    insert into public.firmas (peticion_id, usuario_id, created_at)
    select pid, u, creada + (power(random(), 0.7) * (now() - creada))
    from unnest(usuarios[1:280]) as u
    order by random()
    limit meta;

    -- Seguimiento: las más apoyadas y antiguas avanzan más
    n := least(5, 1 + floor(random() * 2 + meta / 45.0 + extract(epoch from now() - creada) / 86400 / 35)::int);
    area := (select c.area_id from public.categorias c where c.id = v_cat);
    uid := (select p.id from public.profiles p where p.id = any (funcionarios) and p.area_id = area limit 1);

    for j in 2..n loop
      insert into public.peticion_actualizaciones (peticion_id, autor_id, estado, mensaje, created_at)
      values (pid, uid, etapas[j],
        case etapas[j]
          when 'en_revision' then 'Recibimos el reclamo y el área lo está analizando. Vamos a relevar la zona en los próximos días.'
          when 'derivada' then 'Se derivó al equipo técnico responsable, que ya tiene el caso en su agenda de trabajo.'
          when 'en_obra' then 'Comenzaron los trabajos en el lugar. Estimamos terminarlos en las próximas dos semanas.'
          when 'resuelta' then 'Los trabajos finalizaron y el problema quedó resuelto. Gracias a los vecinos por el aviso y el seguimiento.'
        end,
        creada + ((now() - creada) * (j - 1) / 5.0) + (random() * 6 || ' hours')::interval);
    end loop;

    if n > 1 then
      update public.peticiones set seguimiento = etapas[n] where id = pid;
    end if;
  end loop;

  -- -------------------------------------------------------------------
  -- 4. Comentarios
  -- -------------------------------------------------------------------
  insert into public.comentarios (peticion_id, usuario_id, texto, created_at)
  select p.id,
         usuarios[1 + floor(random() * 280)::int],
         (array[
           'Pasa lo mismo en mi cuadra, ojalá lo solucionen pronto.',
           'Firmé. Es un problema que tenemos hace mucho tiempo.',
           'Ayer volvió a pasar, saqué fotos por si sirven.',
           'Gracias por publicarlo, nadie nos daba respuesta.',
           'Hablé con otros vecinos y todos están de acuerdo.',
           'Es peligroso sobre todo para los chicos y los adultos mayores.',
           'Esto se agrava cada vez que llueve.',
           'Sumemos firmas para que llegue al municipio.',
           'Ya lo reclamamos por teléfono y no hubo respuesta.',
           'Vi que empezaron a trabajar en la zona, buena noticia.',
           'Muy importante, hay que darle prioridad.',
           'Compartí la petición en el grupo del barrio.',
           'Yo paso todos los días por ahí y está cada vez peor.',
           'Gracias al área por responder, se nota el cambio.'
         ])[1 + floor(random() * 14)::int],
         p.created_at + (random() * (now() - p.created_at))
  from public.peticiones p
  cross join generate_series(1, 4) g
  where p.usuario_id = any (usuarios) and p.estado = 'publicada' and random() < least(0.9, 0.2 + p.firmas_count / 60.0);

  -- -------------------------------------------------------------------
  -- 5. Muro vecinal
  -- -------------------------------------------------------------------
  insert into public.publicaciones (usuario_id, tipo, contenido, zona_id, created_at)
  select usuarios[1 + floor(random() * 280)::int], t.tipo,
         replace(t.texto, '{barrio}', z.nombre), z.id,
         now() - (random() * 40 || ' days')::interval
  from generate_series(1, 120) g
  cross join lateral (select barrios[1 + floor(random() * array_length(barrios, 1) + g * 0)::int] as zona) b
  join public.zonas z on z.id = b.zona
  cross join lateral (
    select * from (values
      ('positivo', 'Ayer arreglaron la luminaria de la esquina en {barrio}. ¡Gracias a quienes firmaron!'),
      ('positivo', 'Este sábado hacemos limpieza de la plaza de {barrio}. Traigan guantes y bolsas.'),
      ('positivo', 'Volvió a pasar el camión de residuos en {barrio}. Se nota la diferencia.'),
      ('positivo', 'Inauguraron la nueva senda peatonal frente a la escuela de {barrio}.'),
      ('positivo', 'La feria de emprendedores de {barrio} fue un éxito, gracias a todos por venir.'),
      ('positivo', 'Plantamos 15 árboles en {barrio} con los chicos del barrio.'),
      ('negativo', 'Otra vez sin agua en {barrio} desde la mañana.'),
      ('negativo', 'Robaron en una casa de {barrio} anoche. Cuidémonos entre todos.'),
      ('negativo', 'El baldío de {barrio} volvió a llenarse de basura.'),
      ('negativo', 'Cuidado: hay un pozo grande sin señalizar en una calle de {barrio}.'),
      ('negativo', 'Se cortó la luz en media {barrio}, ¿a alguien más le pasa?'),
      ('positivo', 'Gracias a los vecinos de {barrio} que ayudaron a encontrar al perro perdido.')
    ) v(tipo, texto)
    order by random() + g * 0 limit 1
  ) t;

  -- -------------------------------------------------------------------
  -- 6. Eventos próximos
  -- -------------------------------------------------------------------
  insert into public.eventos (titulo, descripcion, fecha, lugar, zona_id, creado_por)
  select e.titulo, e.descr,
         (date_trunc('day', now() at time zone 'America/Argentina/Cordoba') + ((e.dias || ' days')::interval) + ((e.hora || ' hours')::interval)) at time zone 'America/Argentina/Cordoba',
         e.lugar, e.zona, moderador
  from (values
    ('Jornada de limpieza de la costanera', 'Juntamos residuos a lo largo del río Suquía. Hay guantes y bolsas para todos.', 3, 9, 'Costanera, puente Centenario', 3::bigint),
    ('Campaña de vacunación antirrábica', 'Vacunación gratuita para perros y gatos. Llevar la libreta si la tienen.', 5, 10, 'Plaza principal', 8::bigint),
    ('Reunión de vecinos por la seguridad', 'Encuentro para organizar alarmas comunitarias y pedir patrullaje.', 6, 19, 'Centro vecinal', 12::bigint),
    ('Feria de emprendedores del barrio', 'Productos regionales, artesanías y comida casera de vecinos.', 8, 11, 'Plaza del barrio', 2::bigint),
    ('Taller de compostaje domiciliario', 'Aprendé a separar residuos orgánicos y hacer compost en tu casa.', 9, 17, 'Biblioteca popular', 5::bigint),
    ('Castración gratuita de mascotas', 'Turnos por orden de llegada. Las mascotas deben ir en ayunas.', 11, 8, 'Centro de salud', 22::bigint),
    ('Torneo de fútbol infantil', 'Torneo para chicos de 8 a 12 años. Inscripción en el lugar.', 13, 15, 'Polideportivo', 7::bigint),
    ('Charla sobre prevención del dengue', 'Cómo eliminar criaderos de mosquitos en casa y en el barrio.', 14, 18, 'Escuela del barrio', 21::bigint),
    ('Plantación de árboles en la plaza', 'Sumate a plantar árboles nativos. Traé tu pala si tenés.', 16, 10, 'Plaza central', 107::bigint),
    ('Encuentro de adultos mayores', 'Merienda, música y actividades para jubilados del barrio.', 18, 16, 'Centro de jubilados', 9::bigint),
    ('Operativo de documentación', 'Trámites de DNI y partidas sin turno previo.', 20, 9, 'Centro vecinal', 54::bigint),
    ('Cine al aire libre en la plaza', 'Película familiar con pochoclos a cargo de la comisión vecinal.', 22, 20, 'Plaza del barrio', 1::bigint),
    ('Jornada de salud integral', 'Controles de presión, glucemia y vacunación de calendario.', 25, 9, 'Dispensario', 15::bigint),
    ('Asamblea por el transporte nocturno', 'Reunión para presentar el pedido de más frecuencias nocturnas.', 28, 19, 'Club del barrio', 11::bigint),
    ('Festival solidario de primavera', 'Música en vivo y colecta de alimentos para el comedor comunitario.', 33, 17, 'Plaza principal', 104::bigint)
  ) e(titulo, descr, dias, hora, lugar, zona);

  -- -------------------------------------------------------------------
  -- 7. Ajustes finales
  -- -------------------------------------------------------------------
  -- La elevación queda registrada en la fecha de la firma número 50
  update public.peticiones p
  set elevada_at = (select f.created_at from public.firmas f where f.peticion_id = p.id order by f.created_at offset 49 limit 1)
  where p.usuario_id = any (usuarios) and p.elevada_at is not null;

  -- Recalcular el score con todas las firmas ya cargadas
  update public.peticiones set updated_at = updated_at where usuario_id = any (usuarios);

  -- Los avisos de la carga no deben llenar la campana de las cuentas reales
  delete from public.notificaciones nt
  where not (nt.usuario_id = any (usuarios))
    and nt.peticion_id in (select id from public.peticiones where usuario_id = any (usuarios));

  -- Las peticiones de prueba sin sentido (o con contenido ofensivo) se ocultan
  update public.peticiones set estado = 'rechazada' where id in (32, 33, 34, 37);
  -- (ocultarlas no debe avisarles a sus autores)
  delete from public.notificaciones where peticion_id in (32, 33, 34, 37) and tipo = 'rechazada' and created_at > now() - interval '1 hour';
end;
$$;
