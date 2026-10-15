-- =====================================================================
-- FitTracker · esquema inicial (MVP + v2 + v3)
-- Ejecutar completo en Supabase → SQL Editor → Run.
-- Todos los pesos se guardan en kg; la app convierte a lb al mostrar.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.unit_system   as enum ('kg', 'lb');
create type public.theme_pref    as enum ('system', 'light', 'dark');
create type public.accent_color  as enum ('volt', 'fire', 'aqua');
create type public.muscle_group  as enum (
  'chest', 'back', 'lower_back', 'traps', 'shoulders', 'biceps', 'triceps', 'forearms',
  'quads', 'hamstrings', 'glutes', 'adductors', 'calves', 'abs', 'obliques', 'full_body', 'cardio'
);
create type public.equipment_type as enum (
  'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band', 'smith_machine', 'ez_bar', 'other'
);
-- weight_reps: peso × reps · bodyweight_reps: reps con lastre opcional
-- time: segundos (plancha) · distance_time: distancia + tiempo (cinta, remo)
create type public.tracking_type as enum ('weight_reps', 'bodyweight_reps', 'time', 'distance_time');
create type public.set_type      as enum ('warmup', 'normal', 'drop', 'failure');
create type public.sport_type    as enum (
  'soccer', 'basketball', 'running', 'cycling', 'swimming', 'tennis', 'padel', 'volleyball',
  'boxing', 'martial_arts', 'crossfit', 'yoga', 'hiking', 'walking', 'climbing', 'dance', 'other'
);
create type public.pr_type       as enum ('weight', 'e1rm', 'reps');
create type public.photo_pose    as enum ('front', 'side', 'back', 'other');

-- ---------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Perfiles (uno por usuario de auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  display_name         text check (char_length(display_name) <= 60),
  avatar_url           text,
  unit_system          public.unit_system  not null default 'kg',
  theme                public.theme_pref   not null default 'system',
  accent               public.accent_color not null default 'volt',
  weekly_goal          smallint not null default 4 check (weekly_goal between 1 and 7),
  default_rest_seconds integer  not null default 90 check (default_rest_seconds between 0 and 900),
  height_cm            numeric(5,1) check (height_cm between 50 and 260),
  birth_date           date,
  timezone             text not null default 'America/Bogota',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crea el perfil automáticamente al registrarse (correo o Google)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ), 60),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Ejercicios (user_id null = catálogo global; con user_id = personalizado)
