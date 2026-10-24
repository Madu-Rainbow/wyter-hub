export type Situacao = "sem_projeto" | "em_andamento" | "entregue" | "encerrado";

export const SITUACOES: { key: Situacao; label: string }[] = [
  { key: "sem_projeto", label: "Sem projeto" },
  { key: "em_andamento", label: "Em andamento" },
  { key: "entregue", label: "Entregue" },
  { key: "encerrado", label: "Encerrado" },
];

export const brl = (v: number | null) =>
  v != null ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—";

export const fmtData = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

export const vigencia = (ini: string, fim: string | null) =>
  `${fmtData(ini)} — ${fim ? fmtData(fim) : "em aberto"}`;

export function SituacaoBadge({ situacao }: { situacao: string }) {
  const label = SITUACOES.find((s) => s.key === situacao)?.label ?? situacao;
  return (
    <span className="inline-block rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-text-muted">
      {label}
    </span>
  );
}

export function Progresso({ entregues, total }: { entregues: number; total: number }) {
  const pct = total > 0 ? Math.round((entregues / total) * 100) : 0;
  return (
    <div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs tabular-nums text-text-muted">
        {entregues}/{total} tarefas entregues
      </p>
    </div>
  );
}
