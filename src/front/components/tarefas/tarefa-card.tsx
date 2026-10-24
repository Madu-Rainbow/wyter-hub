import { formatDataISO } from "@front/lib/tarefas";
import { AlertTriangle, CheckSquare, ListTree, Lock, MessageSquare, Paperclip } from "lucide-react";
import { COR_ETIQUETA, iniciais, prioridadeBorder, situacaoPrazo, type Tarefa } from "./shared";

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
  if (!t.data_prazo && !t.data_inicio) return null;
  const s = situacaoPrazo(t);
  const entregue = !!t.entregue_em;
  const cor = entregue
    ? "bg-green-50 text-green-700"
    : s === "atrasada"
      ? "bg-red-50 text-red-700"
      : s === "proxima"
        ? "bg-amber-50 text-amber-700"
        : "text-text-muted";
  const ini = t.data_inicio?.slice(0, 10);
  const fim = t.data_prazo?.slice(0, 10);
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs tabular-nums ${cor}`}>
      {entregue
        ? "Entregue · "
        : s === "atrasada"
          ? "Atrasada · "
          : s === "proxima"
            ? "Vence em breve · "
            : ""}
      {ini && fim ? `${formatDataISO(ini).slice(0, 5)} - ` : ini && !fim ? "Início " : ""}
      {(fim ?? ini) && formatDataISO((fim ?? ini) as string)}
      {fim && t.prazo_hora ? ` ${t.prazo_hora.slice(0, 5)}` : ""}
    </span>
  );
}

export function TarefaCard({
  t,
  bloqueada,
  capaUrl,
}: {
  t: Tarefa;
  bloqueada: boolean;
  capaUrl?: string;
}) {
  const feitos = t.checklist.filter((i) => i.feito).length;
  const pessoas = [
    ...(t.responsavel_id && t.responsavel
      ? [{ id: t.responsavel_id, nome: t.responsavel.nome }]
      : []),
    ...t.membros.filter((m) => m.id !== t.responsavel_id),
  ];
  return (
    <div className={t.arquivada_em ? "opacity-60" : ""}>
      {capaUrl && (
        // biome-ignore lint/performance/noImgElement: URL assinada do Storage
        <img
          src={capaUrl}
          alt=""
          className="-mx-3 -mt-3 mb-2 h-24 w-[calc(100%+1.5rem)] rounded-t-md object-cover"
        />
      )}
      {t.etiquetas.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {t.etiquetas.map((e) => (
            <span
              key={e.id}
              className={`rounded px-1.5 py-0.5 text-[11px] ${COR_ETIQUETA[e.cor] ?? COR_ETIQUETA.azul}`}
            >
              {e.nome}
            </span>
          ))}
        </div>
      )}
      {t.arquivada_em && (
        <span className="mb-1 inline-block text-[11px] font-medium text-text-muted">Arquivada</span>
      )}
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
        {t.n_anexos > 0 && (
          <span className="inline-flex items-center gap-1 tabular-nums" title="Anexos">
            <Paperclip className="size-3" />
            {t.n_anexos}
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
        {pessoas.length > 0 && (
          <span className="ml-auto flex -space-x-1">
            {pessoas.slice(0, 4).map((p) => (
              <Avatar key={p.id} nome={p.nome} />
            ))}
            {pessoas.length > 4 && (
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-secondary text-[10px]">
                +{pessoas.length - 4}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

export { prioridadeBorder };
