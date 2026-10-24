export function Progresso({ feitas, total }: { feitas: number; total: number }) {
  if (!total) return <span className="text-xs text-text-muted">Sem tarefas</span>;
  const pct = Math.round((feitas / total) * 100);
  return (
    <div className="flex items-center gap-2" title={`${feitas} de ${total} tarefas entregues`}>
      <div
        className="h-1.5 w-20 rounded bg-secondary"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-1.5 rounded bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-text-muted tabular-nums">
        {feitas}/{total}
      </span>
    </div>
  );
}
