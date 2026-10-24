import { createClient } from "@front/lib/supabase/client";
import type { Ctx, Tarefa } from "./shared";

type Json = import("@shared/types/supabase.js").Json;

/** Grava evento append-only (RLS: quem_id = pessoa logada). Falha silenciosa: log nao deve travar a acao. */
export async function registrarEvento(
  ctx: Ctx,
  tarefaId: string,
  verbo: string,
  antes?: Record<string, unknown> | null,
  depois?: Record<string, unknown> | null,
  projetoId?: string | null,
) {
  const pid = projetoId ?? ctx.projetoId;
  const proj = ctx.projetos.find((p) => p.id === pid);
  if (!ctx.meId) return;
  await createClient()
    .from("evento")
    .insert({
      org_id: ctx.orgId,
      quem_id: ctx.meId,
      entidade: "tarefa",
      entidade_id: tarefaId,
      verbo,
      antes: (antes ?? null) as Json,
      depois: (depois ?? null) as Json,
      origem: "ui",
      projeto_id: pid,
      cliente_id: proj?.clienteId ?? null,
    });
}

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

/** Atualiza tarefa e registra evento com apenas os campos que mudaram. Retorna mensagem de erro ou null. */
export async function atualizarTarefa(
  ctx: Ctx,
  atual: Tarefa,
  patch: Partial<Tarefa>,
  verbo = "atualizou",
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
  await registrarEvento(
    ctx,
    atual.id,
    verbo,
    antes,
    mudou,
    (mudou.projeto_id as string) ?? atual.projeto_id,
  );
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
  await registrarEvento(
    ctx,
    (data as { id: string }).id,
    "criou",
    null,
    {
      titulo: campos.titulo,
      status: campos.status ?? "backlog",
    },
    projetoId,
  );
  return null;
}
