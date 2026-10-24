"use client";

import { useState } from "react";
import { Bloco, brl, ehMulti, FOCO, type Multi, num, Tabela, useBox } from "./bloco";

export type Fatia = {
  key: string;
  label: string;
  value: number;
  valor: number | null; // R$, só gestor
  cor: string;
  keys: string[]; // valores reais da dimensão ("Outros" agrupa a cauda)
};

/** Top N na ordem global + "Outros"; `ordem` mantém cor/posição estáveis ao filtrar. */
export function fatiar(
  ordem: string[],
  valores: Map<string, { value: number; valor: number }>,
  cores: string[],
  selecionados: string[],
  gestor: boolean,
  topo = 5,
): Fatia[] {
  const mk = (k: string, i: number): Fatia => {
    const v = valores.get(k);
    return {
      key: k,
      label: k,
      value: v?.value ?? 0,
      valor: gestor ? (v?.valor ?? 0) : null,
      cor: cores[i],
      keys: [k],
    };
  };
  const cabeca = ordem.slice(0, topo).map(mk);
  const cauda = ordem.slice(topo).map((k, i) => mk(k, topo + i));
  const out = cabeca.filter((f) => f.value > 0 || selecionados.includes(f.key));
  const resto = cauda.filter((f) => f.value > 0 || selecionados.includes(f.key));
  if (resto.length) {
    out.push({
      key: "__outros",
      label: "Outros",
      value: resto.reduce((s, f) => s + f.value, 0),
      valor: gestor ? resto.reduce((s, f) => s + (f.valor ?? 0), 0) : null,
      cor: "var(--viz-outros)",
      keys: cauda.map((f) => f.key),
    });
  }
  return out;
}

export function RoscaBloco({
  titulo,
  unidade,
  area,
  href,
  fatias,
  selecionados,
  onToggle,
}: {
  titulo: string;
  unidade: string;
  area: string;
  href?: string;
  fatias: Fatia[];
  selecionados: string[];
  onToggle: (keys: string[], multi: boolean) => void;
}) {
  const [ref, box] = useBox<HTMLDivElement>();
  const [hover, setHover] = useState<string | null>(null);
  const algum = selecionados.length > 0;
  const on = (f: Fatia) => f.keys.length > 0 && f.keys.every((k) => selecionados.includes(k));
  const total = fatias.reduce((s, f) => s + f.value, 0);
  const gestorValor = fatias.some((f) => f.valor != null);
  const clique = (f: Fatia, e: Multi) => onToggle(f.keys, ehMulti(e));
  const h = fatias.find((f) => f.key === hover);
  const largo = box.w >= box.h * 1.25;
  const lado = Math.min(
    150,
    Math.max(40, largo ? Math.min(box.h, box.w * 0.5) : Math.min(box.w, box.h * 0.62)),
  );
  const R = 36;
  const C = 2 * Math.PI * R;
  let acc = 0;

  return (
    <Bloco
      titulo={titulo}
      area={area}
      href={href}
      vazio={total === 0 && !algum}
      tabela={
        <Tabela
          cab={["Categoria", unidade, ...(gestorValor ? ["Valor"] : [])]}
          linhas={fatias.map((f) => ({
            key: f.key,
            cels: [f.label, num(f.value), ...(gestorValor ? [brl(f.valor ?? 0)] : [])],
          }))}
          on={(k) => !!fatias.find((f) => f.key === k && on(f))}
          algum={algum}
          onLinha={(k, e) => {
            const f = fatias.find((x) => x.key === k);
            if (f) clique(f, e);
          }}
        />
      }
    >
      <div
        ref={ref}
        className={`flex min-h-0 flex-1 items-center justify-center gap-3 ${largo ? "flex-row" : "flex-col"}`}
      >
        <div className="relative shrink-0" style={{ width: lado, height: lado }}>
          <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
            {fatias.map((f) => {
              const len = total ? (f.value / total) * C : 0;
              const el = (
                // biome-ignore lint/a11y/noStaticElementInteractions: espelha os botões da legenda (teclado)
                <circle
                  key={f.key}
                  cx={50}
                  cy={50}
                  r={R}
                  fill="none"
                  stroke={f.cor}
                  strokeWidth={on(f) ? 20 : 16}
                  strokeDasharray={`${Math.max(0, len - (fatias.length > 1 ? 1.2 : 0))} ${C}`}
                  strokeDashoffset={-acc}
                  opacity={algum && !on(f) ? 0.25 : 1}
                  className="cursor-pointer"
                  onClick={(e) => clique(f, e)}
                  onMouseEnter={() => setHover(f.key)}
                  onMouseLeave={() => setHover(null)}
                />
              );
              acc += len;
              return el;
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-[22%] text-center leading-tight">
            <span
              className="truncate font-title tabular-nums text-text"
              style={{ fontSize: Math.max(11, lado * 0.15) }}
            >
              {h ? num(h.value) : num(total)}
            </span>
            <span
              className="max-w-full truncate text-text-muted"
              style={{ fontSize: Math.max(9, lado * 0.075) }}
            >
              {h ? `${h.label}${h.valor != null ? ` · ${brl(h.valor)}` : ""}` : unidade}
            </span>
          </div>
        </div>
        <ul
          className={`flex min-h-0 min-w-0 flex-col gap-0.5 overflow-y-auto text-xs ${largo ? "flex-1" : "w-full"}`}
        >
          {fatias.map((f) => (
            <li key={f.key}>
              <button
                type="button"
                aria-pressed={on(f)}
                onClick={(e) => clique(f, e)}
                onMouseEnter={() => setHover(f.key)}
                onMouseLeave={() => setHover(null)}
                className={`flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-muted ${FOCO} ${on(f) ? "bg-muted font-medium" : ""} ${algum && !on(f) ? "opacity-60" : ""}`}
              >
                <span className="size-2 shrink-0 rounded-sm" style={{ background: f.cor }} />
                <span className="min-w-0 flex-1 truncate text-text" title={f.label}>
                  {f.label}
                </span>
                <span className="tabular-nums text-text-muted">
                  {num(f.value)}
                  {f.valor != null ? ` · ${brl(f.valor)}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Bloco>
  );
}
