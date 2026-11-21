-- ==========================================================
-- ENTS — Everyone Needs To Smile
-- Esquema completo de la base de datos.
--
-- Ya está aplicado en el proyecto de Supabase (migraciones:
-- esquema_inicial_ents, funciones_auxiliares_privadas,
-- optimizar_politicas_e_indices, fotos_en_peticiones,
-- admins_borran_fotos_de_peticiones, roles_y_anonimato,
-- anonimato_total_y_vista_admin, perfil_desde_google). Este archivo es la versión final
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