-- ---------------------------------------------------------------------
create table public.exercises (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid references auth.users (id) on delete cascade,
  slug                 text,
  name                 text not null check (char_length(name) between 1 and 80),
  primary_muscle       public.muscle_group   not null,
  secondary_muscles    public.muscle_group[] not null default '{}',
  equipment            public.equipment_type not null default 'other',
  tracking             public.tracking_type  not null default 'weight_reps',
  is_unilateral        boolean not null default false,
  default_rest_seconds integer check (default_rest_seconds between 0 and 900),
  instructions         text,
  archived             boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create unique index exercises_global_slug_key on public.exercises (slug) where user_id is null;
create index exercises_user_id_idx on public.exercises (user_id);

create trigger exercises_updated_at before update on public.exercises
  for each row execute function public.set_updated_at();

-- Preferencias por usuario sobre cualquier ejercicio (también los globales)
create table public.exercise_preferences (
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id  uuid not null references public.exercises (id) on delete cascade,
  is_favorite  boolean not null default false,
  rest_seconds integer check (rest_seconds between 0 and 900),
  rep_min      smallint check (rep_min between 1 and 100),
  rep_max      smallint check (rep_max between 1 and 100),
  note         text check (char_length(note) <= 500),
  updated_at   timestamptz not null default now(),
  primary key (user_id, exercise_id),
  check (rep_min is null or rep_max is null or rep_min <= rep_max)
);

create trigger exercise_preferences_updated_at before update on public.exercise_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Rutinas (plantillas)
-- ---------------------------------------------------------------------
create table public.routines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  description text check (char_length(description) <= 300),
  position    integer not null default 0,
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index routines_user_id_idx on public.routines (user_id, position);

create trigger routines_updated_at before update on public.routines
  for each row execute function public.set_updated_at();

create table public.routine_exercises (
  id             uuid primary key default gen_random_uuid(),
  routine_id     uuid not null references public.routines (id) on delete cascade,
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id    uuid not null references public.exercises (id) on delete restrict,
  position       integer  not null default 0,
  target_sets    smallint not null default 3 check (target_sets between 1 and 20),
  rep_min        smallint check (rep_min between 1 and 100),
  rep_max        smallint check (rep_max between 1 and 100),
  rest_seconds   integer  check (rest_seconds between 0 and 900),
  superset_group smallint,
  notes          text check (char_length(notes) <= 500),
  check (rep_min is null or rep_max is null or rep_min <= rep_max)
);

create index routine_exercises_routine_idx on public.routine_exercises (routine_id, position);

-- ---------------------------------------------------------------------
-- Sesiones de gimnasio
-- Los id los puede generar el teléfono (modo sin conexión): upserts idempotentes.
-- ---------------------------------------------------------------------
create table public.workouts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  routine_id uuid references public.routines (id) on delete set null,
  name       text not null default 'Entrenamiento' check (char_length(name) between 1 and 60),
  started_at timestamptz not null default now(),
  ended_at   timestamptz,
  notes      text check (char_length(notes) <= 1000),
  rating     smallint check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create index workouts_user_started_idx on public.workouts (user_id, started_at desc);

create trigger workouts_updated_at before update on public.workouts
  for each row execute function public.set_updated_at();

create table public.workout_exercises (
  id             uuid primary key default gen_random_uuid(),
  workout_id     uuid not null references public.workouts (id) on delete cascade,
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id    uuid not null references public.exercises (id) on delete restrict,
  position       integer not null default 0,
  superset_group smallint,
  notes          text check (char_length(notes) <= 500),
  created_at     timestamptz not null default now()
);

create index workout_exercises_workout_idx  on public.workout_exercises (workout_id, position);
create index workout_exercises_exercise_idx on public.workout_exercises (user_id, exercise_id);

-- user_id siempre se copia de la sesión padre (que RLS ya restringe al dueño)
create or replace function public.workout_exercises_fill_from_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  owner uuid;
begin
  select w.user_id into owner from public.workouts w where w.id = new.workout_id;
  if owner is null then
    raise exception 'La sesión % no existe', new.workout_id using errcode = 'foreign_key_violation';
  end if;
  new.user_id := owner;
  return new;
end;
$$;

create trigger workout_exercises_fill before insert or update of workout_id on public.workout_exercises
  for each row execute function public.workout_exercises_fill_from_parent();

create table public.sets (
  id                  uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id         uuid not null references public.exercises (id) on delete restrict,
  position            smallint not null default 0,
  set_type            public.set_type not null default 'normal',
  weight_kg           numeric(7,3) check (weight_kg >= 0 and weight_kg < 1000),
  reps                smallint     check (reps between 0 and 1000),
  rir                 smallint     check (rir between 0 and 10),
  duration_seconds    integer      check (duration_seconds >= 0),
  distance_m          numeric(9,1) check (distance_m >= 0),
  completed           boolean not null default false,
  performed_at        timestamptz not null default now(),
  -- 1RM estimado (Epley). Sobre 20 reps deja de ser fiable.
  e1rm_kg             numeric(8,3) generated always as (
    case
      when weight_kg is null or reps is null or reps = 0 or reps > 20 then null
      when reps = 1 then weight_kg
      else round(weight_kg * (1 + reps / 30.0), 3)
    end
  ) stored,
  volume_kg           numeric(11,3) generated always as (coalesce(weight_kg, 0) * coalesce(reps, 0)) stored,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index sets_workout_exercise_idx on public.sets (workout_exercise_id, position);
create index sets_history_idx          on public.sets (user_id, exercise_id, performed_at desc);

create trigger sets_updated_at before update on public.sets
  for each row execute function public.set_updated_at();

-- user_id y exercise_id siempre se copian del ejercicio de la sesión
create or replace function public.sets_fill_from_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent record;
begin
  select we.user_id, we.exercise_id into parent
  from public.workout_exercises we where we.id = new.workout_exercise_id;
  if parent.user_id is null then
    raise exception 'El ejercicio de sesión % no existe', new.workout_exercise_id using errcode = 'foreign_key_violation';
  end if;
  new.user_id := parent.user_id;
  new.exercise_id := parent.exercise_id;
  return new;
end;
$$;

create trigger sets_fill before insert or update of workout_exercise_id on public.sets
  for each row execute function public.sets_fill_from_parent();

-- Si cambias el ejercicio de una sesión (sustituir), sus series lo siguen
create or replace function public.workout_exercises_sync_sets()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.sets set exercise_id = new.exercise_id where workout_exercise_id = new.id;
  return null;
end;
$$;

create trigger workout_exercises_sync after update of exercise_id on public.workout_exercises
  for each row when (old.exercise_id is distinct from new.exercise_id)
  execute function public.workout_exercises_sync_sets();

-- ---------------------------------------------------------------------
-- Récords personales (los genera la base de datos al completar una serie)
-- Solo cuenta como récord si supera una marca previa del mismo ejercicio.
-- ---------------------------------------------------------------------
create table public.personal_records (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  exercise_id    uuid not null references public.exercises (id) on delete cascade,
  set_id         uuid not null references public.sets (id) on delete cascade,
  type           public.pr_type not null,
  value          numeric(10,3) not null,
  previous_value numeric(10,3) not null,
  weight_kg      numeric(7,3),
  reps           smallint,
  achieved_at    timestamptz not null,
  created_at     timestamptz not null default now(),
  unique (set_id, type)
);

create index personal_records_user_idx on public.personal_records (user_id, achieved_at desc);
create index personal_records_exercise_idx on public.personal_records (user_id, exercise_id, achieved_at desc);

create or replace function public.detect_personal_records()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  prev numeric;
begin
  delete from public.personal_records where set_id = new.id;

  if not new.completed or new.set_type = 'warmup'
     or new.weight_kg is null or new.reps is null or new.reps = 0 then
    return null;
  end if;

  -- Peso máximo
  select max(s.weight_kg) into prev
  from public.sets s
  where s.user_id = new.user_id and s.exercise_id = new.exercise_id
    and s.completed and s.set_type <> 'warmup' and s.reps > 0
    and s.id <> new.id and s.performed_at < new.performed_at;
  if prev is not null and new.weight_kg > prev then
    insert into public.personal_records (user_id, exercise_id, set_id, type, value, previous_value, weight_kg, reps, achieved_at)
    values (new.user_id, new.exercise_id, new.id, 'weight', new.weight_kg, prev, new.weight_kg, new.reps, new.performed_at);
  end if;

  -- 1RM estimado
  if new.e1rm_kg is not null then
    select max(s.e1rm_kg) into prev
    from public.sets s
    where s.user_id = new.user_id and s.exercise_id = new.exercise_id
      and s.completed and s.set_type <> 'warmup'
      and s.id <> new.id and s.performed_at < new.performed_at;
    if prev is not null and new.e1rm_kg > prev then
      insert into public.personal_records (user_id, exercise_id, set_id, type, value, previous_value, weight_kg, reps, achieved_at)
      values (new.user_id, new.exercise_id, new.id, 'e1rm', new.e1rm_kg, prev, new.weight_kg, new.reps, new.performed_at);
    end if;
  end if;

  -- Más repeticiones con ese peso (o más)
  select max(s.reps) into prev
  from public.sets s
  where s.user_id = new.user_id and s.exercise_id = new.exercise_id
    and s.completed and s.set_type <> 'warmup' and s.weight_kg >= new.weight_kg
    and s.id <> new.id and s.performed_at < new.performed_at;
  if prev is not null and new.reps > prev then
    insert into public.personal_records (user_id, exercise_id, set_id, type, value, previous_value, weight_kg, reps, achieved_at)
    values (new.user_id, new.exercise_id, new.id, 'reps', new.reps, prev, new.weight_kg, new.reps, new.performed_at);
  end if;

  return null;
end;
$$;

create trigger sets_detect_pr
  after insert or update of weight_kg, reps, completed, set_type, performed_at, exercise_id on public.sets
  for each row execute function public.detect_personal_records();

-- ---------------------------------------------------------------------
-- Deportes y otras actividades
-- details guarda los campos propios de cada deporte, p. ej.
--   fútbol: {"goals":1,"assists":2,"position":"volante"}
--   running: {"pace_sec_per_km":330,"elevation_m":40}
-- ---------------------------------------------------------------------
create table public.activities (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sport            public.sport_type not null,
  custom_name      text check (char_length(custom_name) <= 60),
  started_at       timestamptz not null default now(),
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  distance_km      numeric(7,2) check (distance_km >= 0),
  intensity        smallint check (intensity between 1 and 5),
  calories         integer  check (calories >= 0),
  avg_heart_rate   smallint check (avg_heart_rate between 30 and 250),
  details          jsonb not null default '{}'::jsonb,
  notes            text check (char_length(notes) <= 1000),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index activities_user_started_idx on public.activities (user_id, started_at desc);

create trigger activities_updated_at before update on public.activities
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Cuerpo: peso, medidas y fotos de progreso
-- ---------------------------------------------------------------------
create table public.body_metrics (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  measured_on  date not null default current_date,
  weight_kg    numeric(5,2) check (weight_kg between 20 and 400),
  body_fat_pct numeric(4,1) check (body_fat_pct between 2 and 70),
  neck_cm      numeric(5,1) check (neck_cm > 0),
  chest_cm     numeric(5,1) check (chest_cm > 0),
  waist_cm     numeric(5,1) check (waist_cm > 0),
  hips_cm      numeric(5,1) check (hips_cm > 0),
  arm_cm       numeric(5,1) check (arm_cm > 0),
  thigh_cm     numeric(5,1) check (thigh_cm > 0),
  calf_cm      numeric(5,1) check (calf_cm > 0),
  notes        text check (char_length(notes) <= 500),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, measured_on)
);

create trigger body_metrics_updated_at before update on public.body_metrics
  for each row execute function public.set_updated_at();

create table public.progress_photos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  taken_on     date not null default current_date,
  pose         public.photo_pose not null default 'front',
  storage_path text not null unique,
  notes        text check (char_length(notes) <= 300),
  created_at   timestamptz not null default now()
);

create index progress_photos_user_idx on public.progress_photos (user_id, taken_on desc);

-- ---------------------------------------------------------------------
-- Notificaciones push y recordatorios (v3)
-- ---------------------------------------------------------------------
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create table public.reminders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  routine_id  uuid references public.routines (id) on delete set null,
  weekdays    smallint[] not null check (weekdays <@ array[0,1,2,3,4,5,6]::smallint[] and cardinality(weekdays) > 0),
  time_of_day time not null,
  message     text check (char_length(message) <= 120),
  enabled     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger reminders_updated_at before update on public.reminders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Vistas (respetan RLS del usuario que consulta)
-- ---------------------------------------------------------------------

-- Días entrenados (gimnasio o deporte), en la zona horaria del usuario
create view public.training_days with (security_invoker = true) as
  select w.user_id,
         (w.started_at at time zone p.timezone)::date as day,
         'gym'::text as kind,
         count(*)::int as sessions
  from public.workouts w
  join public.profiles p on p.id = w.user_id
  where w.ended_at is not null
  group by 1, 2
  union all
  select a.user_id,
         (a.started_at at time zone p.timezone)::date as day,
         'sport'::text as kind,
         count(*)::int as sessions
  from public.activities a
  join public.profiles p on p.id = a.user_id
  group by 1, 2;

-- Resumen de cada ejercicio en cada sesión (historial y comparación)
create view public.exercise_sessions with (security_invoker = true) as
  select we.id          as workout_exercise_id,
         we.user_id,
         we.exercise_id,
         w.id           as workout_id,
         w.started_at,
         count(s.id) filter (where s.completed and s.set_type <> 'warmup')::int              as work_sets,
         max(s.weight_kg) filter (where s.completed and s.set_type <> 'warmup' and s.reps > 0) as top_weight_kg,
         max(s.e1rm_kg) filter (where s.completed and s.set_type <> 'warmup')                as best_e1rm_kg,
         coalesce(sum(s.volume_kg) filter (where s.completed and s.set_type <> 'warmup'), 0) as volume_kg,
         coalesce(sum(s.reps) filter (where s.completed and s.set_type <> 'warmup'), 0)::int as total_reps
  from public.workout_exercises we
  join public.workouts w on w.id = we.workout_id
  left join public.sets s on s.workout_exercise_id = we.id
  group by we.id, w.id;

-- ---------------------------------------------------------------------
-- Seguridad: Row Level Security (cada usuario solo ve lo suyo)
-- ---------------------------------------------------------------------
alter table public.profiles             enable row level security;
alter table public.exercises            enable row level security;
alter table public.exercise_preferences enable row level security;
alter table public.routines             enable row level security;
alter table public.routine_exercises    enable row level security;
alter table public.workouts             enable row level security;
alter table public.workout_exercises    enable row level security;
alter table public.sets                 enable row level security;
alter table public.personal_records     enable row level security;
alter table public.activities           enable row level security;
alter table public.body_metrics         enable row level security;
alter table public.progress_photos      enable row level security;
alter table public.push_subscriptions   enable row level security;
alter table public.reminders            enable row level security;

-- Perfil: leer y editar el propio (se crea por trigger)
create policy "profiles: leer el propio" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: editar el propio" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Ejercicios: ver catálogo global + propios; modificar solo propios
create policy "exercises: ver globales y propios" on public.exercises
  for select to authenticated using (user_id is null or user_id = (select auth.uid()));
create policy "exercises: crear propios" on public.exercises
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "exercises: editar propios" on public.exercises
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "exercises: borrar propios" on public.exercises
  for delete to authenticated using (user_id = (select auth.uid()));

-- Tablas donde el dueño es user_id
create policy "exercise_preferences: dueño" on public.exercise_preferences
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "routines: dueño" on public.routines
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "routine_exercises: dueño" on public.routine_exercises
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.routines r where r.id = routine_id and r.user_id = (select auth.uid()))
  );
create policy "workouts: dueño" on public.workouts
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "workout_exercises: dueño" on public.workout_exercises
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "sets: dueño" on public.sets
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "personal_records: leer propios" on public.personal_records
  for select to authenticated using (user_id = (select auth.uid()));
create policy "activities: dueño" on public.activities
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "body_metrics: dueño" on public.body_metrics
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "progress_photos: dueño" on public.progress_photos
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "push_subscriptions: dueño" on public.push_subscriptions
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "reminders: dueño" on public.reminders
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Permisos de la API (RLS decide qué filas)
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.training_days, public.exercise_sessions to authenticated;
revoke insert, update, delete on public.personal_records from authenticated;

-- ---------------------------------------------------------------------
-- Storage: fotos de progreso (privadas). Ruta: <user_id>/<archivo>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

create policy "progress-photos: leer propias" on storage.objects
  for select to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "progress-photos: subir propias" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "progress-photos: editar propias" on storage.objects
  for update to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "progress-photos: borrar propias" on storage.objects
  for delete to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
