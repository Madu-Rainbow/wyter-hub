import {
  chaveDe,
  descreve,
  diaCuiaba,
  type Ev,
  horaCuiaba,
  mascarar,
  type TarefaInfo,
} from "@front/lib/registro";
import { formatDataISO } from "@front/lib/tarefas";
import { trabalhoHref } from "@front/lib/trabalho";
import {
  CalendarClock,
  CheckCircle2,
  MessageSquare,
  MoveRight,
  Pencil,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";

const ICONES: Record<string, React.ComponentType<{ className?: string }>> = {
  concluiu: CheckCircle2,
  comentou: MessageSquare,
  moveu: MoveRight,
  reatribuiu: UserRound,
  reagendou: CalendarClock,
  criou: Plus,
  excluiu: Trash2,
};

/** Eventos agrupados por cliente > projeto, em ordem cronológica. */
export function LinhaTempo({
  eventos,
  tarefas,
  pessoas,
  clientes,
  mostrarDia,
}: {
  eventos: Ev[];
  tarefas: Map<string, TarefaInfo>;
  pessoas: Map<string, string>;
  clientes: Map<string, string>;
  mostrarDia?: boolean;
}) {
  if (eventos.length === 0)
    return <p className="p-4 text-sm text-text-muted">Nenhuma atividade no período.</p>;

  const grupos = new Map<string, Map<string, Ev[]>>();
  for (const e of eventos) {
    const t = tarefas.get(e.entidade_id);
    const c = e.cliente_id ?? t?.cliente_id ?? "";
    const pr = e.projeto_id ?? t?.projeto_id ?? "";
    const g = grupos.get(c) ?? new Map<string, Ev[]>();
    g.set(pr, [...(g.get(pr) ?? []), e]);
    grupos.set(c, g);
  }

  return (
    <div className="space-y-5">
      {[...grupos].map(([cid, projetos]) => (
        <section key={cid}>
          <h3 className="mb-2 font-title text-base text-text">
            {clientes.get(cid) ?? "Sem cliente"}
          </h3>
          {[...projetos].map(([pid, evs]) => {
            const nomeProj = [...tarefas.values()].find((t) => t.projeto_id === pid)?.projeto_nome;
            return (
              <div key={pid} className="mb-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-text-muted">
                  {nomeProj ?? "Sem projeto"}
                </p>
                <ul className="divide-y divide-border rounded-md border border-border bg-surface">
                  {evs.map((e) => {
                    const t = tarefas.get(e.entidade_id);
                    const Icone = ICONES[e.verbo] ?? Pencil;
                    const txt =
                      typeof e.depois?.texto === "string" ? mascarar(e.depois.texto) : null;
                    return (
                      <li key={e.id} className="flex items-start gap-2 px-3 py-2 text-sm">
                        <Icone className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden />
                        <span className="w-24 shrink-0 text-xs tabular-nums text-text-muted">
                          {mostrarDia && `${formatDataISO(diaCuiaba(e.quando)).slice(0, 5)} `}
                          {horaCuiaba(e.quando)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="text-text-muted">
                            {mostrarDia && e.quem_id ? `${pessoas.get(e.quem_id) ?? ""} ` : ""}
                            {descreve(e, pessoas)}
                          </span>{" "}
                          {t ? (
                            <Link
                              href={trabalhoHref({ tarefa: chaveDe(t) })}
                              className="text-accent hover:underline"
                            >
                              {chaveDe(t)} {mascarar(t.titulo)}
                            </Link>
                          ) : (
                            <span className="text-text-muted">(tarefa removida)</span>
                          )}
                          {txt && (
                            <span className="block truncate text-xs text-text-muted">{txt}</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
