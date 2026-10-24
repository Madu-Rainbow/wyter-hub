"use client";

import { Button } from "@front/components/ui/button";
import { createClient } from "@front/lib/supabase/client";
import { formatDataISO } from "@front/lib/tarefas";
import { ListTree, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { inputCls, Secao } from "./modal-ui";
import type { Ctx, PessoaOpt, Tarefa } from "./shared";

type Item = {
  id: string;
  texto: string;
  feito: boolean;
  responsavel_id: string | null;
  prazo: string | null;
  pos: number;
};
type Lista = { id: string; titulo: string; pos: number; itens: Item[] };

export async function criarChecklist(ctx: Ctx, tarefaId: string, titulo: string) {
  const { error } = await createClient()
    .from("checklist")
    .insert({
      tarefa_id: tarefaId,
      org_id: ctx.orgId,
      titulo: titulo.trim() || "Checklist",
      pos: Date.now() % 2000000000,
    });
  return error?.message ?? null;
}

/** Checklists multiplas (FR-002-36): titulo, itens com responsavel/prazo, ocultar marcados, converter em subtarefa. */
export function ChecklistsSec({
  tarefa,
  ctx,
  pessoas,
  rev,
  onChange,
  onSubtarefa,
}: {
  tarefa: Tarefa;
  ctx: Ctx;
  pessoas: PessoaOpt[];
  rev: number;
  onChange: () => void;
  onSubtarefa: (
    titulo: string,
    resp: string | null,
    prazo: string | null,
  ) => Promise<string | null>;
}) {
  const ro = ctx.readOnly;
  const [listas, setListas] = useState<Lista[] | null>(null);
  const [ocultar, setOcultar] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const { data, error } = await createClient()
      .from("checklist")
      .select("id, titulo, pos, itens:checklist_item(id, texto, feito, responsavel_id, prazo, pos)")
      .eq("tarefa_id", tarefa.id)
      .order("pos");
    if (error) setErro(error.message);
    setListas(
      ((data ?? []) as unknown as Lista[]).map((l) => ({
        ...l,
        itens: [...l.itens].sort((a, b) => a.pos - b.pos),
      })),
    );
  }, [tarefa.id]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: rev forca recarga
  useEffect(() => {
    void carregar();
  }, [carregar, rev]);

  async function run(p: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await p;
    setErro(error?.message ?? null);
    await carregar();
    onChange();
  }
  const sb = createClient();

  if (!listas?.length) return erro ? <p className="text-sm text-red-600">{erro}</p> : null;
  return (
    <div className="space-y-5">
      {listas.map((l) => {
        const feitos = l.itens.filter((i) => i.feito).length;
        const pct = l.itens.length ? Math.round((feitos / l.itens.length) * 100) : 0;
        const oculta = ocultar.has(l.id);
        return (
          <Secao
            key={l.id}
            titulo={l.titulo}
            extra={
              <div className="flex items-center gap-1">
                {feitos > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setOcultar((s) => {
                        const n = new Set(s);
                        if (!n.delete(l.id)) n.add(l.id);
                        return n;
                      })
                    }
                  >
                    {oculta ? `Mostrar marcados (${feitos})` : "Ocultar marcados"}
                  </Button>
                )}
                {!ro && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const t = window.prompt("Título da checklist", l.titulo)?.trim();
                        if (t) void run(sb.from("checklist").update({ titulo: t }).eq("id", l.id));
                      }}
                    >
                      Renomear
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() =>
                        window.confirm(`Excluir a checklist "${l.titulo}"?`) &&
                        void run(sb.from("checklist").delete().eq("id", l.id))
                      }
                    >
                      Excluir
                    </Button>
                  </>
                )}
              </div>
            }
          >
            <div className="flex items-center gap-2 text-xs tabular-nums text-text-muted">
              <span className="w-8">{pct}%</span>
              <div
                className="h-1.5 flex-1 overflow-hidden rounded bg-secondary"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progresso de ${l.titulo}`}
              >
                <div
                  className={`h-full ${pct === 100 ? "bg-green-600" : "bg-accent"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <ul className="space-y-1">
              {l.itens
                .filter((i) => !(oculta && i.feito))
                .map((i) => (
                  <li
                    key={i.id}
                    className="group flex flex-wrap items-center gap-2 rounded px-1 py-0.5 hover:bg-secondary/50"
                  >
                    <input
                      type="checkbox"
                      aria-label={i.texto}
                      checked={i.feito}
                      disabled={ro}
                      onChange={() =>
                        void run(
                          sb.from("checklist_item").update({ feito: !i.feito }).eq("id", i.id),
                        )
                      }
                    />
                    <span
                      className={`min-w-0 flex-1 text-sm ${i.feito ? "text-text-muted line-through" : "text-text"}`}
                    >
                      {i.texto}
                    </span>
                    {ro ? (
                      <>
                        {i.responsavel_id && (
                          <span className="text-xs text-text-muted">
                            {pessoas.find((p) => p.id === i.responsavel_id)?.nome}
                          </span>
                        )}
                        {i.prazo && (
                          <span className="text-xs tabular-nums text-text-muted">
                            {formatDataISO(i.prazo)}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <select
                          aria-label="Responsável do item"
                          value={i.responsavel_id ?? ""}
                          onChange={(e) =>
                            void run(
                              sb
                                .from("checklist_item")
                                .update({ responsavel_id: e.target.value || null })
                                .eq("id", i.id),
                            )
                          }
                          className="max-w-28 rounded border border-border bg-bg px-1 py-0.5 text-xs"
                        >
                          <option value="">Sem resp.</option>
                          {pessoas.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome}
                            </option>
                          ))}
                        </select>
                        <input
                          type="date"
                          aria-label="Prazo do item"
                          value={i.prazo ?? ""}
                          onChange={(e) =>
                            void run(
                              sb
                                .from("checklist_item")
                                .update({ prazo: e.target.value || null })
                                .eq("id", i.id),
                            )
                          }
                          className="rounded border border-border bg-bg px-1 py-0.5 text-xs"
                        />
                        {!tarefa.parent_id && (
                          <button
                            type="button"
                            title="Converter em subtarefa"
                            aria-label="Converter em subtarefa"
                            className="text-text-muted hover:text-accent"
                            onClick={async () => {
                              const e = await onSubtarefa(i.texto, i.responsavel_id, i.prazo);
                              if (e) return setErro(e);
                              await run(sb.from("checklist_item").delete().eq("id", i.id));
                            }}
                          >
                            <ListTree className="size-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label="Remover item"
                          onClick={() =>
                            void run(sb.from("checklist_item").delete().eq("id", i.id))
                          }
                          className="text-text-muted hover:text-red-600"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </>
                    )}
                  </li>
                ))}
            </ul>
            {!ro && (
              <NovoItem
                onAdd={(texto) =>
                  run(
                    sb.from("checklist_item").insert({
                      checklist_id: l.id,
                      org_id: ctx.orgId,
                      texto,
                      pos: (l.itens.at(-1)?.pos ?? 0) + 1,
                    }),
                  )
                }
              />
            )}
          </Secao>
        );
      })}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  );
}

function NovoItem({ onAdd }: { onAdd: (t: string) => Promise<void> }) {
  const [t, setT] = useState("");
  return (
    <input
      value={t}
      onChange={(e) => setT(e.target.value)}
      onKeyDown={async (e) => {
        if (e.key === "Enter" && t.trim()) {
          e.preventDefault();
          const x = t.trim();
          setT("");
          await onAdd(x);
        }
      }}
      placeholder="Adicionar item (Enter)"
      className={inputCls}
    />
  );
}
