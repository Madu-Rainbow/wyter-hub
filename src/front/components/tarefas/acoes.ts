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
  "checklist",
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

export async function criarTarefa(
  ctx: Ctx,
  campos: Partial<Tarefa> & { titulo: string },
): Promise<string | null> {
  const {
    responsavel: _r,
    id: _i,
    n_comentarios: _n,
    chave: _c,
    caminho: _p,
    sub: _s,
    numero: _num,
    ...cols
  } = { status: "backlog", ...campos } as Tarefa;
  const projetoId = campos.projeto_id || ctx.projetoId;
  if (!projetoId) return "Escolha o projeto da tarefa.";
  const { data, error } = await createClient()
    .from("tarefa")
    .insert({ ...cols, projeto_id: projetoId, org_id: ctx.orgId } as never)
    .select("id")
    .single();
  if (error) return error.message;
  return null;
}
