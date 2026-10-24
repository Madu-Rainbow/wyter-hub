"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Linhas brutas vindas do servidor (já filtradas por RLS e filtros globais). */
export type TarefaR = {
  s: string; // status
  p: string; // prioridade
  r: string | null; // responsável
  pj: string; // projeto
  e: number; // horas estimadas
  sem: string | null; // semana de conclusão (últimas 8)
  aberta: boolean;
  atr: boolean;
};
export type ProjetoR = { id: string; st: string; cl: string; ct: string | null };
export type ContratoR = { id: string; sit: string; valor: number | null };
export type Cat = { key: string; label: string };
export type Pessoa = Cat & { cap: number | null };

import { DIMS, type Dim, PARAM, type Sel } from "@front/lib/painel-sel";

const DIM_LABEL: Record<Dim, string> = {
  status: "Status da tarefa",
  prio: "Prioridade",
  pessoa: "Responsável",
  sem: "Semana",
  pst: "Status do projeto",
  sit: "Situação do contrato",
};

type Props = {
  tarefas: TarefaR[];
  projetos: ProjetoR[];
  contratos: ContratoR[];
  clientesAtivos: number;
  aprovacoes: number;
  gestor: boolean;
  pessoas: Pessoa[];
  semanas: Cat[];
  cats: { status: Cat[]; prio: Cat[]; pst: Cat[]; sit: Cat[] };
  selInicial: Sel;
  base: Record<string, string | undefined>;
  truncado: boolean;
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (n: number, h?: boolean) =>
  `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}${h ? " h" : ""}`;

function qs(base: string, params: Record<string, string | undefined>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) u.set(k, v);
  const s = u.toString();
  return s ? `${base}?${s}` : base;
}

