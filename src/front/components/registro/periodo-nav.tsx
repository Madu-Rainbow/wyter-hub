import Link from "next/link";

const ABAS = [
  ["hoje", "Hoje"],
  ["ontem", "Ontem"],
  ["semana", "Semana"],
] as const;

/** Alternância Hoje/Ontem/Semana + seletor de data. `extra` preserva outros filtros (GET). */
export function PeriodoNav({
  base,
  periodo,
  data,
  extra = {},
}: {
  base: string;
  periodo: string;
  data: string;
  extra?: Record<string, string | undefined>;
}) {
  const qs = (o: Record<string, string>) =>
    `${base}?${new URLSearchParams(Object.entries({ ...extra, ...o }).filter(([, v]) => v) as [string, string][])}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex overflow-hidden rounded-md border border-border text-sm">
        {ABAS.map(([k, l]) => (
          <Link
            key={k}
            href={qs({ periodo: k })}
            aria-current={periodo === k ? "page" : undefined}
            className={`px-3 py-1.5 ${periodo === k ? "bg-accent text-primary-foreground" : "bg-surface text-text hover:bg-secondary"}`}
          >
            {l}
          </Link>
        ))}
      </div>
      <form action={base} className="flex items-center gap-2">
        {Object.entries(extra).map(
          ([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />,
        )}
        <input
          type="date"
          name="data"
          defaultValue={data}
          aria-label="Data"
          className="h-9 rounded-md border border-input bg-surface px-2 text-sm tabular-nums"
        />
        <button
          type="submit"
          className="h-9 rounded-md border border-border bg-surface px-3 text-sm hover:bg-secondary"
        >
          Ir
        </button>
      </form>
    </div>
  );
}
