import type { createSupabaseServer } from "@front/lib/supabase/server";
import type { Secoes } from "./registro-texto";
import { mascarar } from "./registro-texto";
import { rotuloEvento } from "./rotulos-evento";
import { ABERTAS, formatDataISO, hojeISO, statusLabels } from "./tarefas";

export { mascarar };

type Sb = Awaited<ReturnType<typeof createSupabaseServer>>;

export type Ev = {
  id: string;
  quando: string;
  verbo: string;
  entidade?: string;
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
  descricao: string | null;
  horas: number | null;
  bloqueada_por_id: string | null;
  n_anexos: number;
};

export const EV_COLUNAS =
  "id, quando, verbo, entidade, quem_id, entidade_id, cliente_id, projeto_id, antes, depois";
const TAREFA_COLUNAS =
  "id, titulo, numero, status, data_prazo, responsavel_id, projeto_id, descricao, estimativa_horas, bloqueada_por_id, n_anexos, projeto:projeto_id(nome, chave, cliente_id)";

/* ---------- datas ---------- */

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

const minutosDoDia = (q: string) => {
  const [h, m] = horaCuiaba(q).split(":").map(Number);
  return (h % 24) * 60 + m;
};

export const dm = (iso: string) => formatDataISO(iso).slice(0, 5);

/** Periodo da URL: hoje | ontem | semana (7 dias) | mes (30 dias) | dia (data escolhida). */
export function resolvePeriodo(periodo?: string, data?: string) {
  const hoje = hojeISO();
  const p =
    periodo === "hoje" || periodo === "ontem" || periodo === "semana" || periodo === "mes"
      ? periodo
      : "dia";
  const ref =
    p === "hoje"
      ? hoje
      : p === "ontem"
        ? addDias(hoje, -1)
        : dataValida(data ?? (periodo ? undefined : hoje));
  const dias = p === "semana" ? 7 : p === "mes" ? 30 : 1;
  return { p, ref, dias, ...intervalo(ref, dias) };
}

export const chaveDe = (t: Pick<TarefaInfo, "chave" | "numero">) => `${t.chave}-${t.numero}`;

/* ---------- carga de dados ---------- */

type Row = {
  id: string;
  titulo: string;
  numero: number;
  status: string;
  data_prazo: string | null;
  responsavel_id: string | null;
  projeto_id: string;
  descricao: string | null;
  estimativa_horas: number | null;
  bloqueada_por_id: string | null;
  n_anexos: number | null;
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
  descricao: r.descricao,
  horas: r.estimativa_horas,
  bloqueada_por_id: r.bloqueada_por_id,
  n_anexos: r.n_anexos ?? 0,
});

