"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import type { ChecklistItem } from "./shared";

export function ChecklistTab({
  itens: inicial,
  readOnly,
  onSave,
}: {
  itens: ChecklistItem[];
  readOnly: boolean;
  onSave: (itens: ChecklistItem[]) => void;
}) {
  const [itens, setItens] = useState(inicial);
  const [novo, setNovo] = useState("");
  const feitos = itens.filter((i) => i.feito).length;
  const pct = itens.length ? Math.round((feitos / itens.length) * 100) : 0;

  const aplica = (n: ChecklistItem[]) => {
    setItens(n);
    onSave(n);
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 flex justify-between text-xs tabular-nums text-text-muted">
          <span>
            {feitos}/{itens.length} concluídos
          </span>
          <span>{pct}%</span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded bg-secondary"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ul className="space-y-1">
        {itens.map((i) => (
          <li key={i.id} className="group flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-1"
              checked={i.feito}
              disabled={readOnly}
              onChange={() =>
                aplica(itens.map((x) => (x.id === i.id ? { ...x, feito: !x.feito } : x)))
              }
            />
            <span
              className={`flex-1 text-sm ${i.feito ? "text-text-muted line-through" : "text-text"}`}
            >
              {i.texto}
            </span>
            {!readOnly && (
              <button
                type="button"
                aria-label="Remover item"
                onClick={() => aplica(itens.filter((x) => x.id !== i.id))}
                className="text-text-muted hover:text-red-600"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {!readOnly && (
        <input
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && novo.trim()) {
              e.preventDefault();
              aplica([...itens, { id: crypto.randomUUID(), texto: novo.trim(), feito: false }]);
              setNovo("");
            }
          }}
          placeholder="Novo item e Enter"
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      )}
    </div>
  );
}
