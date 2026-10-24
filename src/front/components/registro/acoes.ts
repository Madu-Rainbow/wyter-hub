"use server";

import { mascarar } from "@front/lib/registro";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  cliente_id: z.string().uuid(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  texto: z.string().trim().min(1, "Texto vazio").max(20000),
});

/** Salva (upsert) o registro diario da pessoa logada para cliente+data. Nunca envia e-mail. */
export async function salvarRegistro(input: z.infer<typeof schema>): Promise<{ erro?: string }> {
  const p = schema.safeParse(input);
  if (!p.success) return { erro: p.error.issues[0]?.message ?? "Dados inválidos" };
  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { erro: "Sessão expirada" };
  const { data: pessoa } = await sb
    .from("pessoa")
    .select("id, org_id, papel")
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!pessoa || pessoa.papel === "convidado") return { erro: "Sem permissão" };

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
