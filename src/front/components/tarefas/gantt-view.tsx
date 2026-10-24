"use client";

import { hojeISO } from "@front/lib/tarefas";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { atrasada, FECHADAS, type ProjetoOpt, statusLabels, type Tarefa } from "./shared";

type Escala = "dia" | "semana" | "mes" | "trimestre";
const ESCALAS: [Escala, string, number][] = [
  ["dia", "Dia", 40],
  ["semana", "Semana", 18],
  ["mes", "Mês", 7],
  ["trimestre", "Trimestre", 3],
];
const ROW = 30;
const LEFT = 240;
const HEAD = 44;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const COR: Record<string, string> = {
  backlog: "bg-slate-400",
  a_fazer: "bg-sky-600",
  em_andamento: "bg-blue-800",
  aguardando: "bg-amber-500",
  revisao: "bg-violet-600",
  concluida: "bg-green-700",
  cancelada: "bg-slate-300",
};

const dnum = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
};
const diso = (n: number) => new Date(n * 86400000).toISOString().slice(0, 10);
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Intervalo [ini, fim] em dias; tarefa com so uma data vira 1 dia. null = sem datas. */
function intervalo(t: Tarefa): [number, number] | null {
  const a = t.data_inicio ?? t.data_prazo;
  const b = t.data_prazo ?? t.data_inicio;
  if (!a || !b) return null;
  const x = dnum(a);
  const y = dnum(b);
  return [Math.min(x, y), Math.max(x, y)];
}

function progresso(t: Tarefa) {
  if (t.status === "concluida") return 1;
  if (t.checklist.length) return t.checklist.filter((i) => i.feito).length / t.checklist.length;
  if (t.sub?.total) return t.sub.feitas / t.sub.total;
  return 0;
}

type Linha =
  | { k: "g"; id: string; label: string; n: number }
  | { k: "t"; t: Tarefa; depth: number };
type Drag = { id: string; modo: "move" | "ini" | "fim"; delta: number };

