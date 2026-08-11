-- Greek God Tracker — seed data from 01_Fitness_Knowledge_Base.md (plan v1.1).
-- RUN ORDER: 1) schema.sql  2) log in to the app once (creates your auth user)  3) this file.
-- The DO block below seeds user-owned rows for the FIRST user in auth.users.

-- ============ GLOBAL EXERCISES ============
insert into exercises (name, equipment, primary_muscle, increment_kg, is_unilateral, notes) values
('Seated DB Shoulder Press',        'dumbbell',  'delts',      2.5, false, 'Full range, no leg drive'),
('Incline Smith Press (~30°)',      'smith',     'upper_chest',2.5, false, 'Safeties set; bar touches upper chest'),
('Flat DB Press',                   'dumbbell',  'chest',      2.5, false, '2-second lowering'),
('Cable Lateral Raise (1-arm)',     'cable',     'side_delts', 2.5, true,  'Lean-away, constant tension — the cap builder'),
('Pec Deck Fly',                    'machine',   'chest',      5,   false, 'Big stretch at the back'),
('Overhead Cable Triceps Ext. (rope)','cable',   'triceps',    2.5, false, 'Long-head stretch'),
('Pull-Ups',                        'bodyweight','lats',       0,   false, 'If total <4 reps, swap to Lat Pulldown 4×6–10'),
('Lat Pulldown (medium overhand)',  'cable',     'lats',       2.5, false, '1-second squeeze at the bottom'),
('Chest-Supported Row',             'machine',   'mid_back',   5,   false, 'Chest glued to the pad'),
('Straight-Arm Cable Pulldown',     'cable',     'lats',       2.5, false, 'Pure lat isolation'),
('Reverse Pec Deck',                'machine',   'rear_delts', 5,   false, 'The 3D-shoulder builder'),
('Preacher Curl Machine',           'machine',   'biceps',     5,   false, null),
('Rope Hammer Curl',                'cable',     'biceps',     2.5, false, 'Brachialis = arm thickness'),
('Smith Machine Squat',             'smith',     'quads',      2.5, false, 'Feet slightly forward; parallel or below'),
('Leg Press',                       'machine',   'quads',      5,   false, 'Volume work — save 185+ for rep-PR days'),
('Leg Extension',                   'machine',   'quads',      5,   false, '1-second pause at the top'),
('Seated Calf Raise',               'machine',   'calves',     5,   false, '2-second stretch at the bottom'),
('Cable Crunch',                    'cable',     'abs',        2.5, false, 'Hips still; flex the spine'),
('Hanging Knee Raise',              'bodyweight','abs',        0,   false, 'Tilt pelvis up at the top; no swinging'),
('Flat Smith Bench Press',          'smith',     'chest',      2.5, false, 'Heaviest press of the week; safeties set'),
('Machine Shoulder Press',          'machine',   'delts',      5,   false, null),
('Low-to-High Cable Fly',           'cable',     'upper_chest',2.5, false, 'Upper-chest shelf; squeeze up and in'),
('DB Lateral Raise',                'dumbbell',  'side_delts', 2.5, false, 'Strict'),
('Triceps Rope Pushdown',           'cable',     'triceps',    2.5, false, null),
('DB Lateral Partials',             'dumbbell',  'side_delts', 2.5, false, 'Optional finisher, only if time allows'),
('Seated Cable Row (close/neutral)','cable',     'mid_back',   2.5, false, 'Drive elbows back'),
('Lat Pulldown (close/neutral)',    'cable',     'lats',       2.5, false, 'Different angle from Tuesday'),
('High Row Machine',                'machine',   'upper_back', 5,   false, 'Upper back + rear delt'),
('Incline DB Curl',                 'dumbbell',  'biceps',     2.5, false, 'Long-head stretch'),
('Cable Bar Curl',                  'cable',     'biceps',     2.5, false, 'Pump finisher'),
('DB Romanian Deadlift',            'dumbbell',  'hamstrings', 2.5, false, 'Hinge, soft knees, stop mid-shin. RPE 7 first 2 weeks'),
('Leg Curl',                        'machine',   'hamstrings', 5,   false, null),
('Hack Squat',                      'machine',   'quads',      5,   false, 'Maintenance volume'),
('Standing Calf Raise',             'machine',   'calves',     5,   false, null),
('Decline Weighted Sit-Up',         'bodyweight','abs',        2.5, false, 'Plate on chest'),
('Cable Woodchop (high→low)',       'cable',     'obliques',   2.5, true,  'Controlled rotation — no heavy side bends ever');

