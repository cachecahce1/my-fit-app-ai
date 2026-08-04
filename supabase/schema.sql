-- Greek God Tracker — full schema. Run once in the Supabase SQL editor.
-- Source of truth: 02_Fitness_Tracker_App_Spec.md §4–5.

-- ============ PROFILE & PLAN ============
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  birth_date date,
  height_cm numeric(5,1),
  sex text check (sex in ('male','female','other')),
  timezone text default 'Asia/Kolkata',
  diet_type text default 'vegetarian_dairy',
  created_at timestamptz default now()
);

create table plan_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  version text not null,
  effective_from date not null,
  effective_to date,
  kcal_target int not null,
  kcal_min int,
  kcal_max int,
  protein_g_target int not null,
  protein_g_max int,
  carbs_g_target int,
  fat_g_target int,
  fibre_g_target int,
  water_ml_target int,
  sleep_hours_target numeric(3,1),
  sessions_per_week int,
  notes text,
  created_at timestamptz default now(),
  constraint kcal_floor check (kcal_target >= 1500)  -- hard floor from the plan
);

create table step_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  effective_from date not null,
  daily_steps int not null
);

-- ============ EXERCISE LIBRARY & TEMPLATES ============
create table exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,  -- null = global
  name text not null,
  equipment text,
  primary_muscle text,
  secondary_muscles text[],
  is_unilateral boolean default false,
  increment_kg numeric(4,2) default 2.5,
  notes text,
  created_at timestamptz default now()
);

create table workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  plan_version_id uuid references plan_versions(id),
  name text not null,
  day_of_week int,                 -- 1=Mon .. 7=Sun
  focus text,
  is_active boolean default true,
  sort_order int
);

create table template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references workout_templates(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  sort_order int not null,
  target_sets int not null,
  rep_min int not null,
  rep_max int not null,
  target_rpe numeric(3,1),
  rest_seconds int,
  start_weight_kg numeric(6,2),
  is_optional boolean default false,
  notes text
);

-- ============ WORKOUT LOGGING ============
create table workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  template_id uuid references workout_templates(id),
  log_date date not null,
  started_at timestamptz,
  ended_at timestamptz,
  bodyweight_kg numeric(5,2),
  session_rpe numeric(3,1),
  notes text,
  deleted_at timestamptz,
  created_at timestamptz default now()
);
create index on workout_sessions (user_id, log_date desc);

create table set_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workout_sessions(id) on delete cascade,
  exercise_id uuid not null references exercises(id),
  set_number int not null,
  weight_kg numeric(6,2),
  reps int,
  rpe numeric(3,1),
  is_warmup boolean default false,
  is_clean_solo boolean default true,
  notes text,
  logged_at timestamptz default now()
);
create index on set_logs (exercise_id, logged_at desc);

create table cardio_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  session_id uuid references workout_sessions(id) on delete set null,
  log_date date not null,
  modality text,
  duration_min int,
  incline_pct numeric(4,1),
  speed_kmh numeric(4,1),
  avg_hr int,
  notes text
);

-- ============ NUTRITION ============
create table foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,   -- null = global
  name text not null,
  brand text,
  serving_unit text not null,
  serving_size numeric(8,2) not null default 100,
  kcal numeric(7,2) not null,
  protein_g numeric(6,2) not null,
  carbs_g numeric(6,2),
  fat_g numeric(6,2),
  fibre_g numeric(6,2),
  tags text[],
  is_favourite boolean default false,
  created_at timestamptz default now()
);

create table saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  meal_slot text,
  created_at timestamptz default now()
);

create table saved_meal_items (
  id uuid primary key default gen_random_uuid(),
  saved_meal_id uuid not null references saved_meals(id) on delete cascade,
  food_id uuid not null references foods(id),
  quantity numeric(8,2) not null
);

create table meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  log_date date not null,
  meal_slot text not null check (meal_slot in
    ('breakfast','lunch','pre_workout','post_workout','dinner','snack','treat')),
  logged_at timestamptz default now(),
  is_treat boolean default false,
  oil_adjustment_kcal int default 0,
  notes text,
  deleted_at timestamptz
);
create index on meal_logs (user_id, log_date);

create table meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_log_id uuid not null references meal_logs(id) on delete cascade,
  food_id uuid not null references foods(id),
  quantity numeric(8,2) not null,
  -- macros snapshotted at log time so later food edits don't rewrite history
  kcal numeric(7,2),
  protein_g numeric(6,2),
  carbs_g numeric(6,2),
  fat_g numeric(6,2),
  fibre_g numeric(6,2)
);

