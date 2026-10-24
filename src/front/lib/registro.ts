import type { createSupabaseServer } from "@front/lib/supabase/server";
import { ABERTAS, formatDataISO, hojeISO, statusLabels } from "@front/lib/tarefas";

type Sb = Awaited<ReturnType<typeof createSupabaseServer>>;

export type Ev = {
  id: string;
  quando: string;
  verbo: string;
  quem_id: string;
  entidade_id: string;
  cliente_id: string | null;
  projeto_id: string | null;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
};

export type TarefaInfo = {
  id: string;
  titulo: string;
  numero: number;
  status: string;
  data_prazo: string | null;
  responsavel_id: string | null;
  projeto_id: string;
  chave: string;
  projeto_nome: string;
  cliente_id: string | null;
};

export const EV_COLUNAS =
  "id, quando, verbo, quem_id, entidade_id, cliente_id, projeto_id, antes, depois";
const TAREFA_COLUNAS =
  "id, titulo, numero, status, data_prazo, responsavel_id, projeto_id, projeto:projeto_id(nome, chave, cliente_id)";

export function addDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Intervalo [ini, fim) em UTC cobrindo `dias` dias terminando em `data` (Cuiabá = UTC-4 fixo). */
export function intervalo(data: string, dias = 1) {
  return {
    ini: `${addDias(data, 1 - dias)}T00:00:00-04:00`,
    fim: `${addDias(data, 1)}T00:00:00-04:00`,
  };
}

export const dataValida = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : hojeISO());

export const horaCuiaba = (q: string) =>
  new Date(q).toLocaleTimeString("pt-BR", {
    timeZone: "America/Cuiaba",
    hour: "2-digit",
    minute: "2-digit",
  });

export const diaCuiaba = (q: string) =>
  new Date(q).toLocaleDateString("sv-SE", { timeZone: "America/Cuiaba" });

/** Sem valores financeiros em texto livre. */
export const mascarar = (s: string) => s.replace(/R\$\s*[\d.,]+/gi, "[valor]");

export const chaveDe = (t: Pick<TarefaInfo, "chave" | "numero">) => `${t.chave}-${t.numero}`;

type Row = {
  id: string;
  titulo: string;
  numero: number;
  status: string;
  data_prazo: string | null;
  responsavel_id: string | null;
  projeto_id: string;
  projeto: { nome: string; chave: string | null; cliente_id: string | null } | null;
};
const info = (r: Row): TarefaInfo => ({
  id: r.id,
  titulo: r.titulo,
  numero: r.numero,
  status: r.status,
  data_prazo: r.data_prazo,
  responsavel_id: r.responsavel_id,
  projeto_id: r.projeto_id,
  chave: r.projeto?.chave ?? "T",
  projeto_nome: r.projeto?.nome ?? "",
  cliente_id: r.projeto?.cliente_id ?? null,
});

export async function carregarTarefas(sb: Sb, ids: string[]) {
  const mapa = new Map<string, TarefaInfo>();
  for (let i = 0; i < ids.length; i += 150) {
    const { data } = await sb
      .from("tarefa")
      .select(TAREFA_COLUNAS)
      .in("id", ids.slice(i, i + 150));
    for (const r of (data ?? []) as unknown as Row[]) mapa.set(r.id, info(r));
  }
  return mapa;
}

/** Tarefas abertas (não excluídas), opcionalmente de uma pessoa. */
export async function carregarAbertas(sb: Sb, pessoaId?: string) {
  let q = sb.from("tarefa").select(TAREFA_COLUNAS).in("status", ABERTAS).is("deleted_at", null);
  if (pessoaId) q = q.eq("responsavel_id", pessoaId);
  const { data } = await q.limit(2000);
  return ((data ?? []) as unknown as Row[]).map(info);
}

const s = (v: unknown) => (typeof v === "string" ? v : undefined);
const st = (v: unknown) => (s(v) ? (statusLabels[s(v) as string] ?? (s(v) as string)) : "?");
const dt = (v: unknown) => (s(v) ? formatDataISO(s(v) as string) : "sem data");

