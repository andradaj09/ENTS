-- ==========================================================
-- ENTS — Everyone Needs To Smile
-- Esquema completo de la base de datos.
--
-- Ya está aplicado en el proyecto de Supabase (migraciones:
-- esquema_inicial_ents, funciones_auxiliares_privadas,
-- optimizar_politicas_e_indices, fotos_en_peticiones,
-- admins_borran_fotos_de_peticiones). Este archivo es la versión final
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