export async function carregarTarefas(sb: Sb, ids: string[], mapa = new Map<string, TarefaInfo>()) {
  const falta = ids.filter((i) => !mapa.has(i));
  for (let i = 0; i < falta.length; i += 150) {
    const { data } = await sb
      .from("tarefa")
      .select(TAREFA_COLUNAS)
      .in("id", falta.slice(i, i + 150));
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

export type Comentario = { autor_id: string; texto: string; created_at: string };
export type Enriq = {
  checklist: Map<string, { feito: number; total: number }>;
  comentarios: Map<string, Comentario[]>;
  /** concluída -> tarefas abertas que dependiam dela */
  destravou: Map<string, TarefaInfo[]>;
};

/** Checklist, comentários do período e dependências; completa `tarefas` com as bloqueadoras. */
export async function carregarEnriq(
  sb: Sb,
  tarefas: Map<string, TarefaInfo>,
  abertas: TarefaInfo[],
  ini: string,
  fim: string,
): Promise<Enriq> {
  const ids = [...new Set([...tarefas.keys(), ...abertas.map((t) => t.id)])];
  const enr: Enriq = { checklist: new Map(), comentarios: new Map(), destravou: new Map() };

  const { data: cks } = await sb
    .from("checklist")
    .select("id, tarefa_id")
    .in("tarefa_id", ids.slice(0, 500));
  const porCk = new Map((cks ?? []).map((c) => [c.id, c.tarefa_id]));
  if (porCk.size) {
    const { data: itens } = await sb
      .from("checklist_item")
      .select("checklist_id, feito")
      .in("checklist_id", [...porCk.keys()]);
    for (const it of itens ?? []) {
      const tid = porCk.get(it.checklist_id);
      if (!tid) continue;
      const c = enr.checklist.get(tid) ?? { feito: 0, total: 0 };
      c.total++;
      if (it.feito) c.feito++;
      enr.checklist.set(tid, c);
    }
  }

  const { data: coms } = await sb
    .from("comentario")
    .select("tarefa_id, autor_id, texto, created_at")
    .in("tarefa_id", ids.slice(0, 500))
    .is("deleted_at", null)
    .gte("created_at", ini)
    .lt("created_at", fim)
    .order("created_at");
  for (const c of coms ?? [])
    enr.comentarios.set(c.tarefa_id, [...(enr.comentarios.get(c.tarefa_id) ?? []), c]);

  const concl = ids.filter((i) => tarefas.get(i)?.status === "concluida");
  if (concl.length) {
    const { data } = await sb
      .from("tarefa")
      .select(TAREFA_COLUNAS)
      .in("bloqueada_por_id", concl.slice(0, 300))
      .in("status", ABERTAS)
      .is("deleted_at", null);
    for (const r of (data ?? []) as unknown as Row[]) {
      const t = info(r);
      if (t.bloqueada_por_id)
        enr.destravou.set(t.bloqueada_por_id, [
          ...(enr.destravou.get(t.bloqueada_por_id) ?? []),
          t,
        ]);
    }
  }
  await carregarTarefas(
    sb,
    abertas.map((t) => t.bloqueada_por_id).filter((x): x is string => !!x),
    tarefas,
  );
  return enr;
}

/* ---------- descrição de eventos ---------- */

const s = (v: unknown) => (typeof v === "string" ? v : undefined);
const st = (v: unknown) => (s(v) ? (statusLabels[s(v) as string] ?? (s(v) as string)) : "?");
const dt = (v: unknown) => (s(v) ? formatDataISO(s(v) as string) : "sem data");

/** Verbo legível em PT-BR (terceira pessoa). */
export function descreve(ev: Ev, pessoas: Map<string, string>) {
  const a = ev.antes ?? {};
  const d = ev.depois ?? {};
  switch (ev.verbo) {
    case "moveu":
      return `moveu de ${st(a.status)} para ${st(d.status)}`;
    case "reatribuiu":
      return `reatribuiu de ${pessoas.get(s(a.responsavel_id) ?? "") ?? "ninguém"} para ${pessoas.get(s(d.responsavel_id) ?? "") ?? "ninguém"}`;
    case "reagendou":
      return `reagendou prazo de ${dt(a.data_prazo)} para ${dt(d.data_prazo)}`;
    case "repriorizou":
      return `alterou a prioridade de ${s(a.prioridade) ?? "?"} para ${s(d.prioridade) ?? "?"}`;
    default: {
      const r = rotuloEvento(ev.verbo, ev.entidade);
      return r.charAt(0).toLowerCase() + r.slice(1);
    }
  }
}

/* ---------- estatísticas visuais ---------- */

export const PALETA = [
  "#2a5d9f",
  "#c2571a",
  "#2f8f6b",
  "#8a5fb0",
  "#b8921f",
  "#c23b5b",
  "#4b8f9c",
  "#6b6f76",
];

export type Estat = {
  eventos: Ev[];
  kpis: {
    concluidas: number;
    andamento: number;
    movidas: number;
    comentarios: number;
    horas: number;
    ativoMin: number;
  };
  plano: { planejado: number; entregue: number; extra: number };
  porCliente: { id: string; tarefas: number; eventos: number }[];
  porProjeto: { id: string; nome: string; cid: string; tarefas: number; eventos: number }[];
  porDia: { dia: string; concluidas: number; eventos: number }[];
  semana: { dia: string; eventos: number }[];
  comparativo: { rotulo: string; atual: number; media: number }[];
  blocos: { e: Ev; min: number; cid: string }[];
};

export function estatisticas(a: {
  ref: string;
  dias: number;
  /** eventos da janela (período + 4 períodos anteriores) */
  eventos: Ev[];
  tarefas: Map<string, TarefaInfo>;
  abertas: TarefaInfo[];
}): Estat {
  const { ref, dias, tarefas, abertas } = a;
  const d0 = addDias(ref, 1 - dias);
  const marc = a.eventos.map((e) => ({ e, dia: diaCuiaba(e.quando), min: minutosDoDia(e.quando) }));
  const cidDe = (e: Ev) => e.cliente_id ?? tarefas.get(e.entidade_id)?.cliente_id ?? "";
  const per = marc.filter((m) => m.dia >= d0 && m.dia <= ref);
  const eventos = per.map((m) => m.e);

  const concl = new Set(eventos.filter((e) => e.verbo === "concluiu").map((e) => e.entidade_id));
  const tocadas = new Set(eventos.map((e) => e.entidade_id));
  const andamento = [...tocadas].filter((id) => {
    const t = tarefas.get(id);
    return t && (t.status === "em_andamento" || t.status === "revisao");
  }).length;
  const horas = [...concl].reduce((n, id) => n + (tarefas.get(id)?.horas ?? 0), 0);

  const porDiaMin = new Map<string, [number, number]>();
  for (const m of per) {
    const x = porDiaMin.get(m.dia);
    porDiaMin.set(m.dia, x ? [Math.min(x[0], m.min), Math.max(x[1], m.min)] : [m.min, m.min]);
  }
  const ativoMin = [...porDiaMin.values()].reduce((n, [i, f]) => n + (f - i), 0);

  const noPeriodo = (p: string | null) => !!p && p >= d0 && p <= ref;
  const planejadosIds = new Set([
    ...abertas.filter((t) => noPeriodo(t.data_prazo)).map((t) => t.id),
    ...[...concl].filter((id) => noPeriodo(tarefas.get(id)?.data_prazo ?? null)),
  ]);
  const entregue = [...concl].filter((id) => planejadosIds.has(id)).length;

  const agrupa = <K extends string>(chave: (e: Ev) => K) => {
    const m = new Map<K, { t: Set<string>; n: number }>();
    for (const e of eventos) {
      const k = chave(e);
      const x = m.get(k) ?? { t: new Set<string>(), n: 0 };
      x.t.add(e.entidade_id);
      x.n++;
      m.set(k, x);
    }
    return m;
  };
  const porCliente = [...agrupa(cidDe)]
    .map(([id, x]) => ({ id, tarefas: x.t.size, eventos: x.n }))
    .sort((p, q) => q.tarefas - p.tarefas || q.eventos - p.eventos);
  const porProjeto = [
    ...agrupa((e) => e.projeto_id ?? tarefas.get(e.entidade_id)?.projeto_id ?? ""),
  ]
    .map(([id, x]) => {
      const t = [...tarefas.values()].find((y) => y.projeto_id === id);
      return {
        id,
        nome: t?.projeto_nome || "Sem projeto",
        cid: t?.cliente_id ?? "",
        tarefas: x.t.size,
        eventos: x.n,
      };
    })
    .sort((p, q) => q.tarefas - p.tarefas || q.eventos - p.eventos);

  const diasLista = Array.from({ length: dias }, (_, i) => addDias(d0, i));
  const porDia = diasLista.map((dia) => {
    const es = per.filter((m) => m.dia === dia);
    return {
      dia,
      concluidas: es.filter((m) => m.e.verbo === "concluiu").length,
      eventos: es.length,
    };
  });

  const dow = new Date(`${ref}T12:00:00Z`).getUTCDay();
  const seg = addDias(ref, -((dow + 6) % 7));
  const semana = Array.from({ length: 7 }, (_, i) => {
    const dia = addDias(seg, i);
    return { dia, eventos: marc.filter((m) => m.dia === dia).length };
  });

  const cnt = (verbo: string, de: string, ate: string) =>
    marc.filter((m) => m.e.verbo === verbo && m.dia >= de && m.dia <= ate).length;
  const media = (verbo: string) => {
    let t = 0;
    for (let k = 1; k <= 4; k++) t += cnt(verbo, addDias(d0, -7 * k), addDias(ref, -7 * k));
    return t / 4;
  };
  const comparativo = [
    ["Concluídas", "concluiu"],
    ["Movidas", "moveu"],
    ["Comentários", "comentou"],
  ].map(([rotulo, v]) => ({ rotulo, atual: cnt(v, d0, ref), media: media(v) }));

  return {
    eventos,
    kpis: {
      concluidas: concl.size,
      andamento,
      movidas: eventos.filter((e) => e.verbo === "moveu").length,
      comentarios: eventos.filter((e) => e.verbo === "comentou").length,
      horas,
      ativoMin,
    },
    plano: { planejado: planejadosIds.size, entregue, extra: concl.size - entregue },
    porCliente,
    porProjeto,
    porDia,
    semana,
    comparativo,
    blocos: dias === 1 ? per.map((m) => ({ e: m.e, min: m.min, cid: cidDe(m.e) })) : [],
  };
}

/* ---------- relatório narrativo (regras determinísticas) ---------- */

type Voz = "eu" | "equipe";
const VERBOS: Record<string, [string, string]> = {
  concluiu: ["concluí", "concluiu"],
  reabriu: ["reabri", "reabriu"],
  criou: ["criei", "criou"],
  excluiu: ["excluí", "excluiu"],
};

const lista = (p: string[]) =>
  p.length > 1 ? `${p.slice(0, -1).join(", ")} e ${p[p.length - 1]}` : (p[0] ?? "");
const plural = (n: number, u: string, m: string) => `${n} ${n === 1 ? u : m}`;
const curto = (t: string | null, n = 140) => {
  const x = (t ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return x.length > n ? `${x.slice(0, n - 1).trimEnd()}…` : x;
};
const ref_ = (t: TarefaInfo) => `“${t.titulo}” (${chaveDe(t)})`;

/** Uma frase para todos os eventos de uma mesma tarefa por um mesmo autor. */
function fraseAcoes(evs: Ev[], i: 0 | 1, pessoas: Map<string, string>) {
  const partes: string[] = [];
  const vistos = new Set<string>();
  for (const e of evs) {
    if (vistos.has(e.verbo)) continue;
    vistos.add(e.verbo);
    const mesmos = evs.filter((x) => x.verbo === e.verbo);
    const ult = mesmos[mesmos.length - 1];
    if (VERBOS[e.verbo]) partes.push(VERBOS[e.verbo][i]);
    else if (e.verbo === "moveu") {
      const de = st(e.antes?.status);
      const para = st(ult.depois?.status);
      if (de !== para) partes.push(`${i ? "moveu" : "movi"} de ${de} para ${para}`);
    } else if (e.verbo === "reatribuiu")
      partes.push(
        `${i ? "reatribuiu" : "reatribuí"} para ${pessoas.get(s(ult.depois?.responsavel_id) ?? "") ?? "ninguém"}`,
      );
    else if (e.verbo === "reagendou")
      partes.push(`${i ? "reagendou" : "reagendei"} o prazo para ${dt(ult.depois?.data_prazo)}`);
    else if (e.verbo === "repriorizou") partes.push(`${i ? "ajustou" : "ajustei"} a prioridade`);
    else if (e.verbo === "comentou")
      partes.push(
        mesmos.length === 1
          ? i
            ? "comentou"
            : "comentei"
          : `${i ? "comentou" : "comentei"} ${mesmos.length} vezes`,
      );
  }
  return lista(partes);
}

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

export function gerarSecoes(a: {
  voz: Voz;
  cliente: string;
  ref: string;
  dias: number;
  eventos: Ev[];
  tarefas: Map<string, TarefaInfo>;
  abertas: TarefaInfo[];
  enriq: Enriq;
  pessoas: Map<string, string>;
}): Secoes {
  const { voz, ref, dias, tarefas, abertas, enriq, pessoas } = a;
  const hoje = hojeISO();
  const nome = (id: string) => pessoas.get(id) ?? "Alguém";

  const porTarefa = new Map<string, Ev[]>();
  for (const e of a.eventos)
    porTarefa.set(e.entidade_id, [...(porTarefa.get(e.entidade_id) ?? []), e]);
  const feitas = [...porTarefa].filter(([, es]) => es.some((e) => e.verbo === "concluiu"));
  const andou = [...porTarefa].filter(([, es]) => !es.some((e) => e.verbo === "concluiu"));

  /** "Fulano concluiu e comentou; Beltrano comentou" (voz equipe) ou frase direta (voz eu). */
  const frase = (es: Ev[]) => {
    if (voz === "eu") return cap(fraseAcoes(es, 0, pessoas));
    const quem = [...new Set(es.map((e) => e.quem_id))];
    return quem
      .map(
        (q) =>
          `${nome(q)} ${fraseAcoes(
            es.filter((e) => e.quem_id === q),
            1,
            pessoas,
          )}`,
      )
      .join("; ");
  };
  const colabora = (tid: string, es: Ev[]) => {
    const autores = new Set([
      ...es.map((e) => e.quem_id),
      ...(enriq.comentarios.get(tid) ?? []).map((c) => c.autor_id),
    ]);
    if (voz === "eu") {
      const eu = es[0]?.quem_id;
      autores.delete(eu);
    }
    return [...autores].map(nome);
  };

  const entregas = feitas.map(([tid, es]) => {
    const t = tarefas.get(tid);
    if (!t) return "";
    const extras: string[] = [];
    const ck = enriq.checklist.get(tid);
    if (ck?.total) extras.push(`checklist ${ck.feito}/${ck.total}`);
    if (t.n_anexos) extras.push(plural(t.n_anexos, "anexo", "anexos"));
    const col = colabora(tid, es);
    if (col.length) extras.push(`com ${lista(col)}`);
    if (t.horas) extras.push(`cerca de ${t.horas}h estimadas`);
    const dest = enriq.destravou.get(tid) ?? [];
    return [
      `- ${frase(es)} ${ref_(t)}${curto(t.descricao) ? `: ${curto(t.descricao).replace(/[.!?…]*$/, ".")}` : "."}`,
      extras.length ? ` ${cap(extras.join("; "))}.` : "",
      dest.length ? ` Isso destravou ${lista(dest.map(ref_))}.` : "",
    ].join("");
  });

  const andamento = andou.map(([tid, es]) => {
    const t = tarefas.get(tid);
    if (!t) return "";
    const f = frase(es);
    const prazo = t.data_prazo ? `; prazo ${formatDataISO(t.data_prazo)}` : "";
    return `- ${f} ${ref_(t)}; situação atual: ${statusLabels[t.status] ?? t.status}${prazo}.`;
  });

  const motivos = (t: TarefaInfo) => {
    const m: string[] = [];
    if (t.status === "aguardando") m.push("aguardando retorno");
    const b = t.bloqueada_por_id ? tarefas.get(t.bloqueada_por_id) : undefined;
    if (b && b.status !== "concluida") m.push(`bloqueada por ${ref_(b)}`);
    if (t.data_prazo && t.data_prazo < hoje) {
      const n = Math.round((Date.parse(hoje) - Date.parse(t.data_prazo)) / 86400000);
      m.push(`${plural(n, "dia", "dias")} de atraso (prazo ${formatDataISO(t.data_prazo)})`);
    }
    return m;
  };
  const comRisco = abertas.map((t) => ({ t, m: motivos(t) })).filter((x) => x.m.length);
  const bloqueios = comRisco.map(({ t, m }) => `- ${ref_(t)}: ${m.join("; ")}.`);

  const limite = addDias(hoje, 7);
  const proximos = [
    ...comRisco.slice(0, 3).map(({ t }) => `- Desbloquear ou replanejar ${ref_(t)}.`),
    ...abertas
      .filter((t) => t.data_prazo && t.data_prazo >= hoje && t.data_prazo <= limite)
      .sort((p, q) => (p.data_prazo ?? "").localeCompare(q.data_prazo ?? ""))
      .slice(0, 8)
      .map((t) => `- ${ref_(t)}, prazo ${formatDataISO(t.data_prazo ?? "")}.`),
  ];

  const obs = [...porTarefa.keys()].flatMap((tid) =>
    (enriq.comentarios.get(tid) ?? []).slice(0, 2).map((c) => {
      const t = tarefas.get(tid);
      return `- ${t ? chaveDe(t) : "Tarefa"} (${nome(c.autor_id)}): “${curto(c.texto, 160)}”`;
    }),
  );

  const quando =
    dias === 1
      ? ref === hoje
        ? "hoje"
        : `em ${dm(ref)}`
      : dias === 7
        ? `na semana (até ${dm(ref)})`
        : `no mês (até ${dm(ref)})`;
  const horas = feitas.reduce((n, [tid]) => n + (tarefas.get(tid)?.horas ?? 0), 0);
  const sujeito = voz === "eu" ? "Atuei" : "A equipe atuou";
  const resumo =
    porTarefa.size === 0
      ? `Sem movimentação registrada em ${a.cliente} ${quando}.${comRisco.length ? ` Há ${plural(comRisco.length, "ponto", "pontos")} de atenção em aberto.` : ""}`
      : `${sujeito} em ${plural(porTarefa.size, "tarefa", "tarefas")} de ${a.cliente} ${quando}: ${plural(feitas.length, "concluída", "concluídas")}, ${plural(andou.length, "em andamento", "em andamento")} e ${plural(a.eventos.filter((e) => e.verbo === "comentou").length, "comentário", "comentários")}.${horas ? ` As entregas somam cerca de ${horas}h estimadas.` : ""}${comRisco.length ? ` Atenção: ${plural(comRisco.length, "tarefa com bloqueio ou atraso", "tarefas com bloqueio ou atraso")}.` : ""}`;

  const j = (l: string[], vazio: string) => mascarar(l.filter(Boolean).join("\n") || vazio);
  return {
    resumo: mascarar(resumo),
    entregas: j(entregas, "Nenhuma entrega concluída no período."),
    andamento: j(andamento, "Nada em andamento movimentado no período."),
    bloqueios: j(bloqueios, "Nenhum bloqueio ou atraso identificado."),
    proximos: j(proximos, "Sem tarefas com prazo próximo."),
    obs: j(obs, "Sem observações."),
  };
}

export function tituloRelatorio(cliente: string, ref: string, dias: number) {
  const k = dias === 1 ? "diário" : dias === 7 ? "semanal" : "mensal";
  return `Relatório ${k} - ${cliente} - ${dias === 1 ? formatDataISO(ref) : `até ${formatDataISO(ref)}`}`;
}

/** Monta eventos + tarefas + enriquecimento do período para um escopo (pessoa e/ou cliente). */
export async function carregarPeriodo(
  sb: Sb,
  o: { ref: string; dias: number; pessoaId?: string; clienteId?: string },
) {
  const { ini, fim } = intervalo(o.ref, o.dias);
  const janela = intervalo(addDias(o.ref, -28), o.dias).ini;
  let q = sb
    .from("evento")
    .select(EV_COLUNAS)
    .eq("entidade", "tarefa")
    .gte("quando", janela)
    .lt("quando", fim)
    .order("quando", { ascending: true })
    .limit(8000);
  if (o.pessoaId) q = q.eq("quem_id", o.pessoaId);
  if (o.clienteId) q = q.eq("cliente_id", o.clienteId);
  const { data } = await q;
  const todos = (data ?? []) as unknown as Ev[];
  const noPeriodo = todos.filter((e) => e.quando >= new Date(ini).toISOString());
  const [tarefas, nomes, abertasTodas] = await Promise.all([
    carregarTarefas(sb, [...new Set(todos.map((e) => e.entidade_id))]),
    carregarNomes(sb),
    carregarAbertas(sb, o.pessoaId),
  ]);
  const abertas = o.clienteId
    ? abertasTodas.filter((t) => t.cliente_id === o.clienteId)
    : abertasTodas;
  const enriq = await carregarEnriq(sb, tarefas, abertas, ini, fim);
  return { todos, noPeriodo, tarefas, nomes, abertas, enriq, ini, fim };
}

export type Periodo = Awaited<ReturnType<typeof carregarPeriodo>>;

export const clienteDoEvento = (d: Periodo, e: Ev) =>
  e.cliente_id ?? d.tarefas.get(e.entidade_id)?.cliente_id ?? "";

export function secoesDoCliente(
  d: Periodo,
  o: { voz: Voz; ref: string; dias: number; cid: string },
) {
  const cliente = d.nomes.clientes.get(o.cid) ?? "Cliente";
  return {
    cliente,
    secoes: gerarSecoes({
      voz: o.voz,
      cliente,
      ref: o.ref,
      dias: o.dias,
      eventos: d.noPeriodo.filter((e) => clienteDoEvento(d, e) === o.cid),
      tarefas: d.tarefas,
      abertas: d.abertas.filter((t) => t.cliente_id === o.cid),
      enriq: d.enriq,
      pessoas: d.nomes.pessoas,
    }),
  };
}