-- ============ BODY, HABITS, RECOVERY ============
create table body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  log_date date not null,
  weight_kg numeric(5,2),
  waist_cm numeric(5,1),
  mid_abdomen_cm numeric(5,1),
  hips_cm numeric(5,1),
  neck_cm numeric(5,1),
  bicep_cm numeric(5,1),
  thigh_cm numeric(5,1),
  calf_cm numeric(5,1),
  shoulder_circumference_cm numeric(5,1),
  bia_body_fat_pct numeric(4,1),
  notes text,
  unique (user_id, log_date)
);

create table progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  log_date date not null,
  pose text check (pose in ('front','side_left','side_right','back')),
  storage_path text not null,
  notes text
);

create table sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  log_date date not null,          -- the date you WOKE UP on
  bed_time timestamptz,
  wake_time timestamptz,
  duration_min int,
  quality int check (quality between 1 and 5),
  notes text,
  unique (user_id, log_date)
);

create table daily_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  log_date date not null,
  steps int,
  water_ml int,
  notes text,
  unique (user_id, log_date)
);

create table supplements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  dose text,
  schedule text,
  is_active boolean default true
);

create table supplement_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  supplement_id uuid not null references supplements(id) on delete cascade,
  log_date date not null,
  taken boolean default true,
  unique (user_id, supplement_id, log_date)
);

create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  log_date date not null,
  morning_light boolean,
  caffeine_cutoff_respected boolean,
  posture_routine boolean,
  ab_vacuums boolean,
  bowel_movement boolean,
  notes text,
  unique (user_id, log_date)
);

-- ============ REVIEW & COACHING ============
create table weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  week_start date not null,      -- Monday
  avg_weight_kg numeric(5,2),
  weight_delta_kg numeric(5,2),
  waist_cm numeric(5,1),
  waist_delta_cm numeric(5,1),
  sessions_completed int,
  days_protein_hit int,
  days_kcal_in_range int,
  days_steps_hit int,
  nights_sleep_7h int,
  verdict text,
  action_taken text,
  reflection text,
  unique (user_id, week_start)
);

create table coach_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  created_at timestamptz default now(),
  source text,
  category text,
  content text not null
);

