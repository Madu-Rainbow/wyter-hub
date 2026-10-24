import { formatDataISO } from "@front/lib/tarefas";
import { AlertTriangle, CheckSquare, ListTree, Lock, MessageSquare } from "lucide-react";
import { iniciais, prioridadeBorder, situacaoPrazo, type Tarefa } from "./shared";

export function Avatar({ nome }: { nome: string }) {
  return (
    <span
      title={nome}
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-primary-foreground"
    >
      {iniciais(nome)}
    </span>
  );
}

export function PrazoBadge({ t }: { t: Tarefa }) {
  if (!t.data_prazo) return null;
  const s = situacaoPrazo(t);
  const cor =
    s === "atrasada"
      ? "bg-red-50 text-red-700"
      : s === "proxima"
        ? "bg-amber-50 text-amber-700"
        : "text-text-muted";
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs tabular-nums ${cor}`}>
      {s === "atrasada" ? "Atrasada · " : ""}
      {formatDataISO(t.data_prazo.slice(0, 10))}
    </span>
  );
}

export function TarefaCard({ t, bloqueada }: { t: Tarefa; bloqueada: boolean }) {
  const feitos = t.checklist.filter((i) => i.feito).length;
  return (
    <>
      {t.categoria && (
        <span className="mb-1.5 inline-block rounded bg-secondary px-1.5 py-0.5 text-[11px] text-text-muted">
          {t.categoria}
        </span>
      )}
      {t.chave && (
        <p className="mb-0.5 truncate text-[11px] tabular-nums text-text-muted" title={t.caminho}>
          <span className="font-medium">{t.chave}</span>
          {t.caminho ? ` · ${t.caminho}` : ""}
        </p>
      )}
      <p className="text-sm font-medium text-text">{t.titulo}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-muted">
        <PrazoBadge t={t} />
        {t.checklist.length > 0 && (
          <span
            className={`inline-flex items-center gap-1 tabular-nums ${feitos === t.checklist.length ? "text-green-700" : ""}`}
          >
            <CheckSquare className="size-3" />
            {feitos}/{t.checklist.length}
          </span>
        )}
        {t.sub && (
          <span
            className={`inline-flex items-center gap-1 tabular-nums ${t.sub.feitas === t.sub.total ? "text-green-700" : ""}`}
            title="Subtarefas concluídas"
          >
            <ListTree className="size-3" />
            {t.sub.feitas}/{t.sub.total}
          </span>
        )}
        {t.n_comentarios > 0 && (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <MessageSquare className="size-3" />
            {t.n_comentarios}
          </span>
        )}
        {bloqueada && (
          <span
            className="inline-flex items-center gap-1 text-red-700"
            title="Bloqueada por outra tarefa"
          >
            <Lock className="size-3" />
            Bloqueada
          </span>
        )}
        {t.prioridade === "critica" && (
          <AlertTriangle className="size-3 text-red-600" aria-label="Crítica" />
        )}
        {t.responsavel && (
          <span className="ml-auto">
            <Avatar nome={t.responsavel.nome} />
          </span>
        )}
      </div>
    </>
  );
}

export { prioridadeBorder };
