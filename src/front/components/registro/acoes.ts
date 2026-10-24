"use server";

import { carregarPeriodo, dataValida, secoesDoCliente } from "@front/lib/registro";
import { mascarar, type Secoes } from "@front/lib/registro-texto";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { z } from "zod";

async function quemSou() {
  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: pessoa } = await sb
    .from("pessoa")
    .select("id, org_id, papel")
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  return pessoa && pessoa.papel !== "convidado" ? { sb, pessoa } : null;
}

const salvarSchema = z.object({
  cliente_id: z.string().uuid(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  texto: z.string().trim().min(1, "Texto vazio").max(20000),
});

/** Salva (upsert) o registro diario da pessoa logada para cliente+data. Nunca envia e-mail. */
export async function salvarRegistro(
  input: z.infer<typeof salvarSchema>,
): Promise<{ erro?: string }> {
  const p = salvarSchema.safeParse(input);
  if (!p.success) return { erro: p.error.issues[0]?.message ?? "Dados inválidos" };
  const ctx = await quemSou();
  if (!ctx) return { erro: "Sem permissão" };
  const { sb, pessoa } = ctx;

  const texto = mascarar(p.data.texto);
  const { data: ex } = await sb
    .from("registro_diario")
    .select("id")
    .eq("pessoa_id", pessoa.id)
    .eq("cliente_id", p.data.cliente_id)
    .eq("data", p.data.data)
    .limit(1)
    .maybeSingle();
  const { error } = ex
    ? await sb
        .from("registro_diario")
        .update({ o_que_fiz: texto, updated_at: new Date().toISOString() })
        .eq("id", ex.id)
    : await sb.from("registro_diario").insert({
        org_id: pessoa.org_id,
        pessoa_id: pessoa.id,
        cliente_id: p.data.cliente_id,
        data: p.data.data,
        o_que_fiz: texto,
      });
  return error ? { erro: "Não foi possível salvar" } : {};
}

const regenSchema = z.object({
  cliente_id: z.string().uuid(),
  data: z.string(),
  dias: z.union([z.literal(1), z.literal(7), z.literal(30)]),
  /** "meu" = primeira pessoa; "equipe" só para diretor/consultor (opcionalmente filtrado por pessoa). */
  escopo: z.enum(["meu", "equipe"]),
  pessoa_id: z.string().uuid().optional(),
});

/** Regenera as seções narrativas de um cliente (mesmas regras do carregamento inicial). */
export async function regenerarSecoes(
  input: z.infer<typeof regenSchema>,
): Promise<{ secoes?: Secoes; erro?: string }> {
  const p = regenSchema.safeParse(input);
  if (!p.success) return { erro: "Dados inválidos" };
  const ctx = await quemSou();
  if (!ctx) return { erro: "Sem permissão" };
  const gestor = ctx.pessoa.papel === "diretor" || ctx.pessoa.papel === "consultor";
  const equipe = p.data.escopo === "equipe" && gestor;
  const ref = dataValida(p.data.data);
  const d = await carregarPeriodo(ctx.sb, {
    ref,
    dias: p.data.dias,
    clienteId: p.data.cliente_id,
    pessoaId: equipe ? p.data.pessoa_id : ctx.pessoa.id,
  });
  return {
    secoes: secoesDoCliente(d, {
      voz: equipe ? "equipe" : "eu",
      ref,
      dias: p.data.dias,
      cid: p.data.cliente_id,
    }).secoes,
  };
}
