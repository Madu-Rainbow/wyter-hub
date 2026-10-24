"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState } from "react";
import { prioridadeLabels, statusLabels, type Tarefa } from "./shared";
import { PrazoBadge } from "./tarefa-card";

type Col = { key: string; label: string; valor: (t: Tarefa) => string | number };
const ORDEM_PRIO: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 };

const COLS: Col[] = [
  { key: "chave", label: "Chave", valor: (t) => t.chave ?? "" },
  { key: "titulo", label: "Título", valor: (t) => t.titulo.toLowerCase() },
  { key: "status", label: "Status", valor: (t) => statusLabels[t.status] ?? t.status },
  { key: "prioridade", label: "Prioridade", valor: (t) => ORDEM_PRIO[t.prioridade] ?? 9 },
  {
    key: "responsavel",
    label: "Responsável",
    valor: (t) => t.responsavel?.nome.toLowerCase() ?? "￿",
  },
  { key: "categoria", label: "Categoria", valor: (t) => t.categoria?.toLowerCase() ?? "￿" },
  { key: "prazo", label: "Prazo", valor: (t) => t.data_prazo ?? "￿" },
  {
    key: "checklist",
    label: "Checklist",
    valor: (t) =>
      t.checklist.length ? t.checklist.filter((i) => i.feito).length / t.checklist.length : -1,
  },
  { key: "estimativa", label: "Est. (h)", valor: (t) => t.estimativa_horas ?? -1 },
];

export function TabelaView({
  tarefas,
  onOpen,
}: {
  tarefas: Tarefa[];
  onOpen: (t: Tarefa) => void;
}) {
  const [ord, setOrd] = useState<{ key: string; dir: 1 | -1 }>({ key: "prazo", dir: 1 });
  const linhas = useMemo(() => {
    const c = COLS.find((x) => x.key === ord.key) ?? COLS[0];
    return [...tarefas].sort((a, b) => {
      const va = c.valor(a);
      const vb = c.valor(b);
      return (va < vb ? -1 : va > vb ? 1 : 0) * ord.dir;
    });
  }, [tarefas, ord]);

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted">
            {COLS.map((c) => (
              <th
                key={c.key}
                className="px-3 py-2 font-medium"
                aria-sort={
                  ord.key === c.key ? (ord.dir === 1 ? "ascending" : "descending") : "none"
                }
              >
                <button
                  type="button"
                  className="inline-flex items-center gap-1 uppercase tracking-wider"
                  onClick={() =>
                    setOrd((o) => ({ key: c.key, dir: o.key === c.key && o.dir === 1 ? -1 : 1 }))
                  }
                >
                  {c.label}
                  {ord.key === c.key &&
                    (ord.dir === 1 ? (
                      <ArrowUp className="size-3" />
                    ) : (
                      <ArrowDown className="size-3" />
                    ))}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((t) => (
            <tr
              key={t.id}
              onClick={() => onOpen(t)}
              className="cursor-pointer border-b border-border last:border-b-0 hover:bg-secondary/60"
            >
              <td className="whitespace-nowrap px-3 py-2 tabular-nums text-text-muted">
                {t.chave}
              </td>
              <td className="px-3 py-2 font-medium text-text">{t.titulo}</td>
              <td className="px-3 py-2">{statusLabels[t.status] ?? t.status}</td>
              <td className="px-3 py-2">{prioridadeLabels[t.prioridade] ?? t.prioridade}</td>
              <td className="px-3 py-2">{t.responsavel?.nome ?? "—"}</td>
              <td className="px-3 py-2">{t.categoria ?? "—"}</td>
              <td className="px-3 py-2">{t.data_prazo ? <PrazoBadge t={t} /> : "—"}</td>
              <td className="px-3 py-2 tabular-nums">
                {t.checklist.length
                  ? `${t.checklist.filter((i) => i.feito).length}/${t.checklist.length}`
                  : "—"}
              </td>
              <td className="px-3 py-2 tabular-nums">{t.estimativa_horas ?? "—"}</td>
            </tr>
          ))}
          {linhas.length === 0 && (
            <tr>
              <td colSpan={COLS.length} className="px-3 py-4 text-center text-text-muted">
                Nenhuma tarefa.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
