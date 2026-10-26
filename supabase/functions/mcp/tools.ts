// Ferramentas MCP do Wyter Hub. Todas consultam com o cliente do USUARIO (RLS vale).
import { z } from "npm:zod@4.6.7";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { limpar, mascarar } from "./seguro.ts";

export type Ctx = {
  db: SupabaseClient;
  me: { pessoa_id: string; org_id: string; papel: string; escopo: string };
};
export type Tool = {
  name: string;
  description: string;
  escrita?: boolean;
  gestor?: boolean;
  schema: z.ZodObject<z.ZodRawShape>;
  run: (ctx: Ctx, a: any) => Promise<unknown>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuid = z.string().regex(UUID_RE, "UUID invalido");
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use AAAA-MM-DD");
const STATUS = ["backlog", "a_fazer", "em_andamento", "aguardando", "revisao", "concluida", "cancelada"] as const;
const PRIORIDADES = ["critica", "alta", "media", "baixa"] as const;
const limite = (d = 25) => z.number().int().min(1).max(50).default(d).describe("Maximo de itens (1 a 50)");

const hojeCuiaba = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Cuiaba" }).format(new Date());
// Cuiaba nao tem horario de verao: UTC-4 fixo.
const limitesDia = (d: string) => [`${d}T00:00:00-04:00`, `${d}T23:59:59.999-04:00`];
const busca = (q: string) => q.replace(/[,()%*\\]/g, " ").trim();
const nomeCliente = (c: any) => c?.nome_fantasia || c?.razao_social || "";

function ok<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

const TAREFA_SEL =
  "id, numero, titulo, status, prioridade, data_prazo, estimativa_horas, responsavel_id, parent_id, " +
  "responsavel:pessoa!responsavel_id(nome), projeto:projeto!inner(id, nome, chave, cliente_id, contrato_id, cliente:cliente_id(razao_social, nome_fantasia))";

const resumoTarefa = (t: any) => ({
  id: t.id,
  chave: t.projeto?.chave && t.numero ? `${t.projeto.chave}-${t.numero}` : null,
  titulo: t.titulo,
  status: t.status,
  prioridade: t.prioridade,
  prazo: t.data_prazo,
  responsavel: t.responsavel?.nome ?? null,
  projeto: t.projeto?.nome,
  cliente: nomeCliente(t.projeto?.cliente),
  subtarefa: !!t.parent_id,
});

async function resolverTarefa(ctx: Ctx, ref: string): Promise<string> {
  if (UUID_RE.test(ref)) return ref;
  const m = ref.toUpperCase().match(/^([A-Z0-9]{2,6})-(\d+)$/);
  if (!m) throw new Error("Informe o id (UUID) ou a chave da tarefa (ex.: ABC-12).");
  const p = ok(await ctx.db.from("projeto").select("id").eq("chave", m[1]).maybeSingle());
  if (!p) throw new Error(`Projeto ${m[1]} nao encontrado.`);
  const t = ok(await ctx.db.from("tarefa").select("id").eq("projeto_id", (p as any).id).eq("numero", Number(m[2])).maybeSingle());
  if (!t) throw new Error(`Tarefa ${ref} nao encontrada.`);
  return (t as any).id;
}
const tarefaRef = z.string().min(2).max(60).describe("Id (UUID) ou chave da tarefa, ex.: ABC-12");

// --------------------------------------------------------------------------- dossie
async function dossieMarkdown(ctx: Ctx, id: string): Promise<string> {
  const { db } = ctx;
  const c: any = ok(
    await db.from("cliente")
      .select("id, razao_social, nome_fantasia, segmento, cidade, uf, status, tags, responsavel:pessoa!responsavel_id(nome)")
      .eq("id", id).is("deleted_at", null).maybeSingle(),
  );
  if (!c) throw new Error("Cliente nao encontrado ou sem acesso.");
  const [contatos, contratos, andamento, projetos, dossie, tarefas] = await Promise.all([
    db.from("contato_cliente").select("nome, papel_no_cliente").eq("cliente_id", id).is("deleted_at", null),
    db.from("contrato").select("id, tipo, numero, vigencia_inicio, vigencia_fim").eq("cliente_id", id).is("deleted_at", null),
    db.from("contrato_andamento").select("contrato_id, situacao, total_tarefas, tarefas_entregues").eq("cliente_id", id),
    db.from("projeto").select("id, nome, chave, status, data_fim").eq("cliente_id", id).is("deleted_at", null),
    db.from("dossie_cliente").select("id, tipo, conteudo, confianca, fonte, data_referencia, retifica_id").eq("cliente_id", id).is("deleted_at", null).order("created_at", { ascending: false }).limit(200),
    db.from("tarefa").select("status, data_prazo, projeto:projeto!inner(cliente_id)").eq("projeto.cliente_id", id).is("deleted_at", null).not("status", "in", "(concluida,cancelada)"),
  ]);
  const and = new Map((ok(andamento) as any[]).map((a) => [a.contrato_id, a]));
  const hoje = hojeCuiaba();
  const abertas = ok(tarefas) as any[];
  const atrasadas = abertas.filter((t) => t.data_prazo && t.data_prazo < hoje).length;
  const retificados = new Set((ok(dossie) as any[]).map((d) => d.retifica_id).filter(Boolean));
  const L: string[] = [];
  L.push(`# ${nomeCliente(c)}`, "");
  L.push(`- Razao social: ${c.razao_social}`, `- Situacao: ${c.status}`);
  if (c.segmento) L.push(`- Segmento: ${c.segmento}`);
  if (c.cidade) L.push(`- Local: ${c.cidade}${c.uf ? `/${c.uf}` : ""}`);
  if (c.responsavel?.nome) L.push(`- Responsavel: ${c.responsavel.nome}`);
  if (c.tags?.length) L.push(`- Tags: ${c.tags.join(", ")}`);
  L.push(`- Tarefas abertas: ${abertas.length} (${atrasadas} atrasadas)`, "");
  const ct = ok(contatos) as any[];
  if (ct.length) L.push("## Contatos (papel)", ...ct.map((x) => `- ${x.nome}${x.papel_no_cliente ? ` (${x.papel_no_cliente})` : ""}`), "");
  const cs = ok(contratos) as any[];
  if (cs.length) {
    L.push("## Contratos", ...cs.map((x) => {
      const a: any = and.get(x.id);
      return `- ${x.tipo}${x.numero ? ` ${x.numero}` : ""}: ${x.vigencia_inicio} a ${x.vigencia_fim ?? "indeterminado"}; situacao ${a?.situacao ?? "n/d"}` +
        (a ? ` (${a.tarefas_entregues}/${a.total_tarefas} tarefas entregues)` : "");
    }), "");
  }
  const pj = ok(projetos) as any[];
  if (pj.length) L.push("## Projetos", ...pj.map((x) => `- ${x.chave ?? ""} ${x.nome} (${x.status})`), "");
  const ds = (ok(dossie) as any[]).filter((d) => !retificados.has(d.id));
  if (ds.length) {
    L.push("## Dossie");
    for (const tipo of ["fato", "decisao", "restricao", "sistema", "glossario", "pessoa_chave"]) {
      const g = ds.filter((d) => d.tipo === tipo);
      if (!g.length) continue;
      L.push(`### ${tipo}`, ...g.map((d) => `- ${d.conteudo}${d.confianca === "a_confirmar" ? " [a confirmar]" : ""}${d.fonte ? ` (fonte: ${d.fonte})` : ""}`));
    }
  }
  return mascarar(L.join("\n"));
}
export const dossieCliente = dossieMarkdown;

// --------------------------------------------------------------------------- dia
async function eventosDoDia(ctx: Ctx, dia: string, clienteId?: string) {
  const [de, ate] = limitesDia(dia);
  let q = ctx.db.from("evento")
    .select("id, quando, verbo, entidade, entidade_id, origem, cliente_id, projeto_id, depois")
    .eq("quem_id", ctx.me.pessoa_id).neq("entidade", "mcp")
    .gte("quando", de).lte("quando", ate).order("quando").limit(500);
  if (clienteId) q = q.eq("cliente_id", clienteId);
  const ev = ok(await q) as any[];
  const ids = [...new Set(ev.filter((e) => e.entidade === "tarefa").map((e) => e.entidade_id))];
  const cids = [...new Set(ev.map((e) => e.cliente_id).filter(Boolean))];
  const [ts, cs] = await Promise.all([
    ids.length ? ctx.db.from("tarefa").select("id, titulo, status, data_prazo, bloqueada_por_id, projeto:projeto!inner(nome, chave)").in("id", ids) : { data: [], error: null },
    cids.length ? ctx.db.from("cliente").select("id, razao_social, nome_fantasia").in("id", cids) : { data: [], error: null },
  ]);
  const tmap = new Map((ok(ts as any) as any[]).map((t) => [t.id, t]));
  const cmap = new Map((ok(cs as any) as any[]).map((c) => [c.id, nomeCliente(c)]));
  return { ev, tmap, cmap };
}

const VERBO_TXT: Record<string, string> = {
  criou: "criou", concluiu: "concluiu", reabriu: "reabriu", moveu: "moveu", reatribuiu: "reatribuiu",
  reagendou: "reagendou", repriorizou: "repriorizou", comentou: "comentou em", editou: "editou", excluiu: "excluiu",
};

async function meuDia(ctx: Ctx, dia: string) {
  const { ev, tmap, cmap } = await eventosDoDia(ctx, dia);
  const grupos = new Map<string, string[]>();
  for (const e of ev) {
    const t: any = tmap.get(e.entidade_id);
    const cli = cmap.get(e.cliente_id) ?? "Sem cliente";
    const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Cuiaba", hour: "2-digit", minute: "2-digit" }).format(new Date(e.quando));
    const alvo = t ? `${t.projeto?.chave ?? ""} ${t.titulo}`.trim() : e.entidade;
    const g = grupos.get(cli) ?? [];
    g.push(`${hora} ${VERBO_TXT[e.verbo] ?? e.verbo} ${alvo}${e.verbo === "moveu" && e.depois?.status ? ` para ${e.depois.status}` : ""}`);
    grupos.set(cli, g);
  }
  const contagem = (v: string) => ev.filter((e) => e.verbo === v).length;
  return {
    data: dia,
    total_eventos: ev.length,
    concluidas: contagem("concluiu"),
    movidas: contagem("moveu"),
    comentarios: contagem("comentou"),
    por_cliente: Object.fromEntries(grupos),
  };
}

async function relatorioDiario(ctx: Ctx, dia: string, clienteId?: string) {
  const { ev, tmap, cmap } = await eventosDoDia(ctx, dia, clienteId);
  const porCliente = new Map<string, any[]>();
  for (const e of ev) {
    const k = e.cliente_id ?? "_";
    porCliente.set(k, [...(porCliente.get(k) ?? []), e]);
  }
  const hoje = hojeCuiaba();
  const [y, m, d] = dia.split("-");
  const out: string[] = [`# Relatorio do dia ${d}/${m}/${y} (rascunho, nao enviado)`, ""];
  if (!porCliente.size) out.push("Nenhuma atividade registrada neste dia.");
  for (const [cid, evs] of porCliente) {
    const nome = cid === "_" ? "Sem cliente" : cmap.get(cid) ?? "Cliente";
    // uma frase por tarefa, mesmo com varios eventos
    const porTarefa = new Map<string, Set<string>>();
    for (const e of evs) {
      if (e.entidade !== "tarefa") continue;
      porTarefa.set(e.entidade_id, (porTarefa.get(e.entidade_id) ?? new Set()).add(e.verbo));
    }
    const titulo = (id: string) => (tmap.get(id) as any)?.titulo ?? "tarefa";
    const entregas = [...porTarefa].filter(([, v]) => v.has("concluiu")).map(([id]) => `- Conclui "${titulo(id)}".`);
    const andamento = [...porTarefa].filter(([, v]) => !v.has("concluiu")).map(([id, v]) => {
      const acoes = [...v].map((x) => VERBO_TXT[x] ?? x).join(", ");
      return `- Atuei em "${titulo(id)}" (${acoes}).`;
    });
    const bloqueios = [...porTarefa.keys()].map((id) => tmap.get(id) as any).filter((t) => t && t.status !== "concluida" && (t.bloqueada_por_id || (t.data_prazo && t.data_prazo < hoje)))
      .map((t) => `- "${t.titulo}": ${t.bloqueada_por_id ? "bloqueada" : `atrasada desde ${t.data_prazo}`}.`);
    out.push(`## ${nome}`, "", "### Resumo do dia",
      `Ao todo ${evs.length} acoes registradas: ${entregas.length} entrega(s) e ${andamento.length} tarefa(s) em andamento.`, "",
      "### Entregas", ...(entregas.length ? entregas : ["- Nenhuma entrega no dia."]), "",
      "### Em andamento", ...(andamento.length ? andamento : ["- Nada em andamento."]), "",
      "### Bloqueios e riscos", ...(bloqueios.length ? bloqueios : ["- Sem bloqueios identificados."]), "",
      "### Proximos passos", "- (a definir; revise com base nas tarefas abertas do cliente)", "");
  }
  return mascarar(out.join("\n"));
}

// --------------------------------------------------------------------------- ferramentas
export const tools: Tool[] = [
  {
    name: "buscar",
    description: "Busca por texto livre em clientes, contratos, projetos, tarefas e pessoas visiveis ao usuario. Use para localizar ids antes de chamar outras ferramentas. Exemplo: {\"consulta\": \"Pao\"}.",
    schema: z.object({
      consulta: z.string().min(2).max(200).describe("Texto a procurar"),
      tipos: z.array(z.enum(["cliente", "contrato", "projeto", "tarefa", "pessoa"])).optional().describe("Restringe os tipos (padrao: todos)"),
      limite: limite(10).describe("Maximo de itens por tipo"),
    }),
    async run({ db }, a) {
      const q = busca(a.consulta);
      const quer = (t: string) => !a.tipos || a.tipos.includes(t);
      const [c, k, p, t, s] = await Promise.all([
        quer("cliente") ? db.from("cliente").select("id, razao_social, nome_fantasia, status").is("deleted_at", null).or(`razao_social.ilike.%${q}%,nome_fantasia.ilike.%${q}%`).limit(a.limite) : null,
        quer("contrato") ? db.from("contrato").select("id, tipo, numero, cliente_id").is("deleted_at", null).or(`tipo.ilike.%${q}%,numero.ilike.%${q}%`).limit(a.limite) : null,
        quer("projeto") ? db.from("projeto").select("id, nome, chave, status, cliente_id").is("deleted_at", null).or(`nome.ilike.%${q}%,chave.ilike.%${q}%`).limit(a.limite) : null,
        quer("tarefa") ? db.from("tarefa").select(TAREFA_SEL).is("deleted_at", null).or(`titulo.ilike.%${q}%,descricao.ilike.%${q}%`).limit(a.limite) : null,
        quer("pessoa") ? db.from("pessoa").select("id, nome, papel, cargo").is("deleted_at", null).ilike("nome", `%${q}%`).limit(a.limite) : null,
      ]);
      return {
        clientes: c ? (ok(c) as any[]).map((x) => ({ id: x.id, nome: nomeCliente(x), status: x.status })) : undefined,
        contratos: k ? ok(k) : undefined,
        projetos: p ? ok(p) : undefined,
        tarefas: t ? (ok(t) as any[]).map(resumoTarefa) : undefined,
        pessoas: s ? ok(s) : undefined,
      };
    },
  },
  {
    name: "listar_clientes",
    description: "Lista clientes visiveis ao usuario, com filtro opcional por situacao e texto.",
    schema: z.object({
      status: z.enum(["ativo", "inativo", "arquivado"]).optional(),
      texto: z.string().max(100).optional().describe("Filtra por razao social ou nome fantasia"),
      limite: limite(),
    }),
    async run({ db }, a) {
      let q = db.from("cliente").select("id, razao_social, nome_fantasia, segmento, cidade, uf, status, responsavel:pessoa!responsavel_id(nome)").is("deleted_at", null).order("razao_social").limit(a.limite);
      if (a.status) q = q.eq("status", a.status);
      if (a.texto) q = q.or(`razao_social.ilike.%${busca(a.texto)}%,nome_fantasia.ilike.%${busca(a.texto)}%`);
      return ok(await q);
    },
  },
  {
    name: "obter_cliente",
    description: "Dossie estruturado do cliente em Markdown: dados gerais, contatos (so nome e papel), contratos (sem valores) com andamento, projetos, tarefas abertas e fatos/decisoes/restricoes do dossie.",
    schema: z.object({ cliente_id: uuid }),
    run: (ctx, a) => dossieMarkdown(ctx, a.cliente_id),
  },
  {
    name: "listar_contratos",
    description: "Lista contratos SEM valores financeiros, com vigencia e situacao de andamento (em_andamento, entregue, encerrado, sem_projeto).",
    schema: z.object({ cliente_id: uuid.optional(), limite: limite() }),
    async run({ db }, a) {
      let q = db.from("contrato").select("id, cliente_id, tipo, numero, vigencia_inicio, vigencia_fim, cliente:cliente_id(razao_social, nome_fantasia)").is("deleted_at", null).order("vigencia_inicio", { ascending: false }).limit(a.limite);
      if (a.cliente_id) q = q.eq("cliente_id", a.cliente_id);
      const cs = ok(await q) as any[];
      const an = cs.length ? (ok(await db.from("contrato_andamento").select("contrato_id, situacao, total_projetos, total_tarefas, tarefas_entregues").in("contrato_id", cs.map((c) => c.id))) as any[]) : [];
      const m = new Map(an.map((x) => [x.contrato_id, x]));
      return cs.map((c) => ({ ...c, cliente: nomeCliente(c.cliente), andamento: m.get(c.id) ?? null }));
    },
  },
  {
    name: "listar_projetos",
    description: "Lista projetos, com filtros por cliente, contrato e situacao.",
    schema: z.object({
      cliente_id: uuid.optional(), contrato_id: uuid.optional(),
      status: z.enum(["planejado", "em_andamento", "pausado", "concluido", "cancelado"]).optional(),
      limite: limite(),
    }),
    async run({ db }, a) {
      let q = db.from("projeto").select("id, nome, chave, tipo, status, data_inicio, data_fim, cliente_id, contrato_id, responsavel:pessoa!responsavel_id(nome)").is("deleted_at", null).order("nome").limit(a.limite);
      if (a.cliente_id) q = q.eq("cliente_id", a.cliente_id);
      if (a.contrato_id) q = q.eq("contrato_id", a.contrato_id);
      if (a.status) q = q.eq("status", a.status);
      return ok(await q);
    },
  },
  {
    name: "listar_tarefas",
    description: "Lista tarefas com filtros por cliente, contrato, projeto, responsavel, status e atrasadas. Por padrao exclui concluidas e canceladas.",
    schema: z.object({
      cliente_id: uuid.optional(), contrato_id: uuid.optional(), projeto_id: uuid.optional(),
      responsavel_id: z.union([uuid, z.literal("eu")]).optional().describe("Id da pessoa ou \"eu\""),
      status: z.array(z.enum(STATUS)).optional().describe("Padrao: todos exceto concluida e cancelada"),
      atrasadas: z.boolean().optional().describe("So tarefas abertas com prazo vencido"),
      limite: limite(),
    }),
    async run(ctx, a) {
      let q = ctx.db.from("tarefa").select(TAREFA_SEL).is("deleted_at", null).is("arquivada_em", null).order("data_prazo", { ascending: true, nullsFirst: false }).limit(a.limite);
      if (a.cliente_id) q = q.eq("projeto.cliente_id", a.cliente_id);
      if (a.contrato_id) q = q.eq("projeto.contrato_id", a.contrato_id);
      if (a.projeto_id) q = q.eq("projeto_id", a.projeto_id);
      if (a.responsavel_id) q = q.eq("responsavel_id", a.responsavel_id === "eu" ? ctx.me.pessoa_id : a.responsavel_id);
      if (a.status?.length) q = q.in("status", a.status);
      else q = q.not("status", "in", "(concluida,cancelada)");
      if (a.atrasadas) q = q.lt("data_prazo", hojeCuiaba()).not("status", "in", "(concluida,cancelada)");
      return (ok(await q) as any[]).map(resumoTarefa);
    },
  },
  {
    name: "obter_tarefa",
    description: "Detalhes de uma tarefa: descricao, comentarios, checklists e atividade recente (log).",
    schema: z.object({ tarefa: tarefaRef }),
    async run(ctx, a) {
      const id = await resolverTarefa(ctx, a.tarefa);
      const { db } = ctx;
      const t: any = ok(await db.from("tarefa").select(TAREFA_SEL.replace("id, numero", "id, descricao, data_inicio, bloqueada_por_id, numero")).eq("id", id).is("deleted_at", null).maybeSingle());
      if (!t) throw new Error("Tarefa nao encontrada ou sem acesso.");
      const [com, chk, ev] = await Promise.all([
        db.from("comentario").select("texto, created_at, autor:pessoa!autor_id(nome)").eq("tarefa_id", id).is("deleted_at", null).order("created_at").limit(50),
        db.from("checklist").select("titulo, itens:checklist_item(texto, feito, pos)").eq("tarefa_id", id).order("pos"),
        db.from("evento").select("quando, verbo, origem, antes, depois, quem:pessoa!quem_id(nome)").eq("entidade", "tarefa").eq("entidade_id", id).order("quando", { ascending: false }).limit(20),
      ]);
      return {
        ...resumoTarefa(t), descricao: t.descricao, inicio: t.data_inicio, bloqueada: !!t.bloqueada_por_id,
        comentarios: ok(com),
        checklists: (ok(chk) as any[]).map((c) => ({ titulo: c.titulo, itens: [...(c.itens ?? [])].sort((x: any, y: any) => x.pos - y.pos).map((i: any) => ({ texto: i.texto, feito: i.feito })) })),
        atividade: ok(ev),
      };
    },
  },
  {
    name: "criar_tarefa",
    description: "Cria uma tarefa em um projeto (origem mcp). Exige token com escopo leitura+escrita.",
    escrita: true,
    schema: z.object({
      projeto_id: uuid,
      titulo: z.string().min(1).max(200),
      descricao: z.string().max(5000).optional(),
      prioridade: z.enum(PRIORIDADES).optional(),
      prazo: data.optional(),
      responsavel_id: uuid.optional(),
      status: z.enum(STATUS).optional().describe("Padrao: a_fazer"),
    }),
    async run({ db, me }, a) {
      const r = ok(await db.from("tarefa").insert({
        org_id: me.org_id, projeto_id: a.projeto_id, titulo: a.titulo, descricao: a.descricao,
        prioridade: a.prioridade, data_prazo: a.prazo, responsavel_id: a.responsavel_id,
        status: a.status ?? "a_fazer", origem: "mcp",
      }).select("id, numero, titulo, status").single());
      return r;
    },
  },
  {
    name: "atualizar_tarefa",
    description: "Altera titulo, descricao, prazo, prioridade ou responsavel de uma tarefa. Para mudar o status use mover_tarefa. Exige escopo leitura+escrita.",
    escrita: true,
    schema: z.object({
      tarefa: tarefaRef,
      titulo: z.string().min(1).max(200).optional(),
      descricao: z.string().max(5000).optional(),
      prioridade: z.enum(PRIORIDADES).optional(),
      prazo: data.nullable().optional().describe("null remove o prazo"),
      responsavel_id: uuid.nullable().optional(),
    }),
    async run(ctx, a) {
      const id = await resolverTarefa(ctx, a.tarefa);
      const u: Record<string, unknown> = {};
      if (a.titulo !== undefined) u.titulo = a.titulo;
      if (a.descricao !== undefined) u.descricao = a.descricao;
      if (a.prioridade !== undefined) u.prioridade = a.prioridade;
      if (a.prazo !== undefined) u.data_prazo = a.prazo;
      if (a.responsavel_id !== undefined) u.responsavel_id = a.responsavel_id;
      if (!Object.keys(u).length) throw new Error("Nada para alterar.");
      const r = ok(await ctx.db.from("tarefa").update(u).eq("id", id).is("deleted_at", null).select("id, titulo, status, prioridade, data_prazo"));
      if (!(r as any[]).length) throw new Error("Tarefa nao encontrada ou sem permissao para alterar.");
      return (r as any[])[0];
    },
  },
  {
    name: "mover_tarefa",
    description: "Muda o status da tarefa (coluna do kanban). Concluir gera o evento 'concluiu'. Exige escopo leitura+escrita.",
    escrita: true,
    schema: z.object({ tarefa: tarefaRef, status: z.enum(STATUS) }),
    async run(ctx, a) {
      const id = await resolverTarefa(ctx, a.tarefa);
      const r = ok(await ctx.db.from("tarefa").update({ status: a.status }).eq("id", id).is("deleted_at", null).select("id, titulo, status"));
      if (!(r as any[]).length) throw new Error("Tarefa nao encontrada ou sem permissao para alterar.");
      return (r as any[])[0];
    },
  },
  {
    name: "comentar_tarefa",
    description: "Adiciona um comentario a uma tarefa, em nome do usuario. Exige escopo leitura+escrita.",
    escrita: true,
    schema: z.object({ tarefa: tarefaRef, texto: z.string().min(1).max(5000) }),
    async run(ctx, a) {
      const id = await resolverTarefa(ctx, a.tarefa);
      return ok(await ctx.db.from("comentario").insert({ org_id: ctx.me.org_id, tarefa_id: id, autor_id: ctx.me.pessoa_id, texto: a.texto }).select("id, created_at").single());
    },
  },
  {
    name: "grafo_vizinhanca",
    description: "Vizinhanca de um no no grafo DataWare (cliente, contrato, projeto, tarefa, pessoa...): nos e arestas ate 3 niveis, respeitando as permissoes do usuario.",
    schema: z.object({ no_id: uuid, profundidade: z.number().int().min(1).max(3).default(1) }),
    async run({ db }, a) {
      const g: any = ok(await db.rpc("dw_vizinhanca", { no_id: a.no_id, profundidade: a.profundidade }));
      return { nos: (g.nos ?? []).map((n: any) => ({ id: n.id, tipo: n.tipo, rotulo: n.rotulo, status: n.status })), arestas: g.arestas ?? [] };
    },
  },
  {
    name: "meu_dia",
    description: "Log do dia do usuario (concluidas, movidas, comentarios), agrupado por cliente. Padrao: hoje (America/Cuiaba).",
    schema: z.object({ data: data.optional() }),
    run: (ctx, a) => meuDia(ctx, a.data ?? hojeCuiaba()),
  },
  {
    name: "relatorio_diario",
    description: "Rascunho narrativo do relatorio diario do usuario (Resumo, Entregas, Em andamento, Bloqueios, Proximos passos), por cliente. Nada e enviado por e-mail; o texto e so para revisao.",
    schema: z.object({ data: data.optional(), cliente_id: uuid.optional() }),
    run: (ctx, a) => relatorioDiario(ctx, a.data ?? hojeCuiaba(), a.cliente_id),
  },
  {
    name: "resumo_painel",
    description: "KPIs do painel e carga da equipe (tarefas abertas, atrasadas, horas estimadas por pessoa). Somente diretor e consultor.",
    gestor: true,
    schema: z.object({}),
    async run({ db }) {
      const hoje = hojeCuiaba();
      const [cli, proj, ap, ab] = await Promise.all([
        db.from("cliente").select("id", { count: "exact", head: true }).eq("status", "ativo").is("deleted_at", null),
        db.from("projeto").select("id", { count: "exact", head: true }).eq("status", "em_andamento").is("deleted_at", null),
        db.from("aprovacao").select("id", { count: "exact", head: true }).eq("status", "pendente"),
        db.from("tarefa").select("status, data_prazo, estimativa_horas, responsavel:pessoa!responsavel_id(nome)").is("deleted_at", null).is("arquivada_em", null).not("status", "in", "(concluida,cancelada)").limit(5000),
      ]);
      const abertas = ok(ab) as any[];
      const carga = new Map<string, { abertas: number; atrasadas: number; horas: number }>();
      for (const t of abertas) {
        const n = t.responsavel?.nome ?? "Sem responsavel";
        const c = carga.get(n) ?? { abertas: 0, atrasadas: 0, horas: 0 };
        c.abertas++; if (t.data_prazo && t.data_prazo < hoje) c.atrasadas++;
        c.horas += Number(t.estimativa_horas ?? 0);
        carga.set(n, c);
      }
      const porStatus: Record<string, number> = {};
      for (const t of abertas) porStatus[t.status] = (porStatus[t.status] ?? 0) + 1;
      return {
        clientes_ativos: cli.count, projetos_em_andamento: proj.count, aprovacoes_pendentes: ap.count,
        tarefas_abertas: abertas.length, tarefas_atrasadas: abertas.filter((t) => t.data_prazo && t.data_prazo < hoje).length,
        por_status: porStatus,
        carga_equipe: [...carga].map(([pessoa, c]) => ({ pessoa, ...c })).sort((x, y) => y.abertas - x.abertas),
      };
    },
  },
];

export { limpar };
