import {
  chaveDe,
  descreve,
  dm,
  type Enriq,
  type Estat,
  horaCuiaba,
  mascarar,
  PALETA,
  type TarefaInfo,
} from "@front/lib/registro";
import { statusLabels } from "@front/lib/tarefas";
import { trabalhoHref } from "@front/lib/trabalho";
import { AlertTriangle, CheckCircle2, MessageSquare, MoveRight, Paperclip } from "lucide-react";
import Link from "next/link";

type Cores = Map<string, string>;
const corDe = (c: Cores, id: string) => c.get(id) ?? "#6b6f76";

function Caixa({
  titulo,
  className = "",
  children,
}: {
  titulo: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border bg-surface ${className}`}
    >
      <h3 className="shrink-0 border-b border-border px-3 py-2 font-title text-sm text-text">
        {titulo}
      </h3>
      <div className="min-h-0 flex-1 overflow-auto p-3">{children}</div>
    </section>
  );
}

function Kpi({ rotulo, valor }: { rotulo: string; valor: string | number }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <p className="truncate text-xs text-text-muted">{rotulo}</p>
      <p className="font-title text-2xl tabular-nums text-text">{valor}</p>
    </div>
  );
}

const fmtMin = (m: number) =>
  m <= 0 ? "0min" : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;

function Anel({ entregue, planejado, extra }: Estat["plano"] & { extra: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const f = planejado ? Math.min(1, entregue / planejado) : 0;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <svg
        viewBox="0 0 120 120"
        className="w-[min(100%,9rem)]"
        role="img"
        aria-label={`${entregue} de ${planejado} entregues`}
      >
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--color-secondary)"
          strokeWidth="12"
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--color-success)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${c * f} ${c}`}
          transform="rotate(-90 60 60)"
        />
        <text
          x="60"
          y="60"
          textAnchor="middle"
          className="fill-text font-title text-2xl tabular-nums"
        >
          {entregue}/{planejado}
        </text>
        <text x="60" y="78" textAnchor="middle" className="fill-text-muted text-[9px]">
          {planejado ? `${Math.round(f * 100)}%` : "sem prazos"}
        </text>
      </svg>
      <p className="text-center text-xs text-text-muted">
        Entregue vs. planejado (prazo no período)
        {extra > 0 && <span className="block">+{extra} fora do plano</span>}
      </p>
    </div>
  );
}

