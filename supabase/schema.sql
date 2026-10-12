-- ==========================================================
-- ENTS — Everyone Needs To Smile
-- Esquema completo de la base de datos.
--
-- Ya está aplicado en el proyecto de Supabase (migraciones:
-- esquema_inicial_ents, funciones_auxiliares_privadas,
-- optimizar_politicas_e_indices, fotos_en_peticiones,
-- admins_borran_fotos_de_peticiones, roles_y_anonimato,
-- anonimato_total_y_vista_admin, perfil_desde_google,
-- estadisticas_y_categorias, mas_barrios_cordoba_y_villa_allende).
-- Este archivo es la versión final
-- consolidada, para recrear la base en otro proyecto:
-- Supabase → SQL Editor → New query → pegar todo → Run.
-- ==========================================================


-- ----------------------------------------------------------
-- 1. Perfiles (uno por cada usuario registrado)
-- ----------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null default '',
  apellido text not null default '',
  rol text not null default 'ciudadano' check (rol in ('ciudadano', 'admin')),
  -- URL de Storage o avatar predefinido ("preset:0" a "preset:7")
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Crea el perfil automáticamente al registrarse, con el nombre y apellido
-- que la app envía en los metadatos del registro
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nombre, apellido)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', ''),
    coalesce(new.raw_user_meta_data ->> 'apellido', '')
  );
  return new;
end;
$$;

drop trigger if exists al_registrar_usuario on auth.users;
create trigger al_registrar_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo_usuario();

-- La función del registro solo la usa el trigger: nadie la llama por la API
revoke execute on function public.crear_perfil_nuevo_usuario() from public, anon, authenticated;

-- ¿El usuario actual es administrador? (se usa en los permisos).
-- Vive en un esquema que la API no expone, así no se puede llamar desde afuera.
create schema if not exists privado;

create or replace function privado.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and rol = 'admin'
  );
$$;

grant usage on schema privado to authenticated;
revoke execute on function privado.es_admin() from public, anon;
grant execute on function privado.es_admin() to authenticated;


-- ----------------------------------------------------------
-- 2. Categorías y barrios
-- ----------------------------------------------------------

create table if not exists public.categorias (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  activa boolean not null default true
);

create table if not exists public.zonas (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  activa boolean not null default true,
  -- Centro aproximado del barrio (para el mapa vecinal)
  lat double precision,
  lng double precision
);


-- ----------------------------------------------------------
-- 3. Peticiones y firmas
-- ----------------------------------------------------------

