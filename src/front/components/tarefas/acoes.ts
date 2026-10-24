import { createClient } from "@front/lib/supabase/client";
import type { Ctx, Tarefa } from "./shared";

/** Colunas editaveis de tarefa (sem campos derivados do join). */
const COLS = [
  "titulo",
  "descricao",
  "status",
  "prioridade",
  "urgencia",
  "esforco",
  "data_prazo",
  "data_inicio",
  "estimativa_horas",
  "responsavel_id",
  "categoria",
  "bloqueada_por_id",
  "link_externo",
  "prazo_hora",
  "lembrete_em",
  "entregue_em",
  "arquivada_em",
  "capa_anexo_id",
  "projeto_id",
  "parent_id",
] as const;

/** Atualiza tarefa (evento gravado por trigger no banco). Retorna mensagem de erro ou null. */
export async function atualizarTarefa(
  _ctx: Ctx,
  atual: Tarefa,
  patch: Partial<Tarefa>,
  _verbo = "atualizou",
): Promise<string | null> {
  const mudou: Record<string, unknown> = {};
  const antes: Record<string, unknown> = {};
  for (const c of COLS) {
    if (c in patch && JSON.stringify(patch[c]) !== JSON.stringify(atual[c])) {
      mudou[c] = patch[c];
      antes[c] = atual[c];
    }
  }
  if (!Object.keys(mudou).length) return null;
  const { error } = await createClient()
    .from("tarefa")
    .update(mudou as never)
    .eq("id", atual.id);
  if (error) return error.message;
  return null;
}

export async function inserirTarefa(
  ctx: Ctx,
  campos: Partial<Tarefa> & { titulo: string },
): Promise<{ id: string | null; erro: string | null }> {
  const {
    responsavel: _r,
    id: _i,
    n_comentarios: _n,
    n_anexos: _na,
    membros: _m,
    etiquetas: _e,
    capa: _cp,
    checklist: _cl,
    chave: _c,
    caminho: _p,
    sub: _s,
    numero: _num,
    ...cols
  } = { status: "backlog", ...campos } as Tarefa;
  const projetoId = campos.projeto_id || ctx.projetoId;
  if (!projetoId) return { id: null, erro: "Escolha o projeto da tarefa." };
  const { data, error } = await createClient()
    .from("tarefa")
    .insert({ ...cols, projeto_id: projetoId, org_id: ctx.orgId } as never)
    .select("id")
    .single();
  return error ? { id: null, erro: error.message } : { id: data.id, erro: null };
}

export async function criarTarefa(
  ctx: Ctx,
  campos: Partial<Tarefa> & { titulo: string },
): Promise<string | null> {
  return (await inserirTarefa(ctx, campos)).erro;
}

/** Copia tarefa com membros, etiquetas e checklists (itens voltam desmarcados). Eventos via trigger. */
export async function copiarTarefa(ctx: Ctx, t: Tarefa): Promise<string | null> {
  const sb = createClient();
  const { id, erro } = await inserirTarefa(ctx, {
    titulo: `${t.titulo} (cópia)`,
    descricao: t.descricao,
    status: t.status,
    prioridade: t.prioridade,
    urgencia: t.urgencia,
    esforco: t.esforco,
    data_prazo: t.data_prazo,
    data_inicio: t.data_inicio,
    prazo_hora: t.prazo_hora,
    estimativa_horas: t.estimativa_horas,
    responsavel_id: t.responsavel_id,
    categoria: t.categoria,
    link_externo: t.link_externo,
    parent_id: t.parent_id,
    projeto_id: t.projeto_id,
  });
  if (!id) return erro;
  const org_id = ctx.orgId;
  const [m, e, c] = await Promise.all([
    t.membros.length
      ? sb
          .from("tarefa_membro")
          .insert(t.membros.map((p) => ({ tarefa_id: id, pessoa_id: p.id, org_id })))
      : null,
    t.etiquetas.length
      ? sb
          .from("tarefa_etiqueta")
          .insert(t.etiquetas.map((x) => ({ tarefa_id: id, etiqueta_id: x.id, org_id })))
      : null,
    sb
      .from("checklist")
      .select("titulo, pos, checklist_item(texto, pos, responsavel_id, prazo)")
      .eq("tarefa_id", t.id),
  ]);
  if (m?.error || e?.error) return (m?.error ?? e?.error)?.message ?? null;
  for (const cl of c.data ?? []) {
    const { data: novo, error } = await sb
      .from("checklist")
      .insert({ tarefa_id: id, org_id, titulo: cl.titulo, pos: cl.pos })
      .select("id")
      .single();
    if (error) return error.message;
    if (cl.checklist_item.length) {
      const r = await sb
        .from("checklist_item")
        .insert(cl.checklist_item.map((i) => ({ ...i, checklist_id: novo.id, org_id })));
      if (r.error) return r.error.message;
    }
  }
  return null;
}

/** Move para outro projeto (subtarefas acompanham) e/ou coluna (status). */
export async function moverTarefa(
  ctx: Ctx,
  t: Tarefa,
  projetoId: string,
  status: string,
): Promise<string | null> {
  const sb = createClient();
  if (projetoId !== t.projeto_id && !t.parent_id) {
    // Filhas primeiro nao e possivel (devem ter o mesmo projeto da mae): move a mae e depois as filhas.
    const r = await sb.from("tarefa").update({ projeto_id: projetoId }).eq("id", t.id);
    if (r.error) return r.error.message;
    const f = await sb.from("tarefa").update({ projeto_id: projetoId }).eq("parent_id", t.id);
    if (f.error) return f.error.message;
  }
  return atualizarTarefa(ctx, t, { status });
}