-- ============ ROW LEVEL SECURITY ============
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','plan_versions','step_targets','workout_templates','workout_sessions',
    'cardio_logs','saved_meals','meal_logs','body_metrics','progress_photos',
    'sleep_logs','daily_activity','supplements','supplement_logs','habit_logs',
    'weekly_reviews','coach_notes'
  ] loop
    execute format('alter table %I enable row level security', t);
    if t = 'profiles' then
      execute 'create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id)';
    else
      execute format('create policy "own rows" on %I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    end if;
  end loop;
end $$;

-- Reference tables with global rows
alter table exercises enable row level security;
create policy "read global or own" on exercises
  for select using (user_id is null or user_id = auth.uid());
create policy "insert own" on exercises for insert with check (user_id = auth.uid());
create policy "update own" on exercises for update using (user_id = auth.uid());
create policy "delete own" on exercises for delete using (user_id = auth.uid());

alter table foods enable row level security;
create policy "read global or own" on foods
  for select using (user_id is null or user_id = auth.uid());
create policy "insert own" on foods for insert with check (user_id = auth.uid());
create policy "update own" on foods for update using (user_id = auth.uid());
create policy "delete own" on foods for delete using (user_id = auth.uid());

-- Child tables scoped through the parent
alter table set_logs enable row level security;
create policy "own sets" on set_logs for all using (
  exists (select 1 from workout_sessions s
          where s.id = set_logs.session_id and s.user_id = auth.uid())
);

alter table meal_items enable row level security;
create policy "own meal items" on meal_items for all using (
  exists (select 1 from meal_logs m
          where m.id = meal_items.meal_log_id and m.user_id = auth.uid())
);

alter table template_exercises enable row level security;
create policy "own template exercises" on template_exercises for all using (
  exists (select 1 from workout_templates w
          where w.id = template_exercises.template_id and w.user_id = auth.uid())
);

alter table saved_meal_items enable row level security;
create policy "own saved meal items" on saved_meal_items for all using (
  exists (select 1 from saved_meals sm
          where sm.id = saved_meal_items.saved_meal_id and sm.user_id = auth.uid())
);

-- ============ VIEWS (security_invoker so RLS applies) ============
create view v_daily_nutrition with (security_invoker = true) as
with per_meal as (
  select m.user_id, m.log_date, m.id, m.is_treat,
         coalesce(m.oil_adjustment_kcal, 0) as oil_kcal,
         sum(i.kcal) as kcal, sum(i.protein_g) as protein_g,
         sum(i.carbs_g) as carbs_g, sum(i.fat_g) as fat_g, sum(i.fibre_g) as fibre_g
  from meal_logs m
  join meal_items i on i.meal_log_id = m.id
  where m.deleted_at is null
  group by m.user_id, m.log_date, m.id
)
select user_id, log_date,
       sum(kcal + oil_kcal) as kcal,
       sum(protein_g) as protein_g,
       sum(carbs_g) as carbs_g,
       sum(fat_g) as fat_g,
       sum(fibre_g) as fibre_g,
       bool_or(is_treat) as had_treat
from per_meal
group by user_id, log_date;

create view v_weight_trend with (security_invoker = true) as
select
  user_id, log_date, weight_kg,
  round(avg(weight_kg) over (
    partition by user_id order by log_date
    rows between 6 preceding and current row
  )::numeric, 2) as avg_7day
from body_metrics
where weight_kg is not null;

create view v_exercise_progression with (security_invoker = true) as
select
  s.user_id, sl.exercise_id, e.name as exercise_name, s.log_date,
  max(sl.weight_kg) filter (where sl.is_warmup = false) as top_weight_kg,
  max(sl.reps) filter (where sl.is_warmup = false) as top_reps,
  sum(sl.weight_kg * sl.reps) filter (where sl.is_warmup = false) as volume_kg,
  count(*) filter (where sl.is_warmup = false) as working_sets,
  avg(sl.rpe) filter (where sl.is_warmup = false) as avg_rpe
from set_logs sl
join workout_sessions s on s.id = sl.session_id
join exercises e on e.id = sl.exercise_id
where s.deleted_at is null and sl.is_clean_solo = true
group by s.user_id, sl.exercise_id, e.name, s.log_date;

create view v_weekly_muscle_volume with (security_invoker = true) as
select
  s.user_id,
  date_trunc('week', s.log_date)::date as week_start,
  e.primary_muscle,
  count(*) filter (where sl.is_warmup = false) as hard_sets,
  sum(sl.weight_kg * sl.reps) as volume_kg
from set_logs sl
join workout_sessions s on s.id = sl.session_id
join exercises e on e.id = sl.exercise_id
where s.deleted_at is null
group by 1,2,3;

create view v_daily_summary with (security_invoker = true) as
select
  d.user_id, d.log_date,
  n.kcal, n.protein_g, n.carbs_g, n.fat_g, n.fibre_g,
  d.steps, d.water_ml,
  b.weight_kg, w.avg_7day as weight_avg_7day, b.waist_cm,
  sl.duration_min as sleep_min,
  exists (select 1 from workout_sessions s
          where s.user_id = d.user_id and s.log_date = d.log_date
            and s.deleted_at is null) as trained
from daily_activity d
left join v_daily_nutrition n on n.user_id = d.user_id and n.log_date = d.log_date
left join body_metrics b      on b.user_id = d.user_id and b.log_date = d.log_date
left join v_weight_trend w    on w.user_id = d.user_id and w.log_date = d.log_date
left join sleep_logs sl       on sl.user_id = d.user_id and sl.log_date = d.log_date;

-- ============ COACH SNAPSHOT RPC ============
create or replace function get_coach_snapshot(p_from date, p_to date)
returns jsonb
language sql security invoker stable
as $$
  select jsonb_build_object(
    'range',        jsonb_build_object('from', p_from, 'to', p_to),
    'plan',         (select row_to_json(p) from plan_versions p
                     where p.user_id = auth.uid() and p.effective_to is null limit 1),
    'daily',        (select jsonb_agg(row_to_json(d) order by d.log_date)
                     from v_daily_summary d
                     where d.user_id = auth.uid() and d.log_date between p_from and p_to),
    'sessions',     (select jsonb_agg(row_to_json(x))
                     from (select s.log_date, t.name as template,
                                  count(sl.*) filter (where not sl.is_warmup) as working_sets,
                                  sum(sl.weight_kg*sl.reps) as volume_kg
                           from workout_sessions s
                           left join workout_templates t on t.id = s.template_id
                           left join set_logs sl on sl.session_id = s.id
                           where s.user_id = auth.uid()
                             and s.log_date between p_from and p_to
                             and s.deleted_at is null
                           group by s.log_date, t.name) x),
    'progression',  (select jsonb_agg(row_to_json(v))
                     from v_exercise_progression v
                     where v.user_id = auth.uid() and v.log_date between p_from and p_to),
    'measurements', (select jsonb_agg(row_to_json(b) order by b.log_date)
                     from body_metrics b
                     where b.user_id = auth.uid() and b.log_date between p_from and p_to),
    'reviews',      (select jsonb_agg(row_to_json(r))
                     from weekly_reviews r
                     where r.user_id = auth.uid() and r.week_start between p_from and p_to)
  );
$$;

-- ============ STORAGE ============
insert into storage.buckets (id, name, public) values ('progress-photos','progress-photos', false)
on conflict (id) do nothing;

create policy "own photos" on storage.objects for all
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