create table if not exists public.peticiones (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  titulo text not null check (char_length(titulo) between 1 and 200),
  descripcion text not null,
  categoria_id bigint not null references public.categorias (id),
  zona_id bigint not null references public.zonas (id),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'publicada', 'rechazada')),
  score_urgencia numeric not null default 0 check (score_urgencia between 0 and 100),
  -- Ubicación exacta marcada al crear la petición (opcional)
  lat double precision,
  lng double precision,
  -- Hasta 3 fotos: rutas dentro del bucket "peticiones" (<usuario>/<archivo>.jpg)
  fotos text[] not null default '{}' check (cardinality(fotos) <= 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists peticiones_estado_idx on public.peticiones (estado, created_at desc);
create index if not exists peticiones_usuario_idx on public.peticiones (usuario_id);
create index if not exists peticiones_categoria_idx on public.peticiones (categoria_id);
create index if not exists peticiones_zona_idx on public.peticiones (zona_id);

create table if not exists public.firmas (
  id bigint generated always as identity primary key,
  peticion_id bigint not null references public.peticiones (id) on delete cascade,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Una sola firma por persona en cada petición
  unique (peticion_id, usuario_id)
);

create index if not exists firmas_peticion_idx on public.firmas (peticion_id);
create index if not exists firmas_usuario_idx on public.firmas (usuario_id);


-- ----------------------------------------------------------
-- 4. Eventos vecinales
-- ----------------------------------------------------------

create table if not exists public.eventos (
  id bigint generated always as identity primary key,
  titulo text not null check (char_length(titulo) between 1 and 200),
  descripcion text,
  fecha timestamptz not null,
  lugar text not null,
  zona_id bigint references public.zonas (id),
  creado_por uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists eventos_fecha_idx on public.eventos (fecha);
create index if not exists eventos_creado_por_idx on public.eventos (creado_por);
create index if not exists eventos_zona_idx on public.eventos (zona_id);


-- ----------------------------------------------------------
-- 5. Feed de la comunidad
-- ----------------------------------------------------------

create table if not exists public.publicaciones (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  tipo text not null check (tipo in ('positivo', 'negativo')),
  contenido text not null check (char_length(contenido) between 1 and 500),
  zona_id bigint references public.zonas (id),
  created_at timestamptz not null default now()
);

create index if not exists publicaciones_created_at_idx on public.publicaciones (created_at desc);
create index if not exists publicaciones_usuario_idx on public.publicaciones (usuario_id);
create index if not exists publicaciones_zona_idx on public.publicaciones (zona_id);


-- ==========================================================
-- 6. Permisos (Row Level Security)
--    (select auth.uid()) y (select privado.es_admin()) se evalúan
--    una sola vez por consulta en lugar de una vez por fila.
-- ==========================================================

alter table public.profiles enable row level security;
alter table public.categorias enable row level security;
alter table public.zonas enable row level security;
alter table public.peticiones enable row level security;
alter table public.firmas enable row level security;
alter table public.eventos enable row level security;
alter table public.publicaciones enable row level security;

-- ---------- Perfiles ----------

drop policy if exists "Perfiles visibles para usuarios registrados" on public.profiles;
create policy "Perfiles visibles para usuarios registrados"
  on public.profiles for select to authenticated
  using (true);

drop policy if exists "Usuarios editan su perfil" on public.profiles;
create policy "Usuarios editan su perfil"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Cada usuario puede cambiar SOLO su nombre, apellido y foto: nunca su rol
revoke update on public.profiles from anon, authenticated;
grant update (nombre, apellido, avatar_url) on public.profiles to authenticated;

-- ---------- Categorías y barrios ----------
-- Lectura para todos; escritura solo admins (una política por acción)

drop policy if exists "Categorías visibles" on public.categorias;
create policy "Categorías visibles"
  on public.categorias for select to authenticated
  using (true);

drop policy if exists "Admins crean categorías" on public.categorias;
create policy "Admins crean categorías" on public.categorias for insert to authenticated
  with check ((select privado.es_admin()));

drop policy if exists "Admins editan categorías" on public.categorias;
create policy "Admins editan categorías" on public.categorias for update to authenticated
  using ((select privado.es_admin())) with check ((select privado.es_admin()));

drop policy if exists "Admins borran categorías" on public.categorias;
create policy "Admins borran categorías" on public.categorias for delete to authenticated
  using ((select privado.es_admin()));

drop policy if exists "Barrios visibles" on public.zonas;
create policy "Barrios visibles"
  on public.zonas for select to authenticated
  using (true);

drop policy if exists "Admins crean barrios" on public.zonas;
create policy "Admins crean barrios" on public.zonas for insert to authenticated
  with check ((select privado.es_admin()));

drop policy if exists "Admins editan barrios" on public.zonas;
create policy "Admins editan barrios" on public.zonas for update to authenticated
  using ((select privado.es_admin())) with check ((select privado.es_admin()));

drop policy if exists "Admins borran barrios" on public.zonas;
create policy "Admins borran barrios" on public.zonas for delete to authenticated
  using ((select privado.es_admin()));

-- ---------- Peticiones ----------

-- Se ven las publicadas, las propias (en cualquier estado) y todas si sos admin
drop policy if exists "Ver peticiones" on public.peticiones;
create policy "Ver peticiones"
  on public.peticiones for select to authenticated
  using (
    estado = 'publicada'
    or usuario_id = (select auth.uid())
    or (select privado.es_admin())
  );

-- Se crean siempre pendientes de revisión, con urgencia 0
-- y con fotos que estén en la carpeta del propio usuario
drop policy if exists "Crear peticiones propias" on public.peticiones;
create policy "Crear peticiones propias"
  on public.peticiones for insert to authenticated
  with check (
    usuario_id = (select auth.uid())
    and estado = 'pendiente'
    and score_urgencia = 0
    and not exists (
      select 1 from unnest(fotos) as foto
      where foto not like (select auth.uid())::text || '/%'
    )
  );

-- Solo los administradores moderan (publicar / rechazar)
drop policy if exists "Admins moderan peticiones" on public.peticiones;
create policy "Admins moderan peticiones"
  on public.peticiones for update to authenticated
  using ((select privado.es_admin()))
  with check ((select privado.es_admin()));

drop policy if exists "Admins borran peticiones" on public.peticiones;
create policy "Admins borran peticiones"
  on public.peticiones for delete to authenticated
  using ((select privado.es_admin()));

-- ---------- Firmas ----------

drop policy if exists "Ver firmas" on public.firmas;
create policy "Ver firmas"
  on public.firmas for select to authenticated
  using (true);

-- Solo se firma con la propia cuenta y solo peticiones publicadas
drop policy if exists "Firmar peticiones publicadas" on public.firmas;
create policy "Firmar peticiones publicadas"
  on public.firmas for insert to authenticated
  with check (
    usuario_id = (select auth.uid())
    and exists (
      select 1 from public.peticiones
      where peticiones.id = peticion_id and peticiones.estado = 'publicada'
    )
  );

drop policy if exists "Retirar firma propia" on public.firmas;
create policy "Retirar firma propia"
  on public.firmas for delete to authenticated
  using (usuario_id = (select auth.uid()));

-- ---------- Eventos ----------

drop policy if exists "Ver eventos" on public.eventos;
create policy "Ver eventos"
  on public.eventos for select to authenticated
  using (true);

drop policy if exists "Admins crean eventos" on public.eventos;
create policy "Admins crean eventos"
  on public.eventos for insert to authenticated
  with check ((select privado.es_admin()) and creado_por = (select auth.uid()));

drop policy if exists "Admins borran eventos" on public.eventos;
create policy "Admins borran eventos"
  on public.eventos for delete to authenticated
  using ((select privado.es_admin()));

-- ---------- Publicaciones ----------

drop policy if exists "Ver publicaciones" on public.publicaciones;
create policy "Ver publicaciones"
  on public.publicaciones for select to authenticated
  using (true);

drop policy if exists "Publicar con la propia cuenta" on public.publicaciones;
create policy "Publicar con la propia cuenta"
  on public.publicaciones for insert to authenticated
  with check (usuario_id = (select auth.uid()));

drop policy if exists "Autor o admin borran publicaciones" on public.publicaciones;
create policy "Autor o admin borran publicaciones"
  on public.publicaciones for delete to authenticated
  using (usuario_id = (select auth.uid()) or (select privado.es_admin()));


-- ==========================================================
-- 7. Archivos (Storage): fotos de perfil y de peticiones
-- ==========================================================

-- Bucket público: máximo 2 MB, solo imágenes
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Cada usuario sube, reemplaza y borra archivos solo en su carpeta: avatares/<su id>/...
drop policy if exists "Usuarios suben su avatar" on storage.objects;
create policy "Usuarios suben su avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Usuarios actualizan su avatar" on storage.objects;
create policy "Usuarios actualizan su avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Usuarios borran su avatar" on storage.objects;
create policy "Usuarios borran su avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ---------- Fotos de peticiones ----------

-- Bucket público: máximo 3 MB por foto (se comprimen en el navegador)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('peticiones', 'peticiones', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Cada usuario sube fotos solo en su carpeta: peticiones/<su id>/...
drop policy if exists "Usuarios suben fotos de peticiones" on storage.objects;
create policy "Usuarios suben fotos de peticiones"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'peticiones'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- El autor borra las suyas; un admin, las de cualquier petición que elimine
drop policy if exists "Autor o admin borran fotos de peticiones" on storage.objects;
create policy "Autor o admin borran fotos de peticiones"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'peticiones'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select privado.es_admin())
    )
  );