export function PainelInterativo(p: Props) {
  const [sel, setSel] = useState<Sel>(p.selInicial);

  // Estado na URL sem nova ida ao servidor.
  const gravar = useCallback((s: Sel) => {
    const u = new URL(window.location.href);
    for (const d of DIMS) {
      if (s[d]?.length) u.searchParams.set(PARAM[d], (s[d] ?? []).join(","));
      else u.searchParams.delete(PARAM[d]);
    }
    window.history.replaceState(null, "", u);
  }, []);

  const alternar = useCallback(
    (d: Dim, key: string, multi: boolean) => {
      setSel((cur) => {
        const atual = cur[d] ?? [];
        let prox: string[];
        if (multi) prox = atual.includes(key) ? atual.filter((k) => k !== key) : [...atual, key];
        else prox = atual.length === 1 && atual[0] === key ? [] : [key];
        const n = { ...cur, [d]: prox.length ? prox : undefined };
        gravar(n);
        return n;
      });
    },
    [gravar],
  );

  const remover = (d: Dim, key?: string) => {
    setSel((cur) => {
      const rest = key ? (cur[d] ?? []).filter((k) => k !== key) : [];
      const n = { ...cur, [d]: rest.length ? rest : undefined };
      gravar(n);
      return n;
    });
  };
  const limpar = () => {
    setSel({});
    gravar({});
  };

  const contratoPorId = useMemo(() => new Map(p.contratos.map((c) => [c.id, c])), [p.contratos]);
  const projetoPorId = useMemo(() => new Map(p.projetos.map((x) => [x.id, x])), [p.projetos]);

  /** Aplica todas as seleções, exceto a dimensão `ignorar` (o gráfico dono mostra tudo e esmaece). */
  const filtrar = useCallback(
    (ignorar?: Dim) => {
      const ativo = (d: Dim) => d !== ignorar && !!sel[d]?.length;
      const tem = (d: Dim, v: string | null | undefined) =>
        !ativo(d) || (v != null && (sel[d] ?? []).includes(v));
      const ctOk = (ct: string | null) =>
        !ativo("sit") || tem("sit", ct ? contratoPorId.get(ct)?.sit : null);
      const pjOk = (x: ProjetoR | undefined) => !!x && tem("pst", x.st) && ctOk(x.ct);

      const tarefas = p.tarefas.filter(
        (t) =>
          tem("status", t.s) &&
          tem("prio", t.p) &&
          tem("pessoa", t.r) &&
          tem("sem", t.sem) &&
          pjOk(projetoPorId.get(t.pj)),
      );
      const tarefaAtiva = (["status", "prio", "pessoa", "sem"] as Dim[]).some(ativo);
      const comTarefa = new Set(tarefas.map((t) => t.pj));
      const projetos = p.projetos.filter((x) => pjOk(x) && (!tarefaAtiva || comTarefa.has(x.id)));
      const viaProjeto = tarefaAtiva || ativo("pst");
      const cts = new Set(projetos.map((x) => x.ct));
      const contratos = p.contratos.filter(
        (c) => tem("sit", c.sit) && (!viaProjeto || cts.has(c.id)),
      );
      return { tarefas, projetos, contratos };
    },
    [sel, p.tarefas, p.projetos, p.contratos, contratoPorId, projetoPorId],
  );

  const total = filtrar();
  const algum = DIMS.some((d) => sel[d]?.length);

  const abertas = total.tarefas.filter((t) => t.aberta);
  const atrasadas = abertas.filter((t) => t.atr);
  const emAnd = total.contratos.filter((c) => c.sit === "em_andamento");
  const clientes = algum ? new Set(total.projetos.map((x) => x.cl)).size : p.clientesAtivos;

  const kpis: { label: string; value: string; href: string }[] = [
    { label: "Clientes ativos", value: String(clientes), href: "/clientes?status=ativo" },
    {
      label: "Projetos em andamento",
      value: String(total.projetos.filter((x) => x.st === "em_andamento").length),
      href: qs("/trabalho", { aba: "projetos", status: "em_andamento", resp: p.base.resp }),
    },
    {
      label: "Tarefas abertas",
      value: String(abertas.length),
      href: qs("/trabalho", { aba: "tarefas", ...p.base, status: "abertas" }),
    },
    {
      label: "Tarefas atrasadas",
      value: String(atrasadas.length),
      href: qs("/trabalho", { aba: "tarefas", ...p.base, atrasadas: "1" }),
    },
    {
      label: "Aprovações pendentes",
      value: String(p.aprovacoes),
      href: "/minhas-tarefas?aprovacao=pendente",
    },
  ];
  if (p.gestor) {
    kpis.push({
      label: "Contratos em andamento",
      value: brl(emAnd.reduce((s, c) => s + (c.valor ?? 0), 0)),
      href: "/trabalho?aba=contratos&situacao=em_andamento",
    });
  }

  const contar = <T,>(arr: T[], cats: Cat[], f: (x: T) => string | null): Linha[] =>
    cats.map((c) => ({
      key: c.key,
      label: c.label,
      value: arr.filter((x) => f(x) === c.key).length,
    }));

  const fStatus = filtrar("status").tarefas;
  const fPrio = filtrar("prio").tarefas.filter((t) => t.aberta);
  const fPessoa = filtrar("pessoa").tarefas.filter((t) => t.aberta);
  const fSem = filtrar("sem").tarefas;
  const fPst = filtrar("pst").projetos;
  const fSit = filtrar("sit").contratos;

  const lStatus = contar(fStatus, p.cats.status, (t) => t.s);
  const lPrio = contar(fPrio, p.cats.prio, (t) => t.p);
  const lPessoa: Linha[] = p.pessoas
    .map((x) => ({
      key: x.key,
      label: x.label,
      ref: x.cap ?? undefined,
      value: fPessoa.filter((t) => t.r === x.key).reduce((s, t) => s + t.e, 0),
    }))
    .filter((l) => l.value > 0 || l.ref || sel.pessoa?.includes(l.key))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "pt-BR"));
  const lSit = contar(fSit, p.cats.sit, (c) => c.sit);
  const lPst = contar(fPst, p.cats.pst, (x) => x.st);
  const lSem = contar(
    fSem.filter((t) => t.s === "concluida"),
    p.semanas,
    (t) => t.sem,
  );

  const rotulo = (d: Dim, k: string) =>
    (d === "status"
      ? p.cats.status
      : d === "prio"
        ? p.cats.prio
        : d === "pst"
          ? p.cats.pst
          : d === "sit"
            ? p.cats.sit
            : d === "sem"
              ? p.semanas
              : p.pessoas
    ).find((c) => c.key === k)?.label ?? k;

  const L = (path: string, extra: Record<string, string | undefined> = {}) =>
    qs(path, { ...p.base, ...extra });
  const charts: ChartProps[] = [
    {
      dim: "status",
      titulo: "Tarefas por status",
      unidade: "Tarefas",
      span: p.gestor ? "lg:col-span-6" : "lg:col-span-12",
      linhas: lStatus,
      href: L("/trabalho", { aba: "tarefas" }),
    },
    {
      dim: "prio",
      titulo: "Tarefas abertas por prioridade",
      unidade: "Tarefas",
      span: "lg:col-span-4",
      linhas: lPrio,
      href: L("/trabalho", { aba: "tarefas", status: "abertas" }),
    },
    ...(p.gestor
      ? [
          {
            dim: "pessoa" as Dim,
            titulo: "Carga por pessoa",
            unidade: "h",
            span: "lg:col-span-6",
            carga: true,
            refLabel: "Capacidade semanal (h)",
            linhas: lPessoa,
            href: L("/trabalho", { aba: "tarefas", status: "abertas" }),
          },
        ]
      : []),
    {
      dim: "sit",
      titulo: "Contratos por situação",
      unidade: "Contratos",
      span: "lg:col-span-4",
      linhas: lSit,
      href: qs("/trabalho", { aba: "contratos", cliente: p.base.cliente }),
    },
    {
      dim: "pst",
      titulo: "Projetos por status",
      unidade: "Projetos",
      span: "lg:col-span-4",
      linhas: lPst,
      href: qs("/trabalho", { aba: "projetos", resp: p.base.resp, cliente: p.base.cliente }),
    },
    {
      dim: "sem",
      titulo: "Tarefas concluídas por semana",
      unidade: "Concluídas",
      span: "lg:col-span-12",
      tipo: "linha",
      linhas: lSem,
      href: L("/trabalho", { aba: "tarefas", status: "concluida" }),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {p.truncado && (
        <p
          role="status"
          className="mb-2 shrink-0 rounded border border-border bg-muted px-3 py-2 text-sm text-text"
        >
          Resultado limitado às primeiras 5.000 tarefas: os números podem estar incompletos. Refine
          os filtros acima.
        </p>
      )}

      <div className="mb-3 grid shrink-0 gap-2 grid-cols-[repeat(auto-fill,minmax(min(100%,11rem),1fr))]">
        {kpis.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className={`rounded-md border border-border bg-surface px-3 py-1.5 hover:bg-muted ${FOCO}`}
          >
            <p className="truncate text-[11px] leading-tight text-text-muted">{k.label}</p>
            <p className="font-title text-lg leading-tight tabular-nums text-text">{k.value}</p>
          </Link>
        ))}
      </div>

      {algum && (
        <section
          className="mb-2 flex shrink-0 flex-wrap items-center gap-2 text-sm"
          aria-label="Filtros ativos"
        >
          <span className="text-xs text-text-muted">Filtros ativos:</span>
          {DIMS.flatMap((d) =>
            (sel[d] ?? []).map((k) => (
              <span
                key={`${d}:${k}`}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-surface py-0.5 pl-3 pr-1 text-text"
              >
                <span className="text-text-muted">{DIM_LABEL[d]}:</span> {rotulo(d, k)}
                <button
                  type="button"
                  onClick={() => remover(d, k)}
                  aria-label={`Remover filtro ${DIM_LABEL[d]}: ${rotulo(d, k)}`}
                  className="rounded-full px-1.5 text-text-muted hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
                >
                  ×
                </button>
              </span>
            )),
          )}
          <button
            type="button"
            onClick={limpar}
            className="px-2 py-1 text-text-muted underline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Limpar tudo
          </button>
        </section>
      )}

      <div className="grid gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.75fr)]">
        {charts.map((c) => (
          <ChartCard
            key={c.dim}
            {...c}
            selecionados={sel[c.dim] ?? []}
            onToggle={(k, m) => alternar(c.dim, k, m)}
          />
        ))}
      </div>
      <p className="mt-2 shrink-0 text-xs text-text-muted">
        Clique para filtrar os demais gráficos e indicadores. Ctrl ou Shift soma valores; clicar de
        novo desmarca. Aprovações pendentes não são afetadas pelos filtros.
      </p>
    </div>
  );
}

