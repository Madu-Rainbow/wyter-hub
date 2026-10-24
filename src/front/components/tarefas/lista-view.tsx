"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { AdicaoRapida } from "./adicao-rapida";
import { type Grupo, type PessoaOpt, STATUS_OPTS, type Tarefa } from "./shared";
import { TarefaCard } from "./tarefa-card";

const sel =
  "rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-text hover:border-border focus:border-accent focus:outline-none disabled:opacity-100";

export function ListaView({
  grupos,
  pessoas,
  readOnly,
  bloqueadas,
  onOpen,
  onPatch,
  onCreate,
}: {
  grupos: Grupo[];
  pessoas: PessoaOpt[];
  readOnly: boolean;
  bloqueadas: Set<string>;
  onOpen: (t: Tarefa) => void;
  onPatch: (t: Tarefa, patch: Partial<Tarefa>) => void;
  onCreate: (titulo: string, grupoKey: string) => void;
}) {
  const [fechados, setFechados] = useState<Set<string>>(new Set());
  const alterna = (k: string) =>
    setFechados((s) => {
      const n = new Set(s);
      if (!n.delete(k)) n.add(k);
      return n;
    });

  return (
    <div className="space-y-3">
      {grupos.map((g) => {
        const fechado = fechados.has(g.key);
        return (
          <section key={g.key} className="rounded-md border border-border bg-surface">
            <button
              type="button"
              onClick={() => alterna(g.key)}
              aria-expanded={!fechado}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-text"
            >
              {fechado ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
              {g.label}
              <span className="text-xs font-normal tabular-nums text-text-muted">
                {g.items.length}
              </span>
            </button>
            {!fechado && (
              <div className="border-t border-border">
                {g.items.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-3 py-2 last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() => onOpen(t)}
                      className="min-w-0 flex-1 basis-56 text-left"
                    >
                      <TarefaCard t={t} bloqueada={bloqueadas.has(t.id)} />
                    </button>
                    <select
                      aria-label="Status"
                      className={sel}
                      value={t.status}
                      disabled={readOnly}
                      onChange={(e) => onPatch(t, { status: e.target.value })}
                    >
                      {STATUS_OPTS.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Responsável"
                      className={sel}
                      value={t.responsavel_id ?? ""}
                      disabled={readOnly}
                      onChange={(e) => onPatch(t, { responsavel_id: e.target.value || null })}
                    >
                      <option value="">Sem responsável</option>
                      {pessoas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label="Prazo"
                      type="date"
                      className={sel}
                      value={t.data_prazo?.slice(0, 10) ?? ""}
                      disabled={readOnly}
                      onChange={(e) => onPatch(t, { data_prazo: e.target.value || null })}
                    />
                  </div>
                ))}
                {g.items.length === 0 && (
                  <p className="px-3 py-2 text-xs text-text-muted">Nenhuma tarefa.</p>
                )}
                {!readOnly && (
                  <div className="px-3 pb-2">
                    <AdicaoRapida onAdd={(titulo) => onCreate(titulo, g.key)} />
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