-- ==========================================================
-- 8. Datos iniciales: categorías y barrios de Córdoba
--    (configuración necesaria para crear peticiones; no son casos de ejemplo)
-- ==========================================================

insert into public.categorias (nombre) values
  ('Salud'),
  ('Seguridad'),
  ('Vivienda'),
  ('Educación'),
  ('Ambiente'),
  ('Infraestructura'),
  ('Transporte'),
  ('Servicios públicos')
on conflict (nombre) do nothing;

-- Coordenadas aproximadas del centro de cada barrio
insert into public.zonas (nombre, lat, lng) values
  ('Centro', -31.4167, -64.1833),
  ('Nueva Córdoba', -31.4262, -64.1874),
  ('General Paz', -31.4105, -64.1646),
  ('Alberdi', -31.4084, -64.2048),
  ('Güemes', -31.4288, -64.1958),
  ('Observatorio', -31.4205, -64.1985),
  ('Alta Córdoba', -31.3934, -64.1795),
  ('San Vicente', -31.4221, -64.1502),
  ('Villa Cabrera', -31.3812, -64.2047),
  ('Cerro de las Rosas', -31.3685, -64.2330),
  ('Argüello', -31.3470, -64.2600),
  ('Barrio Jardín', -31.4530, -64.1890)
on conflict (nombre) do nothing;


-- ==========================================================
-- 9. Roles y anonimato
--    Todas las personas son anónimas entre sí: la API no expone quién
--    crea una petición, quién la firma ni quién publica en el feed.
--    - Funcionarios aprobados: ven autor y firmantes de cada petición.
--    - Administradores: ven toda la información (incluido el correo).
--    Esta sección reemplaza las políticas de lectura de perfiles,
--    firmas y publicaciones definidas más arriba.
-- ==========================================================

-- Roles: ciudadano (vecino), funcionario (lo aprueba un admin) y admin
alter table public.profiles drop constraint if exists profiles_rol_check;
alter table public.profiles add constraint profiles_rol_check
  check (rol in ('ciudadano', 'funcionario', 'admin'));

alter table public.profiles
  add column if not exists rol_solicitado text check (rol_solicitado in ('funcionario')),
  add column if not exists cargo text check (char_length(cargo) <= 120),
  add column if not exists organizacion text check (char_length(organizacion) <= 120);

-- El registro guarda la solicitud de funcionario; el rol sigue siendo
-- "ciudadano" hasta que un admin la apruebe
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nombre, apellido, rol_solicitado, cargo, organizacion)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', ''),
    coalesce(new.raw_user_meta_data ->> 'apellido', ''),
    case when new.raw_user_meta_data ->> 'tipo_cuenta' = 'funcionario' then 'funcionario' end,
    left(nullif(trim(new.raw_user_meta_data ->> 'cargo'), ''), 120),
    left(nullif(trim(new.raw_user_meta_data ->> 'organizacion'), ''), 120)
  );
  return new;
end;
$$;

create or replace function privado.puede_ver_identidades()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and rol in ('funcionario', 'admin')
  );
$$;

