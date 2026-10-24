"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

export function AdicaoRapida({ onAdd }: { onAdd: (titulo: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const [v, setV] = useState("");
  if (!aberto)
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-2 flex w-full items-center gap-1 rounded px-2 py-1.5 text-xs text-text-muted hover:bg-secondary hover:text-text"
      >
        <Plus className="size-3.5" />
        Adicionar tarefa
      </button>
    );
  return (
    <input
      // biome-ignore lint/a11y/noAutofocus: campo aparece por acao explicita do usuario
      autoFocus
      value={v}
      onChange={(e) => setV(e.target.value)}
      placeholder="Título e Enter"
      onBlur={() => {
        setAberto(false);
        setV("");
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          setAberto(false);
          setV("");
        }
        if (e.key === "Enter" && v.trim()) {
          onAdd(v.trim());
          setV("");
        }
      }}
      className="mt-2 w-full rounded-md border border-accent bg-surface px-2 py-1.5 text-sm focus:outline-none"
    />
  );
}
