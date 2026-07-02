-- VitaOS — esquema principal (V1)
-- Todas as tabelas de utilizador têm user_id + Row Level Security.

-- =========================================================
-- Perfil
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  sex text check (sex in ('male', 'female')),
  birth_date date,
  height_cm numeric(5, 1),
  activity_level text not null default 'sedentary'
    check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal_type text not null default 'lose_fat'
    check (goal_type in ('lose_fat', 'maintain', 'gain_muscle', 'improve_health')),
  goal_rate_kg_week numeric(3, 2) not null default 0.5,
  equipment jsonb not null default '[]'::jsonb,
  water_target_ml integer not null default 2000,
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: own read" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: own insert" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles: own update" on public.profiles
  for update using (auth.uid() = id);

-- Cria perfil automaticamente no signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- Corpo: biometria diária (métricas da balança)
-- =========================================================
create table public.body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  weight_kg numeric(5, 2),
  body_fat_pct numeric(4, 1),
  visceral_fat numeric(4, 1),
  muscle_pct numeric(4, 1),
  skeletal_muscle_pct numeric(4, 1),
  water_pct numeric(4, 1),
  bone_mass_kg numeric(4, 2),
  bmr_kcal integer,
  metabolic_age integer,
  protein_pct numeric(4, 1),
  source text not null default 'manual',
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.body_metrics enable row level security;
create policy "body_metrics: own all" on public.body_metrics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- Corpo: medidas corporais
-- =========================================================
create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  site text not null check (site in (
    'neck', 'shoulders', 'chest', 'waist', 'hips',
    'arm_left', 'arm_right', 'thigh_left', 'thigh_right', 'calf_left', 'calf_right'
  )),
  value_cm numeric(5, 1) not null,
  created_at timestamptz not null default now(),
  unique (user_id, date, site)
);

alter table public.body_measurements enable row level security;
create policy "body_measurements: own all" on public.body_measurements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- Metas
-- =========================================================
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  metric text not null check (metric in (
    'weight_kg', 'body_fat_pct', 'visceral_fat', 'muscle_pct', 'waist_cm', 'resting_hr'
  )),
  start_value numeric(6, 2) not null,
  target_value numeric(6, 2) not null,
  target_date date,
  status text not null default 'active' check (status in ('active', 'achieved', 'abandoned')),
  created_at timestamptz not null default now()
);

alter table public.goals enable row level security;
create policy "goals: own all" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- Nutrição: alimentos (cache OFF + manuais)
-- =========================================================
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade, -- null = global/cache OFF
  name text not null,
  brand text,
  barcode text,
  source text not null default 'manual' check (source in ('off', 'manual', 'base')),
  kcal_100 numeric(7, 1) not null,
  protein_100 numeric(6, 2) not null default 0,
  carbs_100 numeric(6, 2) not null default 0,
  fat_100 numeric(6, 2) not null default 0,
  fiber_100 numeric(6, 2),
  sugar_100 numeric(6, 2),
  salt_100 numeric(6, 3),
  serving_g numeric(7, 1), -- porção típica em gramas, se conhecida
  created_at timestamptz not null default now()
);

create index foods_barcode_idx on public.foods (barcode);
create index foods_name_idx on public.foods using gin (to_tsvector('simple', name));
-- Alimentos base (seed) não podem duplicar em re-seeds
create unique index foods_base_name_unique on public.foods (name) where source = 'base';

alter table public.foods enable row level security;
create policy "foods: read global or own" on public.foods
  for select using (user_id is null or auth.uid() = user_id);
create policy "foods: insert own or cache" on public.foods
  for insert with check (auth.uid() = user_id or (user_id is null and source = 'off'));
create policy "foods: update own" on public.foods
  for update using (auth.uid() = user_id);
create policy "foods: delete own" on public.foods
  for delete using (auth.uid() = user_id);

-- =========================================================
-- Nutrição: receitas
-- =========================================================
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  servings numeric(4, 1) not null default 1,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.recipes enable row level security;
create policy "recipes: own all" on public.recipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  food_id uuid not null references public.foods (id),
  quantity_g numeric(7, 1) not null
);

alter table public.recipe_items enable row level security;
create policy "recipe_items: via recipe" on public.recipe_items
  for all using (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()));

-- =========================================================
-- Nutrição: refeições típicas (logging rápido)
-- =========================================================
create table public.meal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  items jsonb not null default '[]'::jsonb, -- [{food_id, quantity_g}]
  created_at timestamptz not null default now()
);

alter table public.meal_templates enable row level security;
create policy "meal_templates: own all" on public.meal_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- Nutrição: diário
-- =========================================================
create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_id uuid references public.foods (id),
  recipe_id uuid references public.recipes (id),
  description text, -- para entradas rápidas sem alimento associado
  quantity_g numeric(7, 1),
  servings numeric(4, 2),
  kcal numeric(7, 1) not null,
  protein_g numeric(6, 1) not null default 0,
  carbs_g numeric(6, 1) not null default 0,
  fat_g numeric(6, 1) not null default 0,
  created_at timestamptz not null default now()
);

create index food_logs_user_date_idx on public.food_logs (user_id, date);

alter table public.food_logs enable row level security;
create policy "food_logs: own all" on public.food_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- Nutrição: água
-- =========================================================
create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  ml integer not null,
  created_at timestamptz not null default now()
);

