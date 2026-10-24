"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";

export const FOCO =
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent";
export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const num = (n: number, h?: boolean) =>
  `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}${h ? " h" : ""}`;
export type Multi = { ctrlKey: boolean; shiftKey: boolean; metaKey: boolean };
export const ehMulti = (e: Multi) => e.ctrlKey || e.shiftKey || e.metaKey;

/** Cores categóricas em ordem fixa (paleta validada, claro/escuro). */
export const SERIE = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `var(--viz-${i})`);
export const COR_OUTROS = "var(--viz-outros)";

export const VIZ_CSS = `
.painel-viz{--viz-1:#2a78d6;--viz-2:#eb6834;--viz-3:#1baf7a;--viz-4:#eda100;--viz-5:#e87ba4;--viz-6:#008300;--viz-7:#6250d6;--viz-8:#e34948;--viz-outros:#8a93a3}
@media (prefers-color-scheme:dark){:root:where(:not([data-theme="light"])) .painel-viz{--viz-1:#3987e5;--viz-2:#d95926;--viz-3:#199e70;--viz-4:#c98500;--viz-5:#d55181;--viz-6:#008300;--viz-7:#9085e9;--viz-8:#e66767;--viz-outros:#6b7486}}
:root[data-theme="dark"] .painel-viz{--viz-1:#3987e5;--viz-2:#d95926;--viz-3:#199e70;--viz-4:#c98500;--viz-5:#d55181;--viz-6:#008300;--viz-7:#9085e9;--viz-8:#e66767;--viz-outros:#6b7486}
`;

/** Tamanho em pixels do elemento (ResizeObserver) para o visual preencher o bloco. */
export function useBox<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setBox({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, box] as const;
}

/** Cartão de um visual: título, alternância Gráfico/Tabela, link para a lista. */
export function Bloco({
  titulo,
  href,
  area,
  vazio,
  tabela,
  children,
}: {
  titulo: string;
  href?: string;
  area: string;
  vazio?: boolean;
  tabela: ReactNode;
  children: ReactNode;
}) {
  const [verTabela, setVerTabela] = useState(false);
  return (
    <section
      style={{ "--ga": area } as React.CSSProperties}
      className="flex min-h-56 min-w-0 flex-col overflow-hidden rounded-md border border-border bg-surface p-2.5 lg:min-h-0 lg:[grid-area:var(--ga)]"
    >
      <header className="mb-1.5 flex shrink-0 items-center justify-between gap-2">
        <h2 className="truncate font-title text-[clamp(0.8rem,1.1vw,1rem)] text-text">{titulo}</h2>
        <div className="flex shrink-0 items-center gap-0.5 text-[11px]">
          {(["Gráfico", "Tabela"] as const).map((nome) => {
            const ativo = (nome === "Tabela") === verTabela;
            return (
              <button
                key={nome}
                type="button"
                aria-pressed={ativo}
                onClick={() => setVerTabela(nome === "Tabela")}
                className={`rounded px-1.5 py-0.5 ${FOCO} ${ativo ? "bg-accent text-accent-foreground" : "text-text-muted hover:bg-muted"}`}
              >
                {nome}
              </button>
            );
          })}
          {href && (
            <Link href={href} className={`rounded px-1.5 py-0.5 text-text-muted underline ${FOCO}`}>
              Abrir lista
            </Link>
          )}
        </div>
      </header>
      {verTabela ? (
        <div className="min-h-0 flex-1 overflow-auto">{tabela}</div>
      ) : vazio ? (
        <p className="m-auto text-center text-xs text-text-muted">Sem dados para os filtros.</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      )}
    </section>
  );
}

/** Tabela simples; `onLinha` torna o rótulo um botão de seleção. */
export function Tabela({
  cab,
  linhas,
  on,
  algum,
  onLinha,
}: {
  cab: string[];
  linhas: { key: string; cels: string[] }[];
  on: (k: string) => boolean;
  algum: boolean;
  onLinha: (k: string, e: Multi) => void;
}) {
  return (
    <table className="w-full text-xs tabular-nums">
      <thead>
        <tr className="border-b border-border text-left text-text-muted">
          {cab.map((c, i) => (
            <th key={c} className={`py-1 font-normal ${i ? "text-right" : ""}`}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {linhas.map((l) => (
          <tr key={l.key} className="border-b border-border/60 last:border-0">
            {l.cels.map((c, i) => (
              <td key={`${l.key}:${cab[i]}`} className={`py-1 ${i ? "text-right text-text" : ""}`}>
                {i ? (
                  c
                ) : (
                  <button
                    type="button"
                    aria-pressed={on(l.key)}
                    onClick={(e) => onLinha(l.key, e)}
                    className={`rounded px-1 text-left text-text ${FOCO} ${on(l.key) ? "bg-muted font-medium underline" : "hover:bg-muted"} ${algum && !on(l.key) ? "opacity-60" : ""}`}
                  >
                    {c}
                  </button>
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