-- ============ GLOBAL FOODS ============
insert into foods (name, serving_unit, serving_size, kcal, protein_g, carbs_g, fat_g, fibre_g, tags, is_favourite) values
('Whey isolate',            'scoop',  1,   115, 26,   2,  1,   0,  '{high_protein}', true),
('High-protein paneer',     'g',      100, 160, 25,   4,  5,   0,  '{high_protein}', true),
('Regular paneer',          'g',      100, 295, 18,   4,  22,  0,  null, false),
('Soya chunks (dry)',       'g',      50,  170, 26,   16, 0.5, 6,  '{high_protein}', false),
('Tofu',                    'g',      100, 85,  12,   2,  4,   0.5,'{high_protein}', false),
('Greek yogurt / hung curd','g',      150, 130, 15,   8,  4,   0,  '{high_protein}', true),
('Low-fat curd',            'g',      200, 120, 9,    10, 5,   0,  null, true),
('Milk',                    'ml',     250, 135, 8,    12, 6,   0,  null, true),
('Dal (cooked)',            'katori', 1,   120, 7,    18, 2,   4,  '{home_cooked}', true),
('Moong sprouts',           'katori', 1,   100, 9,    14, 1,   5,  null, false),
('Peanut butter',           'g',      30,  180, 7.5,  5,  15,  2,  '{pb_capped}', true),
('Roti (phulka)',           'roti',   1,   100, 3,    18, 2,   2,  '{home_cooked}', true),
('Rice (cooked)',           'katori', 1,   180, 4,    38, 1,   1,  '{home_cooked}', true),
('Sabzi (with oil)',        'katori', 1,   120, 3,    10, 8,   3,  '{home_cooked}', true),
('Dal khichdi',             'katori', 1,   200, 7,    35, 4,   3,  '{home_cooked}', false),
('Banana',                  'piece',  1,   105, 1.3,  27, 0.3, 3,  null, true),
('Oats (dry)',              'g',      50,  190, 6.5,  33, 3.5, 5,  null, true),
('Brown bread',             'slice',  1,   80,  3,    15, 1,   2,  null, true),
('Poha with peanuts',       'katori', 1,   250, 6,    40, 8,   3,  null, false),
('Chaas',                   'glass',  1,   60,  3,    5,  3,   0,  null, false),
('Papaya',                  'katori', 1,   60,  0.5,  15, 0.2, 2.5,null, false),
('Guava',                   'piece',  1,   70,  2.5,  14, 1,   5,  null, false),
('Salad / cucumber',        'katori', 1,   30,  1,    6,  0.2, 2,  null, false),
('Cooking oil',             'tsp',    1,   40,  0,    0,  4.5, 0,  null, false),
('Tandoori roti',           'piece',  1,   150, 4,    28, 2,   2,  '{treat_food}', false),
('Paneer angara',           'katori', 1,   350, 14,   10, 28,  2,  '{treat_food}', false),
('Jeera rice',              'katori', 1,   250, 4,    45, 7,   1,  '{treat_food}', false),
('Rabdi',                   'g',      200, 450, 8,    55, 22,  0,  '{treat_food}', false);

-- ============ USER-OWNED SEED (first auth user) ============
do $$
declare
  uid uuid;
  pv uuid;
  t_push_a uuid; t_pull_a uuid; t_legs_a uuid;
  t_push_b uuid; t_pull_b uuid; t_legs_b uuid;
  m1 uuid; m2 uuid; m3 uuid; m4 uuid; m5 uuid;
  f_id uuid;