create index water_logs_user_date_idx on public.water_logs (user_id, date);

alter table public.water_logs enable row level security;
create policy "water_logs: own all" on public.water_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- Nutrição: histórico de alvos (para motor adaptativo em V2)
-- =========================================================
create table public.nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  effective_from date not null,
  kcal integer not null,
  protein_g integer not null,
  carbs_g integer not null,
  fat_g integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, effective_from)
);

create index nutrition_targets_user_idx on public.nutrition_targets (user_id, effective_from desc);

alter table public.nutrition_targets enable row level security;
create policy "nutrition_targets: own all" on public.nutrition_targets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- Treino: exercícios (globais seed + do utilizador)
-- =========================================================
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade, -- null = global
  slug text unique,
  name text not null,
  category text not null check (category in ('strength', 'cardio', 'mobility', 'core')),
  primary_muscles text[] not null default '{}',
  equipment text[] not null default '{}', -- bodyweight, dumbbell, bench, band, treadmill, bike, pullup_bar
  difficulty text not null default 'beginner' check (difficulty in ('beginner', 'intermediate', 'advanced')),
  instructions text,
  media_url text,
  created_at timestamptz not null default now()
);

alter table public.exercises enable row level security;
create policy "exercises: read global or own" on public.exercises
  for select using (user_id is null or auth.uid() = user_id);
create policy "exercises: own write" on public.exercises
  for insert with check (auth.uid() = user_id);
create policy "exercises: own update" on public.exercises
  for update using (auth.uid() = user_id);
create policy "exercises: own delete" on public.exercises
  for delete using (auth.uid() = user_id);

-- =========================================================
-- Treino: planos
-- =========================================================
create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade, -- null = plano global pré-feito
  slug text unique,
  name text not null,
  description text,
  goal_type text check (goal_type in ('lose_fat', 'maintain', 'gain_muscle', 'improve_health')),
  level text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  equipment text[] not null default '{}',
  weeks integer not null default 4,
  created_at timestamptz not null default now()
);

alter table public.workout_plans enable row level security;
create policy "workout_plans: read global or own" on public.workout_plans
  for select using (user_id is null or auth.uid() = user_id);
create policy "workout_plans: own write" on public.workout_plans
  for insert with check (auth.uid() = user_id);
create policy "workout_plans: own update" on public.workout_plans
  for update using (auth.uid() = user_id);
create policy "workout_plans: own delete" on public.workout_plans
  for delete using (auth.uid() = user_id);

create table public.plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.workout_plans (id) on delete cascade,
  day_index integer not null, -- 0..6 dentro da semana
  name text not null, -- ex.: "Força A", "Cardio passadeira"
  focus text,
  unique (plan_id, day_index)
);

alter table public.plan_days enable row level security;
create policy "plan_days: via plan read" on public.plan_days
  for select using (exists (
    select 1 from public.workout_plans p where p.id = plan_id and (p.user_id is null or p.user_id = auth.uid())
  ));
create policy "plan_days: via plan write" on public.plan_days
  for all using (exists (select 1 from public.workout_plans p where p.id = plan_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.workout_plans p where p.id = plan_id and p.user_id = auth.uid()));

create table public.plan_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_day_id uuid not null references public.plan_days (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  position integer not null default 0,
  sets integer,
  reps text, -- "8-12", "30s", etc.
  rest_seconds integer default 90,
  duration_minutes integer, -- para cardio
  notes text,
  unique (plan_day_id, position)
);

alter table public.plan_exercises enable row level security;
create policy "plan_exercises: via plan read" on public.plan_exercises
  for select using (exists (
    select 1 from public.plan_days d join public.workout_plans p on p.id = d.plan_id
    where d.id = plan_day_id and (p.user_id is null or p.user_id = auth.uid())
  ));
create policy "plan_exercises: via plan write" on public.plan_exercises
  for all using (exists (
    select 1 from public.plan_days d join public.workout_plans p on p.id = d.plan_id
    where d.id = plan_day_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.plan_days d join public.workout_plans p on p.id = d.plan_id
    where d.id = plan_day_id and p.user_id = auth.uid()
  ));

-- Plano ativo do utilizador
create table public.user_active_plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan_id uuid not null references public.workout_plans (id),
  started_on date not null default current_date
);

alter table public.user_active_plans enable row level security;
create policy "user_active_plans: own all" on public.user_active_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- Treino: sessões realizadas
-- =========================================================
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null default current_date,
  plan_day_id uuid references public.plan_days (id),
  name text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  notes text
);

create index workout_sessions_user_date_idx on public.workout_sessions (user_id, date);

alter table public.workout_sessions enable row level security;
create policy "workout_sessions: own all" on public.workout_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.session_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  set_index integer not null default 0,
  reps integer,
  weight_kg numeric(6, 2),
  duration_seconds integer, -- cardio / isométricos
  distance_km numeric(6, 2),
  avg_hr integer,
  created_at timestamptz not null default now()
);

alter table public.session_sets enable row level security;
create policy "session_sets: via session" on public.session_sets
  for all using (exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = auth.uid()));

-- =========================================================
-- Check-in diário
-- =========================================================
create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  mood smallint check (mood between 1 and 5),
  energy smallint check (energy between 1 and 5),
  sleep_hours numeric(3, 1),
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.daily_checkins enable row level security;
create policy "daily_checkins: own all" on public.daily_checkins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
