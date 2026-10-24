"use client";

import { useState } from "react";
import { Bloco, num } from "./bloco";

export const FORMULA =
  "Índice = (horas estimadas das tarefas abertas com prazo nas próximas 4 semanas + 1,5 × horas das atrasadas) ÷ (capacidade semanal das pessoas ativas × 4), mais 2% por tarefa aberta acima de 8 por pessoa (média).";

const MAX = 1.5;
const FAIXAS = [
  { de: 0, ate: 0.7, cor: "var(--color-success, #15803d)" },
  { de: 0.7, ate: 1, cor: "var(--color-warning, #d97706)" },
  { de: 1, ate: MAX, cor: "var(--color-danger, #b91c1c)" },
];
const ang = (v: number) => Math.PI * (1 - Math.min(v, MAX) / MAX); // pi (esq) .. 0 (dir)
const pt = (r: number, v: number) => `${100 + r * Math.cos(ang(v))} ${100 - r * Math.sin(ang(v))}`;

export function MedidorBloco({
  area,
  indice,
  maisCarregada,
  escopo,
}: {
  area: string;
  indice: number | null; // null = sem capacidade cadastrada
  maisCarregada: string | null;
  escopo: string;
}) {
  const [dica, setDica] = useState(false);
  const v = indice ?? 0;
  const faixa = v > 1 ? "Sobrecarga" : v > 0.7 ? "Atenção" : "Folgada";
  return (
    <Bloco
      titulo="Estresse da equipe"
      area={area}
      vazio={indice == null}
      tabela={
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-text">
          <dt className="text-text-muted">Índice</dt>
          <dd className="tabular-nums">{indice == null ? "—" : `${num(v * 100)}%`}</dd>
          <dt className="text-text-muted">Faixa</dt>
          <dd>{faixa}</dd>
          <dt className="text-text-muted">Escopo</dt>
          <dd>{escopo}</dd>
          <dt className="text-text-muted">Mais carregada</dt>
          <dd>{maisCarregada ?? "—"}</dd>
          <dt className="text-text-muted">Fórmula</dt>
          <dd>{FORMULA}</dd>
        </dl>
      }
    >
      <button
        type="button"
        aria-label={`Estresse da equipe: ${num(v * 100)}% (${faixa}). ${FORMULA}`}
        className="relative flex min-h-0 w-full flex-1 cursor-default flex-col items-center justify-center rounded outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onMouseEnter={() => setDica(true)}
        onMouseLeave={() => setDica(false)}
        onFocus={() => setDica(true)}
        onBlur={() => setDica(false)}
      >
        <svg viewBox="0 0 200 118" className="min-h-0 w-full max-w-64 flex-1" aria-hidden="true">
          {FAIXAS.map((f) => (
            <path
              key={f.de}
              d={`M ${pt(86, f.de)} A 86 86 0 0 1 ${pt(86, f.ate)}`}
              fill="none"
              stroke={f.cor}
              strokeWidth={16}
              opacity={0.9}
            />
          ))}
          {[0, 0.7, 1, 1.5].map((t) => (
            <text
              key={t}
              x={100 + 104 * Math.cos(ang(t)) * 0.97}
              y={100 - 104 * Math.sin(ang(t)) * 0.97 + (t === 0 || t === 1.5 ? 10 : 0)}
              textAnchor="middle"
              className="fill-text-muted text-[8px] tabular-nums"
            >
              {t * 100}%
            </text>
          ))}
          <line
            x1={100}
            y1={100}
            x2={100 + 70 * Math.cos(ang(v))}
            y2={100 - 70 * Math.sin(ang(v))}
            stroke="var(--color-text, #0e1726)"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <circle cx={100} cy={100} r={6} fill="var(--color-text, #0e1726)" />
        </svg>
        <p className="shrink-0 text-center leading-tight">
          <span className="font-title text-[clamp(1.1rem,2vw,1.6rem)] tabular-nums text-text">
            {indice == null ? "—" : `${num(v * 100)}%`}
          </span>{" "}
          <span className="text-xs text-text-muted">{faixa}</span>
        </p>
        <p className="max-w-full shrink-0 truncate text-[11px] text-text-muted">
          {maisCarregada ? `Mais carregada: ${maisCarregada}` : escopo}
        </p>
        {dica && (
          <div
            role="tooltip"
            className="absolute inset-x-1 top-1 z-10 rounded border border-border bg-surface p-2 text-[11px] leading-snug text-text shadow-sm"
          >
            {FORMULA}
          </div>
        )}
      </button>
    </Bloco>
  );
}
