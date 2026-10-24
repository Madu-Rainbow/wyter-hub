"use client";

import { norm } from "@front/lib/tarefas";
import { Check, Search } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

export const inputCls =
  "w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none disabled:opacity-70";
export const btnCls =
  "inline-flex w-full items-center gap-2 rounded-md bg-secondary px-2.5 py-1.5 text-left text-sm text-text hover:bg-secondary/70 disabled:opacity-50";

/** Popover posicionado (fixed) para nao ser cortado pelas colunas com rolagem; Esc fecha so ele. */
export function Popover({
  rotulo,
  icone,
  titulo,
  children,
  largura = 288,
  desabilitado,
}: {
  rotulo: string;
  icone?: ReactNode;
  titulo: string;
  children: (fechar: () => void) => ReactNode;
  largura?: number;
  desabilitado?: boolean;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pos) return;
    const down = (e: MouseEvent) => {
      const n = e.target as Node;
      if (!painel.current?.contains(n) && !btn.current?.contains(n)) setPos(null);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      setPos(null);
    };
    document.addEventListener("mousedown", down);
    window.addEventListener("keydown", key, true);
    return () => {
      document.removeEventListener("mousedown", down);
      window.removeEventListener("keydown", key, true);
    };
  }, [pos]);

  function alternar() {
    if (pos) return setPos(null);
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    setPos({
      top: Math.min(r.bottom + 4, window.innerHeight - 160),
      left: Math.max(8, Math.min(r.left, window.innerWidth - largura - 8)),
    });
  }

  return (
    <>
      <button
        ref={btn}
        type="button"
        className={btnCls}
        disabled={desabilitado}
        aria-haspopup="dialog"
        aria-expanded={!!pos}
        onClick={alternar}
      >
        {icone}
        {rotulo}
      </button>
      {pos && (
        <div
          ref={painel}
          role="dialog"
          aria-label={titulo}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: largura,
            maxHeight: `calc(100dvh - ${pos.top}px - 8px)`,
          }}
          className="z-[60] overflow-y-auto rounded-md border border-border bg-surface p-3 shadow-lg"
        >
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-wider text-text-muted">
            {titulo}
          </p>
          {children(() => setPos(null))}
        </div>
      )}
    </>
  );
}

export type ItemBusca = { id: string; nome: string; chip?: string };

/** Lista com busca (sem acento) e marcacao multipla. */
export function ListaBusca({
  itens,
  marcados,
  onToggle,
  placeholder,
  acao,
}: {
  itens: ItemBusca[];
  marcados: Set<string>;
  onToggle: (id: string) => void;
  placeholder: string;
  /** Acao extra por item (editar/excluir). */
  acao?: (i: ItemBusca) => ReactNode;
}) {
  const [q, setQ] = useState("");
  const vis = itens.filter((i) => norm(i.nome).includes(norm(q.trim())));
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-2 size-3.5 text-text-muted" />
        <input
          aria-label={placeholder}
          placeholder={placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className={`${inputCls} pl-7`}
        />
      </div>
      <ul className="max-h-56 space-y-1 overflow-y-auto">
        {vis.length === 0 && <li className="px-1 text-sm text-text-muted">Nenhum resultado</li>}
        {vis.map((i) => (
          <li key={i.id} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onToggle(i.id)}
              aria-pressed={marcados.has(i.id)}
              className={`flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:opacity-80 ${i.chip ?? "hover:bg-secondary"}`}
            >
              <span className="min-w-0 flex-1 truncate">{i.nome}</span>
              {marcados.has(i.id) && (
                <Check className="size-3.5 shrink-0" aria-label="Selecionado" />
              )}
            </button>
            {acao?.(i)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Secao({
  titulo,
  extra,
  children,
}: {
  titulo: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-title text-base text-text">{titulo}</h3>
        {extra}
      </div>
      {children}
    </section>
  );
}