revoke execute on function privado.puede_ver_identidades() from public, anon;
grant execute on function privado.puede_ver_identidades() to authenticated;

-- Perfiles: cada uno ve el suyo; los admins ven todos
drop policy if exists "Perfiles visibles para usuarios registrados" on public.profiles;
drop policy if exists "Ver perfiles" on public.profiles;
create policy "Ver perfiles"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select privado.es_admin()));

-- Conteo público de firmas (las firmas individuales son privadas)
alter table public.peticiones
  add column if not exists firmas_count integer not null default 0 check (firmas_count >= 0);

create or replace function privado.actualizar_conteo_firmas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.peticiones set firmas_count = firmas_count + 1 where id = new.peticion_id;
    return new;
  end if;

  update public.peticiones set firmas_count = greatest(firmas_count - 1, 0) where id = old.peticion_id;
  return old;
end;
$$;

revoke execute on function privado.actualizar_conteo_firmas() from public, anon, authenticated;

drop trigger if exists contar_firmas on public.firmas;
create trigger contar_firmas
  after insert or delete on public.firmas
  for each row execute function privado.actualizar_conteo_firmas();

drop policy if exists "Ver firmas" on public.firmas;
create policy "Ver firmas"
  on public.firmas for select to authenticated
  using (usuario_id = (select auth.uid()) or (select privado.puede_ver_identidades()));

-- La columna del autor (usuario_id) no se expone en peticiones ni publicaciones
revoke select on public.peticiones from anon, authenticated;
grant select (
  id, titulo, descripcion, categoria_id, zona_id, estado, score_urgencia,
  lat, lng, fotos, firmas_count, created_at, updated_at
) on public.peticiones to authenticated;

revoke select on public.publicaciones from anon, authenticated;
grant select (id, tipo, contenido, zona_id, created_at) on public.publicaciones to authenticated;

drop policy if exists "Crear peticiones propias" on public.peticiones;
create policy "Crear peticiones propias"
  on public.peticiones for insert to authenticated
  with check (
    usuario_id = (select auth.uid())
    and estado = 'pendiente'
    and score_urgencia = 0
    and firmas_count = 0
    and not exists (
      select 1 from unnest(fotos) as foto
      where foto not like (select auth.uid())::text || '/%'
    )
  );

-- ---------- Funciones de lectura (cada una verifica quién llama) ----------
-- El asesor de Supabase las marca como "security definer ejecutables por
-- usuarios": es intencional, porque reemplazan a las columnas ocultas y
-- cada una filtra por el usuario de la sesión o exige el rol necesario.

create or replace function public.mis_peticiones()
returns setof public.peticiones
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.peticiones
  where usuario_id = auth.uid()
  order by created_at desc;
$$;

create or replace function public.peticiones_pendientes()
returns setof public.peticiones
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.peticiones
  where estado = 'pendiente' and privado.es_admin()
  order by created_at desc;
$$;