begin
  select id into uid from auth.users order by created_at limit 1;
  if uid is null then
    raise exception 'No user found. Log in to the app once, then run this seed.';
  end if;

  insert into profiles (id, display_name, height_cm, sex)
  values (uid, 'Kartik', 172, 'male')
  on conflict (id) do nothing;

  -- Plan v1.1
  insert into plan_versions (user_id, version, effective_from, kcal_target, kcal_min, kcal_max,
    protein_g_target, protein_g_max, carbs_g_target, fat_g_target, fibre_g_target,
    water_ml_target, sleep_hours_target, sessions_per_week, notes)
  values (uid, 'v1.1', '2026-08-04', 1950, 1900, 2000, 150, 160, 185, 55, 30, 3000, 7.0, 6,
    'Recomp-leaning cut. Stall floor 1800, never below 1500. Protein never cut.')
  returning id into pv;

  -- Step ladder
  insert into step_targets (user_id, effective_from, daily_steps) values
    (uid, '2026-08-04', 4000),
    (uid, '2026-08-18', 6000),
    (uid, '2026-09-01', 7500);

  -- Templates
  -- Week order L-P-P-P-P-L: legs bookend the week, push/pull alternate between
  insert into workout_templates (user_id, plan_version_id, name, day_of_week, focus, sort_order)
    values (uid, pv, 'Legs A + Abs', 1, 'Quads', 1) returning id into t_legs_a;
  insert into workout_templates (user_id, plan_version_id, name, day_of_week, focus, sort_order)
    values (uid, pv, 'Push A', 2, 'Delt priority', 2) returning id into t_push_a;
  insert into workout_templates (user_id, plan_version_id, name, day_of_week, focus, sort_order)
    values (uid, pv, 'Pull A', 3, 'Lat width', 3) returning id into t_pull_a;
  insert into workout_templates (user_id, plan_version_id, name, day_of_week, focus, sort_order)
    values (uid, pv, 'Push B', 4, 'Chest priority', 4) returning id into t_push_b;
  insert into workout_templates (user_id, plan_version_id, name, day_of_week, focus, sort_order)
    values (uid, pv, 'Pull B', 5, 'Back thickness + arms', 5) returning id into t_pull_b;
  insert into workout_templates (user_id, plan_version_id, name, day_of_week, focus, sort_order)
    values (uid, pv, 'Legs B + Abs', 6, 'Hamstrings / glutes', 6) returning id into t_legs_b;

  -- Helper-free inserts: (template, exercise name, order, sets, rep_min, rep_max, rpe, rest_s, start_kg, optional)
  -- PUSH A
  insert into template_exercises (template_id, exercise_id, sort_order, target_sets, rep_min, rep_max, target_rpe, rest_seconds, start_weight_kg, is_optional)
  select t_push_a, id, x.ord, x.s, x.rmin, x.rmax, x.rpe, x.rest, x.kg, x.opt from (values
    ('Seated DB Shoulder Press', 1, 3, 6, 10, 8.0, 165, 12.5, false),
    ('Incline Smith Press (~30°)', 2, 3, 6, 10, 8.0, 150, 45, false),
    ('Flat DB Press', 3, 2, 8, 12, 8.0, 120, 20, false),
    ('Cable Lateral Raise (1-arm)', 4, 4, 12, 20, 9.0, 70, 5, false),
    ('Pec Deck Fly', 5, 2, 10, 15, 8.5, 90, null, false),
    ('Overhead Cable Triceps Ext. (rope)', 6, 3, 10, 15, 8.5, 75, null, false)
  ) x(nm, ord, s, rmin, rmax, rpe, rest, kg, opt)
  join exercises on exercises.name = x.nm and exercises.user_id is null;

  -- PULL A
  insert into template_exercises (template_id, exercise_id, sort_order, target_sets, rep_min, rep_max, target_rpe, rest_seconds, start_weight_kg, is_optional)
  select t_pull_a, id, x.ord, x.s, x.rmin, x.rmax, x.rpe, x.rest, x.kg, x.opt from (values
    ('Pull-Ups', 1, 3, 1, 8, 9.0, 150, null, false),
    ('Lat Pulldown (medium overhand)', 2, 3, 8, 12, 8.0, 120, 42.5, false),
    ('Chest-Supported Row', 3, 3, 8, 12, 8.0, 120, 45, false),
    ('Straight-Arm Cable Pulldown', 4, 2, 12, 15, 9.0, 75, null, false),
    ('Reverse Pec Deck', 5, 3, 12, 20, 9.0, 70, null, false),
    ('Preacher Curl Machine', 6, 3, 8, 12, 8.5, 90, null, false),
    ('Rope Hammer Curl', 7, 2, 10, 15, 9.0, 60, null, false)
  ) x(nm, ord, s, rmin, rmax, rpe, rest, kg, opt)
  join exercises on exercises.name = x.nm and exercises.user_id is null;

  -- LEGS A
  insert into template_exercises (template_id, exercise_id, sort_order, target_sets, rep_min, rep_max, target_rpe, rest_seconds, start_weight_kg, is_optional)
  select t_legs_a, id, x.ord, x.s, x.rmin, x.rmax, x.rpe, x.rest, x.kg, x.opt from (values
    ('Smith Machine Squat', 1, 3, 6, 10, 8.0, 180, 55, false),
    ('Leg Press', 2, 3, 8, 12, 8.0, 150, 155, false),
    ('Leg Extension', 3, 3, 12, 15, 9.0, 75, null, false),
    ('Seated Calf Raise', 4, 4, 10, 15, 9.0, 60, null, false),
    ('Cable Crunch', 5, 3, 10, 15, 8.5, 70, null, false),
    ('Hanging Knee Raise', 6, 3, 8, 15, 9.0, 60, null, false)
  ) x(nm, ord, s, rmin, rmax, rpe, rest, kg, opt)
  join exercises on exercises.name = x.nm and exercises.user_id is null;

  -- PUSH B
  insert into template_exercises (template_id, exercise_id, sort_order, target_sets, rep_min, rep_max, target_rpe, rest_seconds, start_weight_kg, is_optional)
  select t_push_b, id, x.ord, x.s, x.rmin, x.rmax, x.rpe, x.rest, x.kg, x.opt from (values
    ('Flat Smith Bench Press', 1, 4, 5, 8, 8.0, 180, 45, false),
    ('Machine Shoulder Press', 2, 3, 8, 12, 8.0, 120, 50, false),
    ('Low-to-High Cable Fly', 3, 3, 12, 15, 9.0, 75, null, false),
    ('DB Lateral Raise', 4, 4, 10, 15, 9.5, 70, 7.5, false),
    ('Triceps Rope Pushdown', 5, 3, 10, 15, 9.0, 70, null, false),
    ('DB Lateral Partials', 6, 1, 20, 30, 10.0, 60, 5, true)
  ) x(nm, ord, s, rmin, rmax, rpe, rest, kg, opt)
  join exercises on exercises.name = x.nm and exercises.user_id is null;

  -- PULL B
  insert into template_exercises (template_id, exercise_id, sort_order, target_sets, rep_min, rep_max, target_rpe, rest_seconds, start_weight_kg, is_optional)
  select t_pull_b, id, x.ord, x.s, x.rmin, x.rmax, x.rpe, x.rest, x.kg, x.opt from (values
    ('Seated Cable Row (close/neutral)', 1, 4, 6, 10, 8.0, 150, 50, false),
    ('Lat Pulldown (close/neutral)', 2, 3, 8, 12, 8.0, 120, 42.5, false),
    ('High Row Machine', 3, 3, 10, 12, 8.5, 120, null, false),
    ('Reverse Pec Deck', 4, 3, 12, 20, 9.0, 70, null, false),
    ('Incline DB Curl', 5, 3, 8, 12, 8.5, 90, 7.5, false),
    ('Cable Bar Curl', 6, 2, 10, 15, 9.5, 60, null, false)
  ) x(nm, ord, s, rmin, rmax, rpe, rest, kg, opt)
  join exercises on exercises.name = x.nm and exercises.user_id is null;

  -- LEGS B
  insert into template_exercises (template_id, exercise_id, sort_order, target_sets, rep_min, rep_max, target_rpe, rest_seconds, start_weight_kg, is_optional)
  select t_legs_b, id, x.ord, x.s, x.rmin, x.rmax, x.rpe, x.rest, x.kg, x.opt from (values
    ('DB Romanian Deadlift', 1, 3, 8, 12, 7.5, 150, 17.5, false),
    ('Leg Curl', 2, 3, 10, 15, 9.0, 90, null, false),
    ('Hack Squat', 3, 2, 10, 12, 8.0, 150, 65, false),
    ('Standing Calf Raise', 4, 4, 10, 15, 9.0, 60, null, false),
    ('Decline Weighted Sit-Up', 5, 3, 10, 15, 8.5, 75, 2.5, false),
    ('Cable Woodchop (high→low)', 6, 3, 10, 12, 8.0, 60, null, false)
  ) x(nm, ord, s, rmin, rmax, rpe, rest, kg, opt)
  join exercises on exercises.name = x.nm and exercises.user_id is null;

  -- Saved meals (the 5 plan meals)
  insert into saved_meals (user_id, name, meal_slot) values (uid, 'Oats + whey + banana', 'breakfast') returning id into m1;
  insert into saved_meal_items (saved_meal_id, food_id, quantity)
    select m1, id, q from (values ('Oats (dry)', 1.0), ('Milk', 1.0), ('Whey isolate', 1.0), ('Banana', 1.0)) v(nm, q)
    join foods on foods.name = v.nm and foods.user_id is null;

  insert into saved_meals (user_id, name, meal_slot) values (uid, 'Roti + dal + sabzi + curd', 'lunch') returning id into m2;
  insert into saved_meal_items (saved_meal_id, food_id, quantity)
    select m2, id, q from (values ('Roti (phulka)', 2.0), ('Dal (cooked)', 1.5), ('Sabzi (with oil)', 1.0), ('Low-fat curd', 0.75), ('Salad / cucumber', 1.0)) v(nm, q)
    join foods on foods.name = v.nm and foods.user_id is null;

  insert into saved_meals (user_id, name, meal_slot) values (uid, 'Bread + PB + banana', 'pre_workout') returning id into m3;
  insert into saved_meal_items (saved_meal_id, food_id, quantity)
    select m3, id, q from (values ('Brown bread', 2.0), ('Peanut butter', 0.67), ('Banana', 1.0)) v(nm, q)
    join foods on foods.name = v.nm and foods.user_id is null;

  insert into saved_meals (user_id, name, meal_slot) values (uid, 'Post-workout shake', 'post_workout') returning id into m4;
  insert into saved_meal_items (saved_meal_id, food_id, quantity)
    select m4, id, q from (values ('Whey isolate', 1.0)) v(nm, q)
    join foods on foods.name = v.nm and foods.user_id is null;

  insert into saved_meals (user_id, name, meal_slot) values (uid, 'Paneer bhurji + roti', 'dinner') returning id into m5;
  insert into saved_meal_items (saved_meal_id, food_id, quantity)
    select m5, id, q from (values ('High-protein paneer', 1.75), ('Cooking oil', 1.0), ('Roti (phulka)', 1.5), ('Sabzi (with oil)', 0.5)) v(nm, q)
    join foods on foods.name = v.nm and foods.user_id is null;

  -- Supplements
  insert into supplements (user_id, name, dose, schedule) values
    (uid, 'Whey isolate', '1.5–2 scoops', 'daily'),
    (uid, 'Creatine', '5 g', 'daily'),
    (uid, 'Vitamin D3', '2,000 IU with a fat-containing meal', 'daily'),
    (uid, 'Omega-3 (algae)', '250–500 mg EPA+DHA', 'daily'),
    (uid, 'Magnesium glycinate', '200–400 mg', 'pre_bed'),
    (uid, 'Vitamin B12', 'methylcobalamin 500 mcg', '3x_week'),
    (uid, 'Isabgol (psyllium)', '1–2 tsp warm water at night', 'as_needed'),
    (uid, 'Stim-free pre-workout', '1 scoop', 'daily');

  -- Guardrails travel with the data
  insert into coach_notes (user_id, source, category, content) values
    (uid, 'claude', 'nutrition', 'Never program below 1,500 kcal. Stall floor is 1,800. Protein is never the macro that gets cut.'),
    (uid, 'claude', 'training',  'No barbell bench to failure (no spotter). No heavy deadlift PRs during the cut. No heavy weighted side bends. Only clean solo reps count.'),
    (uid, 'claude', 'nutrition', 'Pure vegetarian + dairy. No eggs, meat, fish. Algae-based omega-3 only. No multivitamins — reacts badly; single-ingredient only.'),
    (uid, 'claude', 'general',   'Judge the 7-day weight average, never a single day. Cross-check waist before declaring a stall. Sessions fit the 8–10 PM window, ≤90 min door-to-door.');
end $$;