function LinhaHoras({
  blocos,
  cores,
  nomes,
  tarefas,
}: {
  blocos: Estat["blocos"];
  cores: Cores;
  nomes: Map<string, string>;
  tarefas: Map<string, TarefaInfo>;
}) {
  if (!blocos.length)
    return <p className="text-sm text-text-muted">Sem ações registradas neste dia.</p>;
  const h0 = Math.min(7, Math.floor(Math.min(...blocos.map((b) => b.min)) / 60));
  const h1 = Math.max(19, Math.floor(Math.max(...blocos.map((b) => b.min)) / 60) + 1);
  const total = (h1 - h0) * 60;
  const pos = (m: number) => `${((m - h0 * 60) / total) * 100}%`;
  const fimLane: number[] = [];
  const itens = [...blocos]
    .sort((a, b) => a.min - b.min)
    .map((b) => {
      let lane = fimLane.findIndex((f) => f <= b.min);
      if (lane < 0) lane = fimLane.length;
      fimLane[lane] = b.min + 14;
      return { ...b, lane };
    });
  const lanes = Math.max(1, fimLane.length);
  const marcas = Array.from({ length: h1 - h0 + 1 }, (_, i) => h0 + i);
  return (
    <div>
      <div className="relative" style={{ height: lanes * 22 }}>
        {marcas.map((h, i) => (
          <span
            key={h}
            className="absolute inset-y-0 border-l border-border"
            style={{ left: `${(i / (h1 - h0)) * 100}%` }}
          />
        ))}
        {itens.map((b) => {
          const t = tarefas.get(b.e.entidade_id);
          const rot = `${horaCuiaba(b.e.quando)} ${nomes.get(b.cid) ?? ""}: ${descreve(b.e, new Map())} ${t ? mascarar(t.titulo) : ""}`;
          return (
            <Link
              key={b.e.id}
              href={trabalhoHref({ tarefa: t ? chaveDe(t) : undefined })}
              title={rot}
              aria-label={rot}
              className="absolute h-[18px] rounded-sm opacity-90 outline-offset-1 hover:opacity-100 focus-visible:outline-2"
              style={{
                left: pos(b.min),
                width: `${(12 / total) * 100}%`,
                top: b.lane * 22 + 2,
                background: corDe(cores, b.cid),
              }}
            />
          );
        })}
      </div>
      <div className="relative mt-1 h-4 text-[10px] tabular-nums text-text-muted">
        {marcas.map((h, i) => (
          <span
            key={h}
            className="absolute -translate-x-1/2"
            style={{ left: `${(i / (h1 - h0)) * 100}%` }}
          >
            {h0 + i}h
          </span>
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
        {[...new Set(blocos.map((b) => b.cid))].map((c) => (
          <li key={c} className="flex items-center gap-1">
            <span className="size-2.5 rounded-sm" style={{ background: corDe(cores, c) }} />
            {nomes.get(c) ?? "Sem cliente"}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ColunasDia({ dados }: { dados: Estat["porDia"] }) {
  const max = Math.max(1, ...dados.map((d) => d.eventos));
  return (
    <div
      className="flex h-full min-h-24 items-end gap-[2px]"
      role="img"
      aria-label="Entregas por dia"
    >
      {dados.map((d) => (
        <div
          key={d.dia}
          title={`${dm(d.dia)}: ${d.concluidas} concluídas, ${d.eventos} ações`}
          className="flex h-full min-w-0 flex-1 flex-col justify-end"
        >
          {dados.length <= 7 && (
            <span className="text-center text-xs tabular-nums text-text">{d.concluidas}</span>
          )}
          <div
            className="relative w-full rounded-t-sm bg-secondary"
            style={{ height: `${(d.eventos / max) * 80}%` }}
          >
            <div
              className="absolute inset-x-0 bottom-0 rounded-t-sm bg-success"
              style={{ height: `${d.eventos ? (d.concluidas / d.eventos) * 100 : 0}%` }}
            />
          </div>
          <span className="mt-1 truncate text-center text-[10px] tabular-nums text-text-muted">
            {dados.length <= 7 ? dm(d.dia) : d.dia.slice(8)}
          </span>
        </div>
      ))}
    </div>
  );
}

function Barras({
  linhas,
  rotulo,
}: {
  linhas: { id: string; nome: string; cor?: string; valor: number; detalhe: string }[];
  rotulo: string;
}) {
  const max = Math.max(1, ...linhas.map((l) => l.valor));
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-text-muted">{rotulo}</p>
      {linhas.length === 0 && <p className="text-sm text-text-muted">Nada no período.</p>}
      <ul className="space-y-1.5">
        {linhas.slice(0, 8).map((l) => (
          <li key={l.id} className="text-xs">
            <div className="flex justify-between gap-2">
              <span className="min-w-0 truncate text-text">{l.nome}</span>
              <span className="shrink-0 tabular-nums text-text-muted">{l.detalhe}</span>
            </div>
            <div className="h-2 rounded-sm bg-secondary">
              <div
                className="h-2 rounded-sm"
                style={{
                  width: `${(l.valor / max) * 100}%`,
                  background: l.cor ?? "var(--color-accent)",
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const DIAS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
function Calor({ semana, ref }: { semana: Estat["semana"]; ref: string }) {
  const max = Math.max(1, ...semana.map((d) => d.eventos));
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-text-muted">
        Intensidade na semana
      </p>
      <div className="grid grid-cols-7 gap-1">
        {semana.map((d, i) => (
          <div
            key={d.dia}
            title={`${dm(d.dia)}: ${d.eventos} ações`}
            className={`rounded-sm border py-1.5 text-center ${d.dia === ref ? "border-text ring-2 ring-accent" : "border-border"}`}
            style={{
              background: `color-mix(in srgb, var(--color-accent) ${Math.round((d.eventos / max) * 85)}%, white)`,
              color: d.eventos / max > 0.5 ? "#fff" : "var(--color-text)",
            }}
          >
            <span className="block text-[10px]">{DIAS[i]}</span>
            <span className="block text-sm tabular-nums">{d.eventos}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Comparativo({ dados }: { dados: Estat["comparativo"] }) {
  const max = Math.max(1, ...dados.flatMap((d) => [d.atual, d.media]));
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-text-muted">
        vs. média das últimas 4 semanas
      </p>
      <ul className="space-y-2">
        {dados.map((d) => {
          const delta = d.atual - d.media;
          return (
            <li key={d.rotulo} className="text-xs">
              <div className="flex justify-between">
                <span className="text-text">{d.rotulo}</span>
                <span className="tabular-nums text-text-muted">
                  {d.atual} / média {d.media.toFixed(1).replace(".", ",")} ({delta >= 0 ? "+" : ""}
                  {delta.toFixed(1).replace(".", ",")})
                </span>
              </div>
              <div className="h-1.5 rounded-sm bg-secondary">
                <div
                  className="h-1.5 rounded-sm bg-accent"
                  style={{ width: `${(d.atual / max) * 100}%` }}
                />
              </div>
              <div className="mt-0.5 h-1.5 rounded-sm bg-secondary">
                <div
                  className="h-1.5 rounded-sm bg-text-muted/50"
                  style={{ width: `${(d.media / max) * 100}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- cartões ---------- */

function Cartao({
  t,
  cor,
  cliente,
  children,
  alerta,
}: {
  t: TarefaInfo;
  cor: string;
  cliente: string;
  children: React.ReactNode;
  alerta?: boolean;
}) {
  return (
    <li
      className={`rounded-md border bg-surface p-3 text-sm ${alerta ? "border-danger/50 bg-danger/5" : "border-border"}`}
      style={{ borderLeft: `4px solid ${alerta ? "var(--color-danger)" : cor}` }}
    >
      <p className="text-xs text-text-muted">
        {cliente} · {t.projeto_nome}
      </p>
      <Link
        href={trabalhoHref({ tarefa: chaveDe(t) })}
        className="font-medium text-text hover:underline"
      >
        {chaveDe(t)} {mascarar(t.titulo)}
      </Link>
      {children}
    </li>
  );
}

export function Cartoes({
  est,
  tarefas,
  enriq,
  abertas,
  cores,
  clientes,
  pessoas,
}: {
  est: Estat;
  tarefas: Map<string, TarefaInfo>;
  enriq: Enriq;
  abertas: TarefaInfo[];
  cores: Cores;
  clientes: Map<string, string>;
  pessoas: Map<string, string>;
}) {
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Cuiaba" });
  const porTarefa = new Map<string, typeof est.eventos>();
  for (const e of est.eventos)
    porTarefa.set(e.entidade_id, [...(porTarefa.get(e.entidade_id) ?? []), e]);
  const feitas = [...porTarefa].filter(([, es]) => es.some((e) => e.verbo === "concluiu"));
  const movidas = [...porTarefa].filter(
    ([, es]) => !es.some((e) => e.verbo === "concluiu") && es.some((e) => e.verbo === "moveu"),
  );
  const riscos = abertas
    .map((t) => {
      const m: string[] = [];
      if (t.status === "aguardando") m.push("aguardando retorno");
      const b = t.bloqueada_por_id ? tarefas.get(t.bloqueada_por_id) : undefined;
      if (b && b.status !== "concluida") m.push(`bloqueada por ${chaveDe(b)}`);
      if (t.data_prazo && t.data_prazo < hoje) {
        const n = Math.round((Date.parse(hoje) - Date.parse(t.data_prazo)) / 86400000);
        m.push(`${n} ${n === 1 ? "dia" : "dias"} de atraso`);
      }
      return { t, m };
    })
    .filter((x) => x.m.length)
    .slice(0, 12);
  const cid = (t: TarefaInfo) => t.cliente_id ?? "";

  return (
    <ul className="space-y-2">
      {feitas.length + movidas.length + riscos.length === 0 && (
        <p className="text-sm text-text-muted">Nada a destacar no período.</p>
      )}
      {feitas.slice(0, 30).map(([tid, es]) => {
        const t = tarefas.get(tid);
        if (!t) return null;
        const ck = enriq.checklist.get(tid);
        const coms = enriq.comentarios.get(tid) ?? [];
        const colab = [
          ...new Set([...es.map((e) => e.quem_id), ...coms.map((c) => c.autor_id)]),
        ].map((id) => pessoas.get(id) ?? "?");
        const resumo = (t.descricao ?? "")
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        return (
          <Cartao
            key={tid}
            t={t}
            cor={corDe(cores, cid(t))}
            cliente={clientes.get(cid(t)) ?? "Sem cliente"}
          >
            <p className="mt-0.5 flex items-center gap-1 text-xs text-success">
              <CheckCircle2 className="size-3.5" /> Concluída
            </p>
            {resumo && (
              <p className="mt-1 line-clamp-2 text-xs text-text-muted">{mascarar(resumo)}</p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
              {ck && ck.total > 0 && (
                <span className="flex items-center gap-1 tabular-nums">
                  <span className="h-1.5 w-12 rounded-sm bg-secondary">
                    <span
                      className="block h-1.5 rounded-sm bg-success"
                      style={{ width: `${(ck.feito / ck.total) * 100}%` }}
                    />
                  </span>
                  {ck.feito}/{ck.total}
                </span>
              )}
              {t.n_anexos > 0 && (
                <span className="flex items-center gap-1">
                  <Paperclip className="size-3" /> {t.n_anexos}
                </span>
              )}
              {coms.length > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="size-3" /> {coms.length}
                </span>
              )}
              {colab.length > 1 && <span>com {colab.join(", ")}</span>}
            </div>
            {coms[0] && (
              <p className="mt-1 line-clamp-2 border-l-2 border-border pl-2 text-xs italic text-text-muted">
                {mascarar(coms[0].texto)}
              </p>
            )}
          </Cartao>
        );
      })}
      {movidas.slice(0, 20).map(([tid, es]) => {
        const t = tarefas.get(tid);
        if (!t) return null;
        const m = es.filter((e) => e.verbo === "moveu");
        const de = statusLabels[String(m[0].antes?.status)] ?? "?";
        const para = statusLabels[String(m[m.length - 1].depois?.status)] ?? "?";
        return (
          <Cartao
            key={tid}
            t={t}
            cor={corDe(cores, cid(t))}
            cliente={clientes.get(cid(t)) ?? "Sem cliente"}
          >
            <p className="mt-0.5 flex items-center gap-1 text-xs text-text-muted">
              <MoveRight className="size-3.5" /> de {de} para {para}
            </p>
          </Cartao>
        );
      })}
      {riscos.map(({ t, m }) => (
        <Cartao key={t.id} t={t} alerta cor="" cliente={clientes.get(cid(t)) ?? "Sem cliente"}>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-danger">
            <AlertTriangle className="size-3.5" /> {m.join("; ")}
          </p>
        </Cartao>
      ))}
    </ul>
  );
}

/* ---------- mosaico ---------- */

export function PainelPeriodo({
  est,
  dias,
  ref,
  cores,
  nomes,
  tarefas,
  enriq,
  abertas,
}: {
  est: Estat;
  dias: number;
  ref: string;
  cores: Cores;
  nomes: { pessoas: Map<string, string>; clientes: Map<string, string> };
  tarefas: Map<string, TarefaInfo>;
  enriq: Enriq;
  abertas: TarefaInfo[];
}) {
  const k = est.kpis;
  return (
    <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto lg:grid-cols-12 lg:grid-rows-[auto_minmax(0,1fr)_minmax(0,1fr)] lg:overflow-hidden">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-12 lg:grid-cols-6">
        <Kpi rotulo="Concluídas" valor={k.concluidas} />
        <Kpi rotulo="Em andamento" valor={k.andamento} />
        <Kpi rotulo="Movidas" valor={k.movidas} />
        <Kpi rotulo="Comentários" valor={k.comentarios} />
        <Kpi rotulo="Horas entregues (est.)" valor={`${k.horas.toFixed(1).replace(".", ",")}h`} />
        <Kpi rotulo="Tempo ativo" valor={fmtMin(k.ativoMin)} />
      </div>
      <Caixa titulo="Entregue vs. planejado" className="min-h-56 lg:col-span-3 lg:min-h-0">
        <Anel {...est.plano} />
      </Caixa>
      <Caixa
        titulo={dias === 1 ? "Linha do tempo do dia" : "Entregas por dia"}
        className="min-h-56 lg:col-span-5 lg:min-h-0"
      >
        {dias === 1 ? (
          <LinhaHoras blocos={est.blocos} cores={cores} nomes={nomes.clientes} tarefas={tarefas} />
        ) : (
          <ColunasDia dados={est.porDia} />
        )}
      </Caixa>
      <Caixa
        titulo="Entregas e alertas"
        className="max-h-[70vh] lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-2 lg:max-h-none"
      >
        <Cartoes
          est={est}
          tarefas={tarefas}
          enriq={enriq}
          abertas={abertas}
          cores={cores}
          clientes={nomes.clientes}
          pessoas={nomes.pessoas}
        />
      </Caixa>
      <Caixa titulo="Esforço" className="min-h-56 lg:col-span-4 lg:col-start-1 lg:min-h-0">
        <div className="space-y-4">
          <Barras
            rotulo="Por cliente"
            linhas={est.porCliente.map((c) => ({
              id: c.id,
              nome: nomes.clientes.get(c.id) ?? "Sem cliente",
              cor: corDe(cores, c.id),
              valor: c.tarefas,
              detalhe: `${c.tarefas} tarefas · ${c.eventos} ações`,
            }))}
          />
          <Barras
            rotulo="Por projeto"
            linhas={est.porProjeto.map((p) => ({
              id: p.id,
              nome: p.nome,
              cor: corDe(cores, p.cid),
              valor: p.tarefas,
              detalhe: `${p.tarefas} tarefas · ${p.eventos} ações`,
            }))}
          />
        </div>
      </Caixa>
      <Caixa titulo="Ritmo" className="min-h-56 lg:col-span-4 lg:col-start-5 lg:min-h-0">
        <div className="space-y-4">
          <Calor semana={est.semana} ref={ref} />
          <Comparativo dados={est.comparativo} />
        </div>
      </Caixa>
    </div>
  );
}

export function coresClientes(ids: string[]) {
  const m = new Map<string, string>();
  const ordem = [...new Set(ids)].sort();
  for (const [i, id] of ordem.entries()) m.set(id, PALETA[i % PALETA.length]);
  return m;
}