/** Verbo legível em PT-BR (FR-003-06). */
export function descreve(ev: Ev, pessoas: Map<string, string>) {
  const a = ev.antes ?? {};
  const d = ev.depois ?? {};
  switch (ev.verbo) {
    case "concluiu":
      return "concluiu";
    case "reabriu":
      return "reabriu";
    case "moveu":
      return `moveu de ${st(a.status)} para ${st(d.status)}`;
    case "reatribuiu":
      return `reatribuiu de ${pessoas.get(s(a.responsavel_id) ?? "") ?? "ninguém"} para ${pessoas.get(s(d.responsavel_id) ?? "") ?? "ninguém"}`;
    case "reagendou":
      return `reagendou prazo de ${dt(a.data_prazo)} para ${dt(d.data_prazo)}`;
    case "repriorizou":
      return `alterou a prioridade de ${s(a.prioridade) ?? "?"} para ${s(d.prioridade) ?? "?"}`;
    case "comentou":
      return "comentou";
    case "criou":
      return "criou";
    case "excluiu":
      return "excluiu";
    default:
      return ev.verbo;
  }
}

export type Contagem = { concluidas: number; movidas: number; comentarios: number };
export const contar = (evs: Ev[]): Contagem => ({
  concluidas: evs.filter((e) => e.verbo === "concluiu").length,
  movidas: evs.filter((e) => e.verbo === "moveu").length,
  comentarios: evs.filter((e) => e.verbo === "comentou").length,
});

const linha = (t: TarefaInfo, extra = "") => `- ${chaveDe(t)} ${mascarar(t.titulo)}${extra}`;
const bloco = (titulo: string, linhas: string[]) =>
  `${titulo}\n${linhas.length ? linhas.join("\n") : "- nada"}\n`;

/** Rascunho estruturado por cliente (FR-003-07). Nunca é enviado. */
export function gerarRascunho(p: {
  cliente: string;
  data: string;
  eventos: Ev[];
  tarefas: Map<string, TarefaInfo>;
  abertas: TarefaInfo[];
}) {
  const hoje = hojeISO();
  const uniq = (ids: string[]) =>
    [...new Set(ids)].map((i) => p.tarefas.get(i)).filter((t): t is TarefaInfo => !!t);
  const ids = (vs: string[]) =>
    p.eventos.filter((e) => vs.includes(e.verbo)).map((e) => e.entidade_id);

  const entregues = uniq(ids(["concluiu"]));
  const feitos = new Set(entregues.map((t) => t.id));
  const andou = uniq(
    ids(["moveu", "comentou", "reagendou", "reatribuiu", "repriorizou", "criou", "reabriu"]),
  ).filter((t) => !feitos.has(t.id));
  const atrasadaOuBloq = (t: TarefaInfo) =>
    t.status === "aguardando" || (!!t.data_prazo && t.data_prazo < hoje);
  const bloqueadas = p.abertas.filter(atrasadaOuBloq);
  const prox = p.abertas
    .filter((t) => !atrasadaOuBloq(t) && t.data_prazo && t.data_prazo <= addDias(hoje, 7))
    .sort((a, b) => (a.data_prazo ?? "").localeCompare(b.data_prazo ?? ""));

  return [
    `Relatório diário - ${p.cliente} - ${formatDataISO(p.data)}\n`,
    bloco(
      "Entregue",
      entregues.map((t) => linha(t)),
    ),
    bloco(
      "Em andamento",
      andou.map((t) => linha(t, ` (${statusLabels[t.status] ?? t.status})`)),
    ),
    bloco(
      "Bloqueado ou atrasado",
      bloqueadas.map((t) =>
        linha(t, t.status === "aguardando" ? " (aguardando)" : ` (prazo ${dt(t.data_prazo)})`),
      ),
    ),
    bloco(
      "Próximos passos",
      prox.map((t) => linha(t, ` (prazo ${dt(t.data_prazo)})`)),
    ),
  ].join("\n");
}

export async function carregarNomes(sb: Sb) {
  const [p, c] = await Promise.all([
    sb.from("pessoa").select("id, nome").is("deleted_at", null),
    sb.from("cliente").select("id, nome_fantasia, razao_social").is("deleted_at", null),
  ]);
  return {
    pessoas: new Map((p.data ?? []).map((x) => [x.id, x.nome])),
    clientes: new Map((c.data ?? []).map((x) => [x.id, x.nome_fantasia || x.razao_social])),
  };
}

/** Periodo da URL: hoje | ontem | semana (7 dias até `data`) | dia (data escolhida). */
export function resolvePeriodo(periodo?: string, data?: string) {
  const hoje = hojeISO();
  const p = periodo === "hoje" || periodo === "ontem" || periodo === "semana" ? periodo : "dia";
  const ref =
    p === "hoje"
      ? hoje
      : p === "ontem"
        ? addDias(hoje, -1)
        : dataValida(data ?? (periodo ? undefined : hoje));
  return { p, ref, dias: p === "semana" ? 7 : 1, ...intervalo(ref, p === "semana" ? 7 : 1) };
}
