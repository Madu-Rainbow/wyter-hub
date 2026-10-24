"use server";

import { createSupabaseServer } from "@front/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const schema = z.object({ email: z.string().trim().email(), senha: z.string().min(1) });

export async function entrar(_prev: { erro: string }, form: FormData): Promise<{ erro: string }> {
  const parsed = schema.safeParse({ email: form.get("email"), senha: form.get("senha") });
  const generico = { erro: "E-mail ou senha inválidos" };
  if (!parsed.success) return generico;

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.senha,
  });
  if (error)
    return error.status === 429 ? { erro: "Muitas tentativas. Aguarde alguns minutos." } : generico;

  redirect("/painel");
}