export type Linha = { key: string; label: string; value: number; ref?: number };

type ChartProps = {
  dim: Dim;
  titulo: string;
  unidade: string;
  linhas: Linha[];
  tipo?: "barras" | "linha";
  refLabel?: string;
  href: string;
  span: string;
  /** barras de carga: marcador de capacidade e destaque acima de 100% */
  carga?: boolean;
};

// Azul validado (contraste >= 3:1 sobre a superfície); esmaecido = mesma cor a 25%.
const COR = "var(--viz-1)";
const COR_REF = "var(--color-text, #0e1726)";
const FOCO = "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent";

function ChartCard({
  titulo,
  unidade,
  linhas,
  tipo = "barras",
  refLabel,
  href,
  span,
  carga,
  selecionados,
  onToggle,
}: ChartProps & {
  selecionados: string[];
  onToggle: (key: string, multi: boolean) => void;
}) {
  const [tabela, setTabela] = useState(false);
  const h = unidade === "h";
  const max = Math.max(1, ...linhas.map((l) => Math.max(l.value, l.ref ?? 0)));
  const vazio = linhas.every((l) => l.value === 0 && !l.ref);
  const algum = selecionados.length > 0;
  const click = (k: string) => (e: { ctrlKey: boolean; shiftKey: boolean; metaKey: boolean }) =>
    onToggle(k, e.ctrlKey || e.shiftKey || e.metaKey);
  const on = (k: string) => selecionados.includes(k);
  const aria = (l: Linha) => `${l.label}: ${num(l.value, h)}`;

  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-md border border-border bg-surface p-3 ${span} [--viz-1:#2a78d6] dark:[--viz-1:#3987e5]`}
    >
      <header className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <h2 className="font-title text-base text-text">{titulo}</h2>
        <div className="flex items-center gap-1 text-xs">
          {(["Gráfico", "Tabela"] as const).map((nome) => {
            const ativo = (nome === "Tabela") === tabela;
            return (
              <button
                key={nome}
                type="button"
                aria-pressed={ativo}
                onClick={() => setTabela(nome === "Tabela")}
                className={`rounded px-2 py-1 ${FOCO} ${ativo ? "bg-accent text-accent-foreground" : "text-text-muted hover:bg-muted"}`}
              >
                {nome}
              </button>
            );
          })}
          <Link href={href} className={`rounded px-2 py-1 text-text-muted underline ${FOCO}`}>
            Abrir lista
          </Link>
        </div>
      </header>

      {vazio && !algum ? (
        <p className="py-6 text-center text-sm text-text-muted">
          Sem dados para os filtros selecionados.
        </p>
      ) : tabela ? (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-muted">
                <th className="py-1 font-normal">Categoria</th>
                <th className="py-1 text-right font-normal">{unidade}</th>
                {refLabel && <th className="py-1 text-right font-normal">{refLabel}</th>}
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.key} className="border-b border-border/60 last:border-0">
                  <td className="py-1">
                    <button
                      type="button"
                      aria-pressed={on(l.key)}
                      onClick={click(l.key)}
                      className={`rounded px-1 text-left text-text ${FOCO} ${on(l.key) ? "bg-muted font-medium underline" : "hover:bg-muted"} ${algum && !on(l.key) ? "opacity-60" : ""}`}
                    >
                      {l.label}
                    </button>
                  </td>
                  <td className="py-1 text-right text-text">{num(l.value, h)}</td>
                  {refLabel && (
                    <td className="py-1 text-right text-text">
                      {l.ref == null ? "—" : num(l.ref, h)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tipo === "linha" ? (
        <Serie linhas={linhas} max={max} algum={algum} on={on} click={click} />
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {linhas.map((l) => (
            <li key={l.key} className="min-h-7 flex-1">
              <button
                type="button"
                aria-pressed={on(l.key)}
                aria-label={aria(l)}
                onClick={click(l.key)}
                className={`flex h-full w-full items-center rounded text-left hover:bg-muted ${FOCO}`}
              >
                <span className="grid w-full grid-cols-[minmax(4rem,8rem)_1fr_auto] items-center gap-3 text-xs">
                  <span
                    className={`truncate text-text-muted ${on(l.key) ? "font-medium text-text" : ""}`}
                    title={l.label}
                  >
                    {l.label}
                  </span>
                  <span className="relative block h-4">
                    <span
                      className={`absolute inset-y-0 left-0 rounded-r-[4px] ${on(l.key) ? "outline outline-2 outline-offset-1 outline-text" : ""}`}
                      style={{
                        width: `${(l.value / max) * 100}%`,
                        background: sobre(l, carga) ? "var(--color-danger, #b91c1c)" : COR,
                        minWidth: l.value > 0 ? 2 : 0,
                        opacity: algum && !on(l.key) ? 0.25 : 1,
                      }}
                    />
                    {l.ref != null && (
                      <span
                        className="absolute -inset-y-0.5 w-0.5"
                        style={{ left: `${(l.ref / max) * 100}%`, background: COR_REF }}
                        title={`${refLabel}: ${num(l.ref, h)}`}
                      />
                    )}
                  </span>
                  <span className="tabular-nums text-text">
                    {carga && l.ref
                      ? `${num(l.value, true)} / ${num(l.ref, true)}${sobre(l, carga) ? ` (${Math.round((l.value / l.ref) * 100)}%, acima)` : ""}`
                      : num(l.value, h)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {refLabel && !tabela && !vazio && (
        <p className="mt-2 flex shrink-0 items-center gap-4 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-sm" style={{ background: COR }} />
            {unidade}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-0.5" style={{ background: COR_REF }} />
            {refLabel}
          </span>
        </p>
      )}
    </section>
  );
}

const sobre = (l: Linha, carga?: boolean) =>
  !!carga && l.ref != null && l.ref > 0 && l.value > l.ref;

function Serie({
  linhas,
  max,
  algum,
  on,
  click,
}: {
  linhas: Linha[];
  max: number;
  algum: boolean;
  on: (k: string) => boolean;
  click: (k: string) => (e: { ctrlKey: boolean; shiftKey: boolean; metaKey: boolean }) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 400, h: 100 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setSize({ w: Math.max(200, e.contentRect.width), h: Math.max(60, e.contentRect.height) }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const W = size.w,
    H = size.h,
    P = 20;
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(1, linhas.length - 1);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const pts = linhas.map((l, i) => `${x(i)},${y(l.value)}`).join(" ");
  return (
    <div ref={box} className="relative min-h-12 flex-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="pointer-events-none absolute inset-0 size-full"
        aria-hidden="true"
      >
        <line
          x1={P}
          x2={W - P}
          y1={H - P}
          y2={H - P}
          stroke="currentColor"
          className="text-border"
        />
        <polyline
          points={pts}
          fill="none"
          stroke={COR}
          strokeWidth={2}
          strokeLinejoin="round"
          opacity={algum ? 0.4 : 1}
        />
        {linhas.map((l, i) => {
          const s = on(l.key);
          const ativo = hover === i || s;
          return (
            <g key={l.key}>
              <circle
                className="foco"
                cx={x(i)}
                cy={y(l.value)}
                r={9}
                fill="none"
                strokeWidth={2}
                opacity={0}
              />
              <circle
                cx={x(i)}
                cy={y(l.value)}
                r={ativo ? 5 : 4}
                fill={COR}
                stroke={s ? "var(--color-text, #0e1726)" : "var(--color-surface, #fff)"}
                strokeWidth={2}
                opacity={algum && !s ? 0.3 : 1}
              />
              <text
                x={x(i)}
                y={H - 5}
                textAnchor="middle"
                className={`text-[9px] tabular-nums ${s ? "fill-text font-medium" : "fill-text-muted"}`}
              >
                {l.label}
              </text>
              {ativo && (
                <text
                  x={x(i)}
                  y={y(l.value) - 10}
                  textAnchor="middle"
                  className="fill-text text-[11px] tabular-nums"
                >
                  {l.value}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {linhas.map((l, i) => (
        <button
          key={l.key}
          type="button"
          aria-pressed={on(l.key)}
          aria-label={`Semana ${l.label}: ${l.value} concluídas`}
          className="absolute top-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent"
          style={{ left: x(i) - 20, width: 40, height: H }}
          onClick={click(l.key)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
          onFocus={() => setHover(i)}
          onBlur={() => setHover(null)}
        />
      ))}
    </div>
  );
}
