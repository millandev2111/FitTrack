-- =====================================================================
-- FitTracker · nueva regla de récords personales
-- Ejecutar en Supabase → SQL Editor → Run. Se puede correr varias veces.
--
-- Solo es récord si usas tu peso más alto o más:
--   · weight: levantas más peso que nunca en ese ejercicio.
--   · reps:   con tu peso máximo de siempre, haces más repeticiones que nunca.
-- Bajar el peso nunca da récord, aunque hagas más repeticiones.
-- El 1RM estimado se sigue mostrando en las gráficas, pero ya no genera récords
-- (con poco peso y muchas reps la fórmula da números inflados).
-- Cada serie genera como máximo un récord.
-- =====================================================================

create or replace function public.detect_personal_records()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  prev_max numeric;
  prev_reps integer;
begin
  delete from public.personal_records where set_id = new.id;

  if not new.completed or new.set_type = 'warmup'
     or new.weight_kg is null or new.reps is null or new.reps = 0 then
    return null;
  end if;

  -- Peso más alto que habías levantado antes de esta serie
  select max(s.weight_kg) into prev_max
  from public.sets s
  where s.user_id = new.user_id and s.exercise_id = new.exercise_id
    and s.completed and s.set_type <> 'warmup' and s.reps > 0
    and s.id <> new.id and s.performed_at < new.performed_at;

  -- Primera vez con el ejercicio: no hay marca que superar
  if prev_max is null then
    return null;
  end if;

  -- Más peso que nunca
  if new.weight_kg > prev_max + 0.001 then
    insert into public.personal_records (user_id, exercise_id, set_id, type, value, previous_value, weight_kg, reps, achieved_at)
    values (new.user_id, new.exercise_id, new.id, 'weight', new.weight_kg, prev_max, new.weight_kg, new.reps, new.performed_at);
    return null;
  end if;

  -- Mismo peso máximo, más repeticiones que nunca con ese peso
  if abs(new.weight_kg - prev_max) <= 0.001 then
    select max(s.reps) into prev_reps
    from public.sets s
    where s.user_id = new.user_id and s.exercise_id = new.exercise_id
      and s.completed and s.set_type <> 'warmup'
      and abs(s.weight_kg - prev_max) <= 0.001
      and s.id <> new.id and s.performed_at < new.performed_at;

    if prev_reps is not null and new.reps > prev_reps then
      insert into public.personal_records (user_id, exercise_id, set_id, type, value, previous_value, weight_kg, reps, achieved_at)
      values (new.user_id, new.exercise_id, new.id, 'reps', new.reps, prev_reps, new.weight_kg, new.reps, new.performed_at);
    end if;
  end if;

  -- Con menos peso que tu máximo: nunca es récord
  return null;
end;
$$;

-- Recalcula los récords que ya tenías con la regla nueva.
-- La comparación usa solo series anteriores (por fecha), así que el orden no importa.
delete from public.personal_records;
update public.sets set completed = completed where completed;
