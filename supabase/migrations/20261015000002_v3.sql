-- =====================================================================
-- FitTracker · v3 (deportes, cuerpo, fotos, resumen, recordatorios)
-- Ejecutar en Supabase → SQL Editor → Run. Se puede correr varias veces.
-- Las tablas de deportes, medidas, fotos y recordatorios ya existen desde
-- el esquema inicial; aquí solo se ajusta lo que necesitan los recordatorios.
-- =====================================================================

-- Evita mandar el mismo recordatorio dos veces el mismo día.
alter table public.reminders add column if not exists last_sent_at timestamptz;

-- Días de la semana como en JavaScript: 0 = domingo … 6 = sábado.
comment on column public.reminders.weekdays is '0 = domingo, 1 = lunes … 6 = sábado';

create index if not exists reminders_enabled_idx on public.reminders (enabled) where enabled;
create index if not exists body_metrics_user_idx on public.body_metrics (user_id, measured_on desc);