export function GanttView({
  tarefas,
  projetos,
  readOnly,
  onOpen,
  onPatch,
}: {
  tarefas: Tarefa[];
  projetos: ProjetoOpt[];
  readOnly: boolean;
  onOpen: (t: Tarefa) => void;
  onPatch: (t: Tarefa, p: Partial<Tarefa>, verbo?: string) => void;
}) {
  const [escala, setEscala] = useState<Escala>("semana");
  const px = ESCALAS.find((e) => e[0] === escala)?.[2] ?? 18;
  const [fechados, setFechados] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<Drag | null>(null);
  const movido = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);
  const corpo = useRef<HTMLDivElement>(null);
  const hoje = dnum(hojeISO());

  const semDatas = useMemo(() => tarefas.filter((t) => !intervalo(t)), [tarefas]);

  const linhas = useMemo(() => {
    const datadas = tarefas.filter((t) => intervalo(t));
    const ids = new Set(datadas.map((t) => t.id));
    const filhos = new Map<string, Tarefa[]>();
    for (const t of datadas)
      if (t.parent_id && ids.has(t.parent_id))
        filhos.set(t.parent_id, [...(filhos.get(t.parent_id) ?? []), t]);
    const porProj = new Map<string, Tarefa[]>();
    for (const t of datadas)
      if (!t.parent_id || !ids.has(t.parent_id))
        porProj.set(t.projeto_id, [...(porProj.get(t.projeto_id) ?? []), t]);
    const nome = (id: string) => {
      const p = projetos.find((x) => x.id === id);
      return p ? `${p.chave} · ${p.nome}` : "Sem projeto";
    };
    const out: Linha[] = [];
    const desce = (t: Tarefa, depth: number) => {
      out.push({ k: "t", t, depth });
      for (const f of filhos.get(t.id) ?? []) desce(f, depth + 1);
    };
    for (const [pid, ts] of [...porProj].sort((a, b) =>
      nome(a[0]).localeCompare(nome(b[0]), "pt-BR"),
    )) {
      out.push({ k: "g", id: pid, label: nome(pid), n: ts.length });
      if (fechados.has(pid)) continue;
      for (const t of ts.sort((a, b) => (intervalo(a)?.[0] ?? 0) - (intervalo(b)?.[0] ?? 0)))
        desce(t, 0);
    }
    return out;
  }, [tarefas, projetos, fechados]);

  const [ini, fim] = useMemo(() => {
    let a = hoje - 7;
    let b = hoje + 30;
    for (const t of tarefas) {
      const i = intervalo(t);
      if (i) {
        a = Math.min(a, i[0]);
        b = Math.max(b, i[1]);
      }
    }
    return [a - 7, b + 14];
  }, [tarefas, hoje]);
  const dias = fim - ini + 1;
  const largura = dias * px;

  // Centraliza em "hoje" ao montar / mudar escala.
  // biome-ignore lint/correctness/useExhaustiveDependencies: so reposiciona ao trocar escala
  useEffect(() => {
    irHoje();
  }, [escala]);
  function irHoje() {
    const el = scroller.current;
    if (el) el.scrollLeft = LEFT + (hoje - ini) * px - el.clientWidth / 2;
  }

  /** Datas efetivas considerando arraste em andamento. */
  const efetivo = (t: Tarefa): [number, number] => {
    const [a, b] = intervalo(t) as [number, number];
    if (!drag || drag.id !== t.id) return [a, b];
    if (drag.modo === "move") return [a + drag.delta, b + drag.delta];
    if (drag.modo === "ini") return [Math.min(a + drag.delta, b), b];
    return [a, Math.max(b + drag.delta, a)];
  };

  function iniciaDrag(e: React.PointerEvent, t: Tarefa, modo: Drag["modo"]) {
    if (readOnly || e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const x0 = e.clientX;
    movido.current = false;
    setDrag({ id: t.id, modo, delta: 0 });
    const move = (ev: PointerEvent) => {
      const d = Math.round((ev.clientX - x0) / px);
      if (d !== 0) movido.current = true;
      setDrag({ id: t.id, modo, delta: d });
    };
    const fimDrag = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", fimDrag);
      window.removeEventListener("pointercancel", fimDrag);
      const d = Math.round((ev.clientX - x0) / px);
      setDrag(null);
      if (ev.type === "pointerup" && d !== 0) grava(t, modo, d);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", fimDrag);
    window.addEventListener("pointercancel", fimDrag);
  }

  function grava(t: Tarefa, modo: Drag["modo"], d: number) {
    const [a, b] = intervalo(t) as [number, number];
    const na = modo === "fim" ? a : modo === "ini" ? Math.min(a + d, b) : a + d;
    const nb = modo === "ini" ? b : modo === "fim" ? Math.max(b + d, a) : b + d;
    onPatch(t, { data_inicio: diso(na), data_prazo: diso(nb) }, "reagendou");
  }

  function aoSoltar(e: React.DragEvent) {
    e.preventDefault();
    const t = tarefas.find((x) => x.id === e.dataTransfer.getData("text/plain"));
    const r = corpo.current?.getBoundingClientRect();
    if (!t || !r || readOnly) return;
    const dia = ini + Math.floor((e.clientX - r.left - LEFT) / px);
    onPatch(t, { data_inicio: diso(dia), data_prazo: diso(dia) }, "agendou");
  }

  const meses = useMemo(() => {
    const out: { l: number; w: number; label: string }[] = [];
    let d = ini;
    while (d <= fim) {
      const dt = new Date(d * 86400000);
      const prox = Math.min(
        Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 1) / 86400000,
        fim + 1,
      );
      out.push({
        l: (d - ini) * px,
        w: (prox - d) * px,
        label: `${MESES[dt.getUTCMonth()]}/${String(dt.getUTCFullYear()).slice(2)}`,
      });
      d = prox;
    }
    return out;
  }, [ini, fim, px]);

  const ticks = useMemo(() => {
    if (escala === "trimestre") return [];
    const out: { l: number; label: string }[] = [];
    for (let d = ini; d <= fim; d++) {
      const dow = (new Date(d * 86400000).getUTCDay() + 6) % 7; // 0 = segunda
      if (escala === "dia") out.push({ l: (d - ini) * px, label: diso(d).slice(8) });
      else if (dow === 0) out.push({ l: (d - ini) * px, label: ddmm(diso(d)) });
    }
    return out;
  }, [escala, ini, fim, px]);

  const dowIni = (new Date(ini * 86400000).getUTCDay() + 6) % 7;
  const yDe = new Map<string, number>();
  linhas.forEach((l, i) => {
    if (l.k === "t") yDe.set(l.t.id, i * ROW + ROW / 2);
  });
  const setas = linhas.flatMap((l) => {
    if (l.k !== "t" || !l.t.bloqueada_por_id) return [];
    const o = tarefas.find((x) => x.id === l.t.bloqueada_por_id);
    const y1 = o && yDe.get(o.id);
    const y2 = yDe.get(l.t.id);
    if (!o || y1 === undefined || y2 === undefined || !intervalo(o)) return [];
    const x1 = (efetivo(o)[1] - ini + 1) * px;
    const x2 = (efetivo(l.t)[0] - ini) * px;
    return [
      { id: l.t.id, pts: `${x1},${y1} ${x1 + 6},${y1} ${x1 + 6},${y2} ${x2 - 1},${y2}`, x2, y2 },
    ];
  });

  return (
    <div className="flex h-[calc(100dvh-17rem)] min-h-80 flex-col gap-2">
      <div className="flex shrink-0 items-center gap-2">
        <div
          className="inline-flex overflow-hidden rounded-md border border-border"
          role="toolbar"
          aria-label="Escala"
        >
          {ESCALAS.map(([k, l]) => (
            <button
              key={k}
              type="button"
              aria-pressed={escala === k}
              onClick={() => setEscala(k)}
              className={`px-2.5 py-1 text-xs ${escala === k ? "bg-accent text-primary-foreground" : "bg-surface text-text hover:bg-secondary"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={irHoje}
          className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-text hover:bg-secondary"
        >
          Hoje
        </button>
      </div>

      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-auto rounded-md border border-border bg-surface"
      >
        <div style={{ width: LEFT + largura }}>
          <div className="sticky top-0 z-30 flex bg-surface" style={{ height: HEAD }}>
            <div
              className="sticky left-0 z-10 shrink-0 border-b border-r border-border bg-surface px-2 py-1 text-xs uppercase tracking-wider text-text-muted"
              style={{ width: LEFT }}
            >
              Tarefa
            </div>
            <div className="relative border-b border-border" style={{ width: largura }}>
              {meses.map((m) => (
                <div
                  key={m.l}
                  className="absolute top-0 h-5 truncate border-l border-border px-1 text-xs font-medium text-text"
                  style={{ left: m.l, width: m.w }}
                >
                  {m.label}
                </div>
              ))}
              {ticks.map((t) => (
                <div
                  key={t.l}
                  className="absolute top-5 h-5 border-l border-border pl-0.5 text-[10px] tabular-nums text-text-muted"
                  style={{ left: t.l }}
                >
                  {t.label}
                </div>
              ))}
            </div>
          </div>

          {/* biome-ignore lint/a11y/noStaticElementInteractions: alvo de drop da lista "Sem datas" */}
          <div
            ref={corpo}
            className="relative"
            style={{ height: Math.max(linhas.length, 1) * ROW }}
            onDragOver={(e) => !readOnly && e.preventDefault()}
            onDrop={aoSoltar}
          >
            <div
              className="pointer-events-none absolute inset-y-0"
              style={{
                left: LEFT,
                width: largura,
                backgroundSize: `${7 * px}px 100%`,
                backgroundPositionX: -dowIni * px,
                backgroundImage: `linear-gradient(90deg, transparent ${5 * px}px, rgba(14,23,38,0.06) ${5 * px}px)`,
              }}
            />
            <div
              className="pointer-events-none absolute inset-y-0 w-px bg-red-500"
              style={{ left: LEFT + (hoje - ini) * px + px / 2 }}
              title="Hoje"
            />
            <svg
              className="pointer-events-none absolute inset-y-0 z-[1]"
              style={{ left: LEFT }}
              width={largura}
              height={Math.max(linhas.length, 1) * ROW}
              aria-hidden="true"
            >
              {setas.map((s) => (
                <g
                  key={s.id}
                  className="text-text-muted"
                  stroke="currentColor"
                  fill="none"
                  strokeWidth="1"
                >
                  <polyline points={s.pts} />
                  <path
                    d={`M${s.x2 - 5},${s.y2 - 3} L${s.x2 - 1},${s.y2} L${s.x2 - 5},${s.y2 + 3}`}
                  />
                </g>
              ))}
            </svg>

            {linhas.map((l, i) =>
              l.k === "g" ? (
                <div
                  key={l.id}
                  className="absolute left-0 flex items-center border-b border-border bg-secondary/60"
                  style={{ top: i * ROW, height: ROW, width: LEFT + largura }}
                >
                  <button
                    type="button"
                    aria-expanded={!fechados.has(l.id)}
                    onClick={() =>
                      setFechados((s) => {
                        const n = new Set(s);
                        if (!n.delete(l.id)) n.add(l.id);
                        return n;
                      })
                    }
                    className="sticky left-0 z-20 flex items-center gap-1 bg-secondary px-2 text-xs font-medium text-text"
                    style={{ height: ROW }}
                  >
                    {fechados.has(l.id) ? (
                      <ChevronRight className="size-3.5" />
                    ) : (
                      <ChevronDown className="size-3.5" />
                    )}
                    <span className="truncate">{l.label}</span>
                    <span className="tabular-nums text-text-muted">{l.n}</span>
                  </button>
                </div>
              ) : (
                <LinhaTarefa
                  key={l.t.id}
                  t={l.t}
                  depth={l.depth}
                  top={i * ROW}
                  efetivo={efetivo(l.t)}
                  ini={ini}
                  px={px}
                  largura={largura}
                  readOnly={readOnly}
                  onOpen={onOpen}
                  onDown={iniciaDrag}
                  movido={movido}
                  onKey={(t, d) => grava(t, "move", d)}
                />
              ),
            )}
            {linhas.length === 0 && (
              <p className="sticky left-0 p-3 text-sm text-text-muted">Nenhuma tarefa com datas.</p>
            )}
          </div>
        </div>
      </div>

      {semDatas.length > 0 && (
        <div className="max-h-24 shrink-0 overflow-y-auto rounded-md border border-border bg-surface p-2">
          <p className="mb-1 text-xs uppercase tracking-wider text-text-muted">
            Sem datas ({semDatas.length}){!readOnly && " — arraste para a grade para agendar"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {semDatas.map((t) => (
              <button
                key={t.id}
                type="button"
                draggable={!readOnly}
                onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                onClick={() => onOpen(t)}
                className="max-w-56 truncate rounded border border-border bg-bg px-2 py-0.5 text-xs text-text hover:bg-secondary"
              >
                {t.chave} {t.titulo}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LinhaTarefa({
  t,
  depth,
  top,
  efetivo: [a, b],
  ini,
  px,
  largura,
  readOnly,
  onOpen,
  onDown,
  movido,
  onKey,
}: {
  t: Tarefa;
  depth: number;
  top: number;
  efetivo: [number, number];
  ini: number;
  px: number;
  largura: number;
  readOnly: boolean;
  onOpen: (t: Tarefa) => void;
  onDown: (e: React.PointerEvent, t: Tarefa, m: Drag["modo"]) => void;
  movido: React.RefObject<boolean>;
  onKey: (t: Tarefa, d: number) => void;
}) {
  const late = atrasada(t) && !FECHADAS.includes(t.status);
  const rotulo = `${t.titulo}, ${ddmm(diso(a))} a ${ddmm(diso(b))}, ${statusLabels[t.status] ?? t.status}${late ? ", atrasada" : ""}`;
  const pr = progresso(t);
  const alca = "absolute inset-y-0 z-10 w-1.5 cursor-ew-resize";
  return (
    <div
      className="absolute left-0 flex border-b border-border/60"
      style={{ top, height: ROW, width: LEFT + largura }}
    >
      <div
        className="sticky left-0 z-20 flex shrink-0 items-center gap-1 border-r border-border bg-surface px-2 text-xs text-text"
        style={{ width: LEFT, paddingLeft: 8 + depth * 14 }}
      >
        <span className="shrink-0 tabular-nums text-text-muted">{t.chave}</span>
        <span className="truncate">{t.titulo}</span>
      </div>
      <div className="relative" style={{ width: largura }}>
        <button
          type="button"
          aria-label={rotulo}
          title={rotulo}
          onPointerDown={(e) => onDown(e, t, "move")}
          onClick={() => {
            if (movido.current) movido.current = false;
            else onOpen(t);
          }}
          onKeyDown={(e) => {
            if (readOnly || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
            e.preventDefault();
            onKey(t, e.key === "ArrowLeft" ? -1 : 1);
          }}
          className={`absolute top-1 touch-none overflow-hidden rounded-sm text-left text-[11px] text-white focus-visible:outline-2 focus-visible:outline-accent ${COR[t.status] ?? "bg-slate-400"} ${late ? "ring-2 ring-red-600" : ""} ${readOnly ? "" : "cursor-grab"}`}
          style={{ left: (a - ini) * px, width: (b - a + 1) * px, height: ROW - 8 }}
        >
          <span
            className="absolute inset-y-0 left-0 bg-black/30"
            style={{ width: `${pr * 100}%` }}
          />
          <span className="relative block truncate px-1.5 leading-5">
            {late ? "! " : ""}
            {t.titulo}
          </span>
          {!readOnly && (
            <>
              <span
                aria-hidden="true"
                className={`${alca} left-0`}
                onPointerDown={(e) => onDown(e, t, "ini")}
              />
              <span
                aria-hidden="true"
                className={`${alca} right-0`}
                onPointerDown={(e) => onDown(e, t, "fim")}
              />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
