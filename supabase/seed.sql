-- =====================================================================
-- FitTracker · catálogo global de ejercicios
-- Ejecutar después del esquema. Se puede correr varias veces sin duplicar.
-- =====================================================================

insert into public.exercises (slug, name, primary_muscle, secondary_muscles, equipment, tracking, is_unilateral, default_rest_seconds)
values
  -- Pecho
  ('bench-press',              'Press de banca',                      'chest',      '{triceps,shoulders}', 'barbell',       'weight_reps',     false, 150),
  ('incline-bench-press',      'Press inclinado con barra',           'chest',      '{shoulders,triceps}', 'barbell',       'weight_reps',     false, 150),
  ('decline-bench-press',      'Press declinado con barra',           'chest',      '{triceps}',           'barbell',       'weight_reps',     false, 120),
  ('dumbbell-bench-press',     'Press de banca con mancuernas',       'chest',      '{triceps,shoulders}', 'dumbbell',      'weight_reps',     false, 120),
  ('incline-dumbbell-press',   'Press inclinado con mancuernas',      'chest',      '{shoulders,triceps}', 'dumbbell',      'weight_reps',     false, 120),
  ('smith-incline-press',      'Press inclinado en Smith',            'chest',      '{shoulders,triceps}', 'smith_machine', 'weight_reps',     false, 120),
  ('machine-chest-press',      'Press de pecho en máquina',           'chest',      '{triceps}',           'machine',       'weight_reps',     false, 90),
  ('dumbbell-fly',             'Aperturas con mancuernas',            'chest',      '{}',                  'dumbbell',      'weight_reps',     false, 90),
  ('cable-crossover',          'Cruce de poleas',                     'chest',      '{}',                  'cable',         'weight_reps',     false, 75),
  ('pec-deck',                 'Contractor de pecho (pec deck)',      'chest',      '{}',                  'machine',       'weight_reps',     false, 75),
  ('chest-dip',                'Fondos en paralelas',                 'chest',      '{triceps,shoulders}', 'bodyweight',    'bodyweight_reps', false, 120),
  ('push-up',                  'Flexiones de pecho',                  'chest',      '{triceps,shoulders}', 'bodyweight',    'bodyweight_reps', false, 60),

  -- Espalda
  ('pull-up',                  'Dominadas',                           'back',       '{biceps}',            'bodyweight',    'bodyweight_reps', false, 120),
  ('chin-up',                  'Dominadas supinas',                   'back',       '{biceps}',            'bodyweight',    'bodyweight_reps', false, 120),
  ('lat-pulldown',             'Jalón al pecho',                      'back',       '{biceps}',            'cable',         'weight_reps',     false, 90),
  ('close-grip-pulldown',      'Jalón con agarre cerrado',            'back',       '{biceps}',            'cable',         'weight_reps',     false, 90),
  ('barbell-row',              'Remo con barra',                      'back',       '{biceps,lower_back}', 'barbell',       'weight_reps',     false, 120),
  ('dumbbell-row',             'Remo con mancuerna',                  'back',       '{biceps}',            'dumbbell',      'weight_reps',     true,  90),
  ('seated-cable-row',         'Remo en polea baja',                  'back',       '{biceps}',            'cable',         'weight_reps',     false, 90),
  ('machine-row',              'Remo en máquina',                     'back',       '{biceps}',            'machine',       'weight_reps',     false, 90),
  ('t-bar-row',                'Remo en T',                           'back',       '{biceps,lower_back}', 'barbell',       'weight_reps',     false, 120),
  ('straight-arm-pulldown',    'Pullover en polea',                   'back',       '{}',                  'cable',         'weight_reps',     false, 75),
  ('deadlift',                 'Peso muerto',                         'back',       '{hamstrings,glutes,lower_back,traps}', 'barbell', 'weight_reps', false, 180),
  ('back-extension',           'Hiperextensiones',                    'lower_back', '{glutes,hamstrings}', 'bodyweight',    'bodyweight_reps', false, 75),
  ('barbell-shrug',            'Encogimientos con barra',             'traps',      '{}',                  'barbell',       'weight_reps',     false, 75),
  ('dumbbell-shrug',           'Encogimientos con mancuernas',        'traps',      '{}',                  'dumbbell',      'weight_reps',     false, 75),

  -- Hombro
  ('overhead-press',           'Press militar con barra',             'shoulders',  '{triceps}',           'barbell',       'weight_reps',     false, 150),
  ('dumbbell-shoulder-press',  'Press de hombro con mancuernas',      'shoulders',  '{triceps}',           'dumbbell',      'weight_reps',     false, 120),
  ('machine-shoulder-press',   'Press de hombro en máquina',          'shoulders',  '{triceps}',           'machine',       'weight_reps',     false, 90),
  ('arnold-press',             'Press Arnold',                        'shoulders',  '{triceps}',           'dumbbell',      'weight_reps',     false, 90),
  ('lateral-raise',            'Elevaciones laterales',               'shoulders',  '{}',                  'dumbbell',      'weight_reps',     false, 60),
  ('cable-lateral-raise',      'Elevaciones laterales en polea',      'shoulders',  '{}',                  'cable',         'weight_reps',     true,  60),
  ('front-raise',              'Elevaciones frontales',               'shoulders',  '{}',                  'dumbbell',      'weight_reps',     false, 60),
  ('reverse-fly',              'Pájaros (aperturas invertidas)',      'shoulders',  '{back}',              'dumbbell',      'weight_reps',     false, 60),
  ('face-pull',                'Face pull',                           'shoulders',  '{traps,back}',        'cable',         'weight_reps',     false, 60),

  -- Bíceps
  ('barbell-curl',             'Curl con barra',                      'biceps',     '{forearms}',          'barbell',       'weight_reps',     false, 75),
  ('ez-bar-curl',              'Curl con barra Z',                    'biceps',     '{forearms}',          'ez_bar',        'weight_reps',     false, 75),
  ('dumbbell-curl',            'Curl con mancuernas',                 'biceps',     '{forearms}',          'dumbbell',      'weight_reps',     false, 75),
  ('hammer-curl',              'Curl martillo',                       'biceps',     '{forearms}',          'dumbbell',      'weight_reps',     false, 75),
  ('preacher-curl',            'Curl en banco Scott',                 'biceps',     '{}',                  'ez_bar',        'weight_reps',     false, 75),
  ('cable-curl',               'Curl en polea',                       'biceps',     '{}',                  'cable',         'weight_reps',     false, 60),
  ('concentration-curl',       'Curl concentrado',                    'biceps',     '{}',                  'dumbbell',      'weight_reps',     true,  60),

  -- Tríceps
  ('triceps-pushdown',         'Extensión de tríceps en polea',       'triceps',    '{}',                  'cable',         'weight_reps',     false, 60),
  ('overhead-cable-extension', 'Extensión de tríceps sobre la cabeza en polea', 'triceps', '{}',          'cable',         'weight_reps',     false, 60),
  ('skull-crusher',            'Press francés',                       'triceps',    '{}',                  'ez_bar',        'weight_reps',     false, 75),
  ('overhead-dumbbell-ext',    'Extensión de tríceps con mancuerna',  'triceps',    '{}',                  'dumbbell',      'weight_reps',     false, 60),
  ('triceps-kickback',         'Patada de tríceps',                   'triceps',    '{}',                  'dumbbell',      'weight_reps',     true,  60),
  ('close-grip-bench',         'Press de banca agarre cerrado',       'triceps',    '{chest,shoulders}',   'barbell',       'weight_reps',     false, 120),
  ('bench-dip',                'Fondos en banco',                     'triceps',    '{chest}',             'bodyweight',    'bodyweight_reps', false, 60),

  -- Antebrazo
  ('wrist-curl',               'Curl de muñeca',                      'forearms',   '{}',                  'dumbbell',      'weight_reps',     false, 45),
  ('farmer-walk',              'Paseo del granjero',                  'forearms',   '{traps,full_body}',   'dumbbell',      'distance_time',   false, 90),

  -- Piernas
  ('back-squat',               'Sentadilla',                          'quads',      '{glutes,hamstrings,lower_back}', 'barbell', 'weight_reps', false, 180),
  ('front-squat',              'Sentadilla frontal',                  'quads',      '{glutes,abs}',        'barbell',       'weight_reps',     false, 150),
  ('hack-squat',               'Sentadilla hack',                     'quads',      '{glutes}',            'machine',       'weight_reps',     false, 120),
  ('goblet-squat',             'Sentadilla goblet',                   'quads',      '{glutes}',            'kettlebell',    'weight_reps',     false, 90),
  ('smith-squat',              'Sentadilla en Smith',                 'quads',      '{glutes}',            'smith_machine', 'weight_reps',     false, 120),
  ('leg-press',                'Prensa de piernas',                   'quads',      '{glutes}',            'machine',       'weight_reps',     false, 120),
  ('bulgarian-split-squat',    'Sentadilla búlgara',                  'quads',      '{glutes}',            'dumbbell',      'weight_reps',     true,  90),
  ('walking-lunge',            'Zancadas',                            'quads',      '{glutes}',            'dumbbell',      'weight_reps',     true,  90),
  ('leg-extension',            'Extensión de cuádriceps',             'quads',      '{}',                  'machine',       'weight_reps',     false, 75),
  ('romanian-deadlift',        'Peso muerto rumano',                  'hamstrings', '{glutes,lower_back}', 'barbell',       'weight_reps',     false, 120),
  ('lying-leg-curl',           'Curl femoral acostado',               'hamstrings', '{}',                  'machine',       'weight_reps',     false, 75),
  ('seated-leg-curl',          'Curl femoral sentado',                'hamstrings', '{}',                  'machine',       'weight_reps',     false, 75),
  ('hip-thrust',               'Hip thrust',                          'glutes',     '{hamstrings}',        'barbell',       'weight_reps',     false, 120),
  ('glute-kickback',           'Patada de glúteo en polea',           'glutes',     '{}',                  'cable',         'weight_reps',     true,  60),
  ('hip-abduction',            'Abductores en máquina',               'glutes',     '{}',                  'machine',       'weight_reps',     false, 60),
  ('hip-adduction',            'Aductores en máquina',                'adductors',  '{}',                  'machine',       'weight_reps',     false, 60),
  ('standing-calf-raise',      'Elevación de talones de pie',         'calves',     '{}',                  'machine',       'weight_reps',     false, 60),
  ('seated-calf-raise',        'Elevación de talones sentado',        'calves',     '{}',                  'machine',       'weight_reps',     false, 60),

  -- Core
  ('plank',                    'Plancha',                             'abs',        '{obliques}',          'bodyweight',    'time',            false, 60),
  ('side-plank',               'Plancha lateral',                     'obliques',   '{abs}',               'bodyweight',    'time',            true,  45),
  ('crunch',                   'Crunch abdominal',                    'abs',        '{}',                  'bodyweight',    'bodyweight_reps', false, 45),
  ('cable-crunch',             'Crunch en polea',                     'abs',        '{}',                  'cable',         'weight_reps',     false, 60),
  ('hanging-leg-raise',        'Elevación de piernas colgado',        'abs',        '{}',                  'bodyweight',    'bodyweight_reps', false, 60),
  ('ab-wheel',                 'Rueda abdominal',                     'abs',        '{}',                  'other',         'bodyweight_reps', false, 60),
  ('russian-twist',            'Giros rusos',                         'obliques',   '{abs}',               'bodyweight',    'bodyweight_reps', false, 45),
  ('pallof-press',             'Press Pallof',                        'obliques',   '{abs}',               'cable',         'weight_reps',     true,  45),

  -- Cardio en el gimnasio
  ('treadmill',                'Caminadora',                          'cardio',     '{}',                  'machine',       'distance_time',   false, 0),
  ('stationary-bike',          'Bicicleta estática',                  'cardio',     '{}',                  'machine',       'distance_time',   false, 0),
  ('elliptical',               'Elíptica',                            'cardio',     '{}',                  'machine',       'distance_time',   false, 0),
  ('rowing-machine',           'Remo ergómetro',                      'cardio',     '{back}',              'machine',       'distance_time',   false, 0),
  ('stair-climber',            'Escaladora',                          'cardio',     '{glutes,quads}',      'machine',       'time',            false, 0),
  ('jump-rope',                'Saltar la cuerda',                    'cardio',     '{calves}',            'other',         'time',            false, 60)
on conflict (slug) where user_id is null do nothing;
