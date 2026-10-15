const WEEKS = 20;
const DAY = 86_400_000;
const ROW_LABELS = ["Lu", "", "Mi", "", "Vi", "", "Do"];

/** Mapa de constancia: una columna por semana (lunes a domingo). */
export function ConsistencyMap({
  days,
  today,
  stats,
}: {
  days: { day: string; kind: "gym" | "sport" }[];
  today: string;
  stats: { trained: number; longest: number; current: number };
}) {
  const kinds = new Map<string, Set<string>>();
  days.forEach((d) => kinds.set(d.day, (kinds.get(d.day) ?? new Set()).add(d.kind)));

  const todayTime = Date.parse(`${today}T00:00:00Z`);
  const mondayOffset = (new Date(todayTime).getUTCDay() + 6) % 7;
  const start = todayTime - (mondayOffset + (WEEKS - 1) * 7) * DAY;
  const monthFmt = new Intl.DateTimeFormat("es-CO", { month: "short", timeZone: "UTC" });

  const columns = Array.from({ length: WEEKS }, (_, w) => {
    const cells = Array.from({ length: 7 }, (_, d) => {
      const date = new Date(start + (w * 7 + d) * DAY).toISOString().slice(0, 10);
      const k = kinds.get(date);
      return { date, gym: k?.has("gym") ?? false, sport: k?.has("sport") ?? false, future: date > today };
    });
    const first = new Date(start + w * 7 * DAY);
    const label = w === 0 || first.getUTCDate() <= 7 ? monthFmt.format(first).replace(".", "") : "";
    return { cells, label };
  });

  return (
    <section className="card p-4" aria-label="Constancia de las últimas 20 semanas">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-[15px] font-semibold">Constancia</h2>
        <span className="text-[11px] text-sub">últimas {WEEKS} semanas</span>
      </div>

      <div className="mt-3 grid grid-cols-[18px_1fr] gap-x-1.5">
        <span />
        <div className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-[3px] pb-1 text-[9px] font-semibold text-sub capitalize">
          {columns.map((c, i) => (
            <span key={i} className="overflow-visible whitespace-nowrap">
              {c.label}
            </span>
          ))}
        </div>
        <div className="grid grid-rows-7 gap-[3px] text-[9px] leading-none font-semibold text-sub">
          {ROW_LABELS.map((l, i) => (
            <span key={i} className="flex items-center">
              {l}
            </span>
          ))}
        </div>
        <div className="grid grid-flow-col grid-cols-[repeat(20,minmax(0,1fr))] grid-rows-7 gap-[3px]">
          {columns.flatMap((c) =>
            c.cells.map((cell) => (
              <i
                key={cell.date}
                title={cell.date}
                className={`aspect-square rounded-[3px] ${
                  cell.future
                    ? "bg-transparent"
                    : cell.gym
                      ? "bg-a1"
                      : cell.sport
                        ? "bg-warm"
                        : "bg-surface-2"
                } ${cell.date === today ? "ring-1 ring-fg/60 ring-offset-1 ring-offset-surface" : ""}`}
              />
            )),
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-sub">
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2.5 rounded-[3px] bg-a1" /> Gimnasio
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2.5 rounded-[3px] bg-warm" /> Deporte
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
        {[
          { label: "días entrenados", value: stats.trained },
          { label: "racha actual", value: stats.current },
          { label: "racha más larga", value: stats.longest },
        ].map((s) => (
          <div key={s.label}>
            <b className="num block text-xl font-bold">{s.value}</b>
            <small className="text-[10.5px] text-sub">{s.label}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
