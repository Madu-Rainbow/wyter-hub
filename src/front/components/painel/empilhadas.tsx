"use client";

import { Bloco, ehMulti, FOCO, type Multi, num } from "./bloco";

export type LinhaEmp = { key: string; label: string; por: Record<string, number>; total: number };

export function EmpilhadasBloco({
  titulo,
  area,
  href,
  linhas,
  cats,
  cores,
  selecionados,
  onToggle,
}: {
  titulo: string;
  area: string;
  href?: string;
  linhas: LinhaEmp[];
  cats: { key: string; label: string }[];
  cores: Record<string, string>;
  selecionados: string[];
  onToggle: (key: string, multi: boolean) => void;
}) {
  const algum = selecionados.length > 0;
  const on = (k: string) => selecionados.includes(k);
  const max = Math.max(1, ...linhas.map((l) => l.total));
  const usadas = cats.filter((c) => linhas.some((l) => l.por[c.key]) || on(c.key));
  return (
    <Bloco
      titulo={titulo}
      area={area}
      href={href}
      vazio={linhas.length === 0 && !algum}
      tabela={
        <table className="w-full text-xs tabular-nums">
          <thead>
            <tr className="border-b border-border text-left text-text-muted">
              <th className="py-1 font-normal">Projeto</th>
              {usadas.map((c) => (
                <th key={c.key} className="py-1 text-right font-normal">
                  <button
                    type="button"
                    aria-pressed={on(c.key)}
                    onClick={(e) => onToggle(c.key, ehMulti(e as Multi))}
                    className={`rounded px-1 ${FOCO} ${on(c.key) ? "bg-muted font-medium underline" : ""}`}
                  >
                    {c.label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.key} className="border-b border-border/60 last:border-0">
                <td className="py-1 text-text">{l.label}</td>
                {usadas.map((c) => (
                  <td key={c.key} className="py-1 text-right text-text">
                    {num(l.por[c.key] ?? 0)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
        {linhas.map((l) => (
          <li
            key={l.key}
            className="grid min-h-5 flex-1 grid-cols-[minmax(3rem,7rem)_1fr_auto] items-center gap-2 text-xs"
          >
            <span className="truncate text-text-muted" title={l.label}>
              {l.label}
            </span>
            <span
              className="flex h-[min(100%,1.5rem)] gap-0.5"
              style={{ width: `${(l.total / max) * 100}%` }}
            >
              {usadas
                .filter((c) => l.por[c.key])
                .map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    aria-pressed={on(c.key)}
                    aria-label={`${l.label}, ${c.label}: ${l.por[c.key]}`}
                    title={`${l.label} · ${c.label}: ${l.por[c.key]}`}
                    onClick={(e) => onToggle(c.key, ehMulti(e))}
                    className={`h-full min-w-0.5 first:rounded-l-[4px] last:rounded-r-[4px] ${FOCO} ${on(c.key) ? "outline outline-2 outline-offset-1 outline-text" : ""}`}
                    style={{
                      flex: l.por[c.key],
                      background: cores[c.key],
                      opacity: algum && !on(c.key) ? 0.25 : 1,
                    }}
                  />
                ))}
            </span>
            <span className="tabular-nums text-text">{num(l.total)}</span>
          </li>
        ))}
      </ul>
      <ul className="mt-1 flex shrink-0 flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-text-muted">
        {usadas.map((c) => (
          <li key={c.key} className="flex items-center gap-1">
            <span className="size-2 rounded-sm" style={{ background: cores[c.key] }} />
            {c.label}
          </li>
        ))}
      </ul>
    </Bloco>
  );
}