create or replace function public.mis_notificaciones()
returns table (id text, tipo text, peticion_id bigint, titulo text, fecha timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select * from (
    select 'estado-' || p.id, p.estado, p.id, p.titulo, coalesce(p.updated_at, p.created_at)
    from public.peticiones p
    where p.usuario_id = auth.uid() and p.estado in ('publicada', 'rechazada')
    union all
    select 'firma-' || f.id, 'firma', p.id, p.titulo, f.created_at
    from public.firmas f
    join public.peticiones p on p.id = f.peticion_id
    where p.usuario_id = auth.uid() and f.usuario_id <> auth.uid()
  ) as n (id, tipo, peticion_id, titulo, fecha)
  order by fecha desc
  limit 60;
$$;

create or replace function public.mis_publicaciones_ids()
returns setof bigint
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.publicaciones where usuario_id = auth.uid();
$$;

-- Autor y firmantes de una petición: funcionarios y admins; el correo, solo admins
create or replace function public.identidades_peticion(p_peticion bigint)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  ver_correo boolean := privado.es_admin();
begin
  if not privado.puede_ver_identidades() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  return json_build_object(
    'autor', (
      select json_build_object(
        'nombre', pr.nombre,
        'apellido', pr.apellido,
        'avatar_url', pr.avatar_url,
        'email', case when ver_correo then u.email end
      )
      from public.peticiones p
      join public.profiles pr on pr.id = p.usuario_id
      join auth.users u on u.id = p.usuario_id
      where p.id = p_peticion
    ),
    'firmantes', coalesce((
      select json_agg(
        json_build_object(
          'nombre', pr.nombre,
          'apellido', pr.apellido,
          'avatar_url', pr.avatar_url,
          'email', case when ver_correo then u.email end,
          'fecha', f.created_at
        )
        order by f.created_at desc
      )
      from public.firmas f
      join public.profiles pr on pr.id = f.usuario_id
      join auth.users u on u.id = f.usuario_id
      where f.peticion_id = p_peticion
    ), '[]'::json)
  );
end;
$$;

-- Autores del feed con su correo (solo admins)
create or replace function public.autores_publicaciones()
returns table (publicacion_id bigint, nombre text, apellido text, avatar_url text, email text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not privado.es_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  return query
    select pu.id, pr.nombre, pr.apellido, pr.avatar_url, u.email::text
    from public.publicaciones pu
    join public.profiles pr on pr.id = pu.usuario_id
    join auth.users u on u.id = pu.usuario_id;
end;
$$;

-- Directorio completo de usuarios (solo admins)
create or replace function public.usuarios_admin()
returns table (
  id uuid,
  nombre text,
  apellido text,
  email text,
  rol text,
  rol_solicitado text,
  cargo text,
  organizacion text,
  avatar_url text,
  registrado timestamptz,
  ultimo_ingreso timestamptz,
  correo_confirmado boolean,
  peticiones bigint,
  firmas bigint,
  publicaciones bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not privado.es_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  return query
    select
      pr.id, pr.nombre, pr.apellido, u.email::text, pr.rol, pr.rol_solicitado,
      pr.cargo, pr.organizacion, pr.avatar_url, u.created_at, u.last_sign_in_at,
      u.email_confirmed_at is not null,
      (select count(*) from public.peticiones p where p.usuario_id = pr.id),
      (select count(*) from public.firmas f where f.usuario_id = pr.id),
      (select count(*) from public.publicaciones pu where pu.usuario_id = pr.id)
    from public.profiles pr
    join auth.users u on u.id = pr.id
    order by u.created_at desc;
end;
$$;

-- Aprobar o rechazar la solicitud de funcionario (solo admins)
create or replace function public.resolver_solicitud_funcionario(p_usuario uuid, p_aprobar boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not privado.es_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  update public.profiles
  set rol = case when p_aprobar then 'funcionario' else rol end,
      rol_solicitado = null
  where id = p_usuario and rol <> 'admin';
end;
$$;

revoke execute on function public.mis_peticiones() from public, anon;
revoke execute on function public.peticiones_pendientes() from public, anon;
revoke execute on function public.mis_notificaciones() from public, anon;
revoke execute on function public.mis_publicaciones_ids() from public, anon;
revoke execute on function public.identidades_peticion(bigint) from public, anon;
revoke execute on function public.autores_publicaciones() from public, anon;
revoke execute on function public.usuarios_admin() from public, anon;
revoke execute on function public.resolver_solicitud_funcionario(uuid, boolean) from public, anon;

grant execute on function public.mis_peticiones() to authenticated;
grant execute on function public.peticiones_pendientes() to authenticated;
grant execute on function public.mis_notificaciones() to authenticated;
grant execute on function public.mis_publicaciones_ids() to authenticated;
grant execute on function public.identidades_peticion(bigint) to authenticated;
grant execute on function public.autores_publicaciones() to authenticated;
grant execute on function public.usuarios_admin() to authenticated;
grant execute on function public.resolver_solicitud_funcionario(uuid, boolean) to authenticated;


-- ==========================================================
-- 10. Ingreso con Google
--     El perfil se completa con los datos del formulario de registro o,
--     si la cuenta entra con Google, con su nombre y su foto.
--     (Reemplaza la función de la sección 9.)
-- ==========================================================

create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  datos jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  nombre_completo text := trim(coalesce(datos ->> 'full_name', datos ->> 'name', ''));
begin
  insert into public.profiles (id, nombre, apellido, avatar_url, rol_solicitado, cargo, organizacion)
  values (
    new.id,
    coalesce(
      nullif(trim(datos ->> 'nombre'), ''),
      nullif(trim(datos ->> 'given_name'), ''),
      nullif(split_part(nombre_completo, ' ', 1), ''),
      ''
    ),
    coalesce(
      nullif(trim(datos ->> 'apellido'), ''),
      nullif(trim(datos ->> 'family_name'), ''),
      nullif(trim(substr(nombre_completo, length(split_part(nombre_completo, ' ', 1)) + 1)), ''),
      ''
    ),
    nullif(coalesce(datos ->> 'avatar_url', datos ->> 'picture'), ''),
    case when datos ->> 'tipo_cuenta' = 'funcionario' then 'funcionario' end,
    left(nullif(trim(datos ->> 'cargo'), ''), 120),
    left(nullif(trim(datos ->> 'organizacion'), ''), 120)
  );
  return new;
end;
$$;


-- ----------------------------------------------------------
-- 11. Estadísticas (vecinos y administradores) y categorías nuevas
-- ----------------------------------------------------------

insert into public.categorias (nombre) values
  ('Animales'),
  ('Accesibilidad'),
  ('Espacios públicos'),
  ('Cultura y deporte'),
  ('Desarrollo social'),
  ('Niñez y adolescencia'),
  ('Adultos mayores'),
  ('Género y diversidad')
on conflict (nombre) do nothing;

-- Para todos los usuarios: solo agregados de peticiones publicadas y del muro.
-- No incluye ningún dato que identifique a una persona.
create or replace function public.estadisticas_publicas()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  with pub as (
    select * from public.peticiones where estado = 'publicada'
  )
  select json_build_object(
    'totales', json_build_object(
      'peticiones', (select count(*) from pub),
      'firmas', (select coalesce(sum(firmas_count), 0) from pub),
      'urgentes', (select count(*) from pub where score_urgencia >= 70),
      'barrios', (select count(distinct zona_id) from pub),
      'nuevas_semana', (select count(*) from pub where created_at > now() - interval '7 days'),
      'publicaciones', (select count(*) from public.publicaciones)
    ),
    'por_categoria', (
      select coalesce(json_agg(x order by x.cantidad desc, x.nombre), '[]'::json)
      from (
        select c.nombre, count(p.id) as cantidad, coalesce(sum(p.firmas_count), 0) as firmas
        from public.categorias c
        join pub p on p.categoria_id = c.id
        group by c.nombre
      ) x
    ),
    'por_barrio', (
      select coalesce(json_agg(x order by x.cantidad desc, x.nombre), '[]'::json)
      from (
        select z.id, z.nombre, count(p.id) as cantidad,
               coalesce(sum(p.firmas_count), 0) as firmas,
               round(coalesce(avg(p.score_urgencia), 0)) as urgencia_promedio
        from public.zonas z
        left join pub p on p.zona_id = z.id
        where z.activa
        group by z.id, z.nombre
      ) x
    ),
    'por_semana', (
      select json_agg(json_build_object('semana', s.semana, 'cantidad', (
        select count(*) from pub p
        where p.created_at >= s.semana and p.created_at < s.semana + interval '1 week'
      )) order by s.semana)
      from generate_series(
        date_trunc('week', now()) - interval '11 weeks',
        date_trunc('week', now()),
        interval '1 week'
      ) as s(semana)
    ),
    'urgencia', json_build_object(
      'alta', (select count(*) from pub where score_urgencia >= 70),
      'media', (select count(*) from pub where score_urgencia >= 40 and score_urgencia < 70),
      'baja', (select count(*) from pub where score_urgencia < 40)
    ),
    'feed', json_build_object(
      'positivo', (select count(*) from public.publicaciones where tipo = 'positivo'),
      'negativo', (select count(*) from public.publicaciones where tipo = 'negativo')
    )
  );
$$;

-- Solo administradores (lo verifica la propia función): incluye datos personales
create or replace function public.estadisticas_admin()
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not privado.es_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  return json_build_object(
    'usuarios', json_build_object(
      'total', (select count(*) from public.profiles),
      'vecinos', (select count(*) from public.profiles where rol = 'ciudadano'),
      'funcionarios', (select count(*) from public.profiles where rol = 'funcionario'),
      'admins', (select count(*) from public.profiles where rol = 'admin'),
      'solicitudes', (select count(*) from public.profiles where rol_solicitado = 'funcionario'),
      'activos_30d', (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'),
      'nuevos_semana', (select count(*) from auth.users where created_at > now() - interval '7 days'),
      'sin_actividad', (
        select count(*) from public.profiles pr
        where not exists (select 1 from public.peticiones p where p.usuario_id = pr.id)
          and not exists (select 1 from public.firmas f where f.usuario_id = pr.id)
          and not exists (select 1 from public.publicaciones pu where pu.usuario_id = pr.id)
      )
    ),
    'registros_por_semana', (
      select json_agg(json_build_object('semana', s.semana, 'cantidad', (
        select count(*) from auth.users u
        where u.created_at >= s.semana and u.created_at < s.semana + interval '1 week'
      )) order by s.semana)
      from generate_series(
        date_trunc('week', now()) - interval '11 weeks',
        date_trunc('week', now()),
        interval '1 week'
      ) as s(semana)
    ),
    'estados', json_build_object(
      'pendiente', (select count(*) from public.peticiones where estado = 'pendiente'),
      'publicada', (select count(*) from public.peticiones where estado = 'publicada'),
      'rechazada', (select count(*) from public.peticiones where estado = 'rechazada')
    ),
    'moderacion', json_build_object(
      'horas_promedio', (
        select round(avg(extract(epoch from (updated_at - created_at)) / 3600)::numeric, 1)
        from public.peticiones
        where estado in ('publicada', 'rechazada') and updated_at is not null
      ),
      'pendiente_mas_antigua', (
        select min(created_at) from public.peticiones where estado = 'pendiente'
      )
    ),
    'firmas_por_dia', (
      select json_agg(json_build_object('dia', d.dia, 'cantidad', (
        select count(*) from public.firmas f
        where f.created_at >= d.dia and f.created_at < d.dia + interval '1 day'
      )) order by d.dia)
      from generate_series(
        date_trunc('day', now()) - interval '29 days',
        date_trunc('day', now()),
        interval '1 day'
      ) as d(dia)
    ),
    'top_usuarios', (
      select coalesce(json_agg(x), '[]'::json)
      from (
        select pr.nombre, pr.apellido, u.email::text as email, pr.rol,
               (select count(*) from public.peticiones p where p.usuario_id = pr.id) as peticiones,
               (select count(*) from public.firmas f where f.usuario_id = pr.id) as firmas,
               (select count(*) from public.publicaciones pu where pu.usuario_id = pr.id) as publicaciones
        from public.profiles pr
        join auth.users u on u.id = pr.id
        order by 5 + 6 + 7 desc
        limit 8
      ) x
      where x.peticiones + x.firmas + x.publicaciones > 0
    ),
    'feed_por_barrio', (
      select coalesce(json_agg(x order by (x.positivo + x.negativo) desc), '[]'::json)
      from (
        select z.nombre,
               count(*) filter (where pu.tipo = 'positivo') as positivo,
               count(*) filter (where pu.tipo = 'negativo') as negativo
        from public.publicaciones pu
        join public.zonas z on z.id = pu.zona_id
        group by z.nombre
      ) x
    ),
    'pendientes_por_barrio', (
      select coalesce(json_agg(x order by x.cantidad desc), '[]'::json)
      from (
        select z.nombre, count(*) as cantidad
        from public.peticiones p
        join public.zonas z on z.id = p.zona_id
        where p.estado = 'pendiente'
        group by z.nombre
      ) x
    )
  );
end;
$$;

revoke execute on function public.estadisticas_publicas() from public, anon;
revoke execute on function public.estadisticas_admin() from public, anon;
grant execute on function public.estadisticas_publicas() to authenticated;
grant execute on function public.estadisticas_admin() to authenticated;

-- ----------------------------------------------------------
-- 12. Más barrios de Córdoba y de Villa Allende
-- (centros tomados de OpenStreetMap)
-- ----------------------------------------------------------

alter table public.zonas add column if not exists localidad text not null default 'Córdoba';

insert into public.zonas (nombre, lat, lng, localidad) values
  ('Alto Alberdi', -31.4061, -64.2214, 'Córdoba'),
  ('Pueyrredón', -31.4023, -64.1682, 'Córdoba'),
  ('Juniors', -31.4188, -64.1663, 'Córdoba'),
  ('Yofre Norte', -31.3837, -64.1338, 'Córdoba'),
  ('Yofre Sur', -31.3929, -64.1423, 'Córdoba'),
  ('Altamira', -31.4230, -64.1317, 'Córdoba'),
  ('Maldonado', -31.4142, -64.1327, 'Córdoba'),
  ('Müller', -31.4154, -64.1386, 'Córdoba'),
  ('Ciudad de Mis Sueños', -31.4788, -64.0860, 'Córdoba'),
  ('Villa El Libertador', -31.4768, -64.2200, 'Córdoba'),
  ('Comercial', -31.4852, -64.2112, 'Córdoba'),
  ('Parque Vélez Sarsfield', -31.4411, -64.2052, 'Córdoba'),
  ('Bella Vista', -31.4305, -64.2048, 'Córdoba'),
  ('Rogelio Martínez', -31.4374, -64.1782, 'Córdoba'),
  ('Las Flores', -31.4521, -64.1995, 'Córdoba'),
  ('Ciudad Universitaria', -31.4408, -64.1903, 'Córdoba'),
  ('Villa Revol', -31.4445, -64.1728, 'Córdoba'),
  ('Cofico', -31.4029, -64.1849, 'Córdoba'),
  ('Providencia', -31.4012, -64.2004, 'Córdoba'),
  ('Talleres Oeste', -31.3904, -64.1517, 'Córdoba'),
  ('Talleres Este', -31.3874, -64.1550, 'Córdoba'),
  ('Los Paraísos', -31.3823, -64.1945, 'Córdoba'),
  ('Villa Azalais', -31.3726, -64.1517, 'Córdoba'),
  ('Guiñazú', -31.3153, -64.1762, 'Córdoba'),
  ('Villa Esquiú', -31.3611, -64.1108, 'Córdoba'),
  ('Marqués de Sobremonte', -31.3617, -64.1982, 'Córdoba'),
  ('Poeta Lugones', -31.3610, -64.2120, 'Córdoba'),
  ('Urca', -31.3823, -64.2371, 'Córdoba'),
  ('Villa Belgrano', -31.3580, -64.2525, 'Córdoba'),
  ('Villa Warcalde', -31.3395, -64.2987, 'Córdoba'),
  ('Granja de Funes', -31.3482, -64.2458, 'Córdoba'),
  ('Valle Escondido', -31.3672, -64.2746, 'Córdoba'),
  ('Quebrada de las Rosas', -31.3932, -64.2557, 'Córdoba'),
  ('Las Palmas', -31.4048, -64.2400, 'Córdoba'),
  ('Villa Páez', -31.3954, -64.2069, 'Córdoba'),
  ('San Martín', -31.3873, -64.1988, 'Córdoba'),
  ('Villa Rivera Indarte', -31.3197, -64.2948, 'Córdoba'),
  ('Los Boulevares', -31.3449, -64.2322, 'Córdoba'),
  ('Jardín Espinosa', -31.4521, -64.1718, 'Córdoba'),
  ('Ituzaingó', -31.4659, -64.0944, 'Córdoba'),
  ('Empalme', -31.4331, -64.1297, 'Córdoba'),
  ('Ferreyra', -31.4625, -64.1059, 'Córdoba'),
  ('Residencial América', -31.3820, -64.1625, 'Córdoba'),
  ('Parque Liceo', -31.3585, -64.1522, 'Córdoba'),
  ('Villa Retiro', -31.3324, -64.1434, 'Córdoba'),
  ('Patricios', -31.3754, -64.1378, 'Córdoba'),
  ('Los Plátanos', -31.4177, -64.2303, 'Córdoba'),
  ('Mariano Fragueiro', -31.3680, -64.1859, 'Córdoba'),
  ('Parque Chacabuco', -31.3822, -64.2115, 'Córdoba'),
  ('Inaudi', -31.4768, -64.1926, 'Córdoba'),
  ('Los Olmos', -31.4589, -64.2171, 'Córdoba'),
  ('Crisol Norte', -31.4283, -64.1674, 'Córdoba'),
  ('Crisol Sur', -31.4344, -64.1676, 'Córdoba'),
  ('Villa Centenario', -31.3647, -64.2314, 'Córdoba'),
  ('Villa Siburu', -31.3953, -64.2286, 'Córdoba'),
  ('Paso de los Andes', -31.4161, -64.2035, 'Córdoba'),
  ('Marechal', -31.3953, -64.2137, 'Córdoba'),
  ('Ameghino Norte', -31.4295, -64.2381, 'Córdoba'),
  ('Las Margaritas', -31.3780, -64.2097, 'Córdoba'),
  ('General Bustos', -31.3888, -64.1722, 'Córdoba'),
  ('Villa Corina', -31.3741, -64.1454, 'Córdoba'),
  ('San Fernando', -31.4485, -64.1914, 'Córdoba'),
  ('Colinas de Vélez Sarsfield', -31.4383, -64.2000, 'Córdoba'),
  ('Parque Capital', -31.4334, -64.2176, 'Córdoba'),
  ('Jardín del Pilar', -31.4441, -64.1534, 'Córdoba'),
  ('Matienzo', -31.4403, -64.2390, 'Córdoba'),
  ('Zumarán', -31.3773, -64.2022, 'Córdoba'),
  ('Villa Allende Parque', -31.3121, -64.2832, 'Córdoba'),
  ('Arguello Norte', -31.3278, -64.2631, 'Córdoba'),
  ('Cerro Chico', -31.3669, -64.2240, 'Córdoba'),
  ('Los Naranjos', -31.4299, -64.2273, 'Córdoba'),
  ('Ayacucho', -31.3789, -64.1726, 'Córdoba'),
  ('Colón', -31.4369, -64.1548, 'Córdoba'),
  ('Bajo Palermo', -31.3861, -64.2227, 'Córdoba'),
  ('Hipólito Yrigoyen', -31.3721, -64.1863, 'Córdoba'),
  ('José Ignacio Díaz', -31.4468, -64.1453, 'Córdoba'),
  ('Coronel Olmedo', -31.4803, -64.1396, 'Córdoba'),
  ('Villa Avalos', -31.4134, -64.2444, 'Córdoba'),
  ('Primero de Mayo', -31.4303, -64.1186, 'Córdoba'),
  ('Acosta', -31.4243, -64.1247, 'Córdoba'),
  ('Los Gigantes', -31.3633, -64.1695, 'Córdoba'),
  ('Mirizzi', -31.4708, -64.2064, 'Córdoba'),
  ('Parque Horizonte', -31.4584, -64.2064, 'Córdoba'),
  ('Cárcano', -31.4652, -64.1450, 'Córdoba'),
  ('Smata', -31.4539, -64.2223, 'Córdoba'),
  ('Altos de Vélez Sarsfield', -31.4491, -64.2147, 'Córdoba'),
  ('Lomas de San Martín', -31.3824, -64.2059, 'Córdoba'),
  ('Villa Rivadavia', -31.5127, -64.1949, 'Córdoba'),
  ('Ampliación Residencial América', -31.3759, -64.1604, 'Córdoba'),
  ('Lomas Este', -31.2957, -64.2831, 'Villa Allende'),
  ('Lomas Oeste', -31.2945, -64.2881, 'Villa Allende'),
  ('Villa Allende Golf', -31.2793, -64.2818, 'Villa Allende'),
  ('Las Polinesias', -31.2912, -64.3126, 'Villa Allende'),
  ('Pan de Azúcar', -31.3031, -64.2747, 'Villa Allende'),
  ('San Alfonso', -31.3055, -64.2916, 'Villa Allende'),
  ('Cóndor Alto', -31.2785, -64.2965, 'Villa Allende'),
  ('Cóndor Bajo', -31.2822, -64.3002, 'Villa Allende'),
  ('Lomas Sur', -31.3045, -64.2801, 'Villa Allende'),
  ('Centro (Villa Allende)', -31.2936, -64.2977, 'Villa Allende')
on conflict (nombre) do nothing;

-- Centros más precisos (OpenStreetMap) para barrios que ya existían
update public.zonas set lat = -31.4235, lng = -64.1510 where nombre = 'San Vicente';
update public.zonas set lat = -31.3876, lng = -64.2116 where nombre = 'Villa Cabrera';
update public.zonas set lat = -31.3767, lng = -64.2341 where nombre = 'Cerro de las Rosas';
