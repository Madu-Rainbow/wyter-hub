"use server";

import { createSupabaseServer } from "@front/lib/supabase/server";
import { ipCliente, normalizarEmail } from "@shared/utils/login-ip";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

const schema = z.object({ email: z.string().trim().email(), senha: z.string().min(1) });
const BLOQUEIO = { erro: "Muitas tentativas. Tente novamente em alguns minutos." };

export type EstadoLogin = { erro: string; email?: string };

export async function entrar(_prev: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const emailInformado = String(form.get("email") ?? "").trim();
  const generico = { erro: "E-mail ou senha inválidos", email: emailInformado };
  const parsed = schema.safeParse({ email: emailInformado, senha: form.get("senha") });
  if (!parsed.success) return generico;

  const email = normalizarEmail(parsed.data.email);
  const h = await headers();
  // LOGIN_TRUSTED_PROXY_HOPS = nº de proxies confiáveis à frente do app (ex.: 1 na Vercel); 0 = não confiar em header de IP.
  const ip = ipCliente(
    h.get("x-forwarded-for"),
    h.get("x-real-ip"),
    Number(process.env.LOGIN_TRUSTED_PROXY_HOPS ?? 0) || 0,
  );

  const supabase = await createSupabaseServer();
  // shortcut: RPCs fora de supabase.ts (não regenerado); tipar via gen types e remover o cast.
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>;
  const segredo = process.env.LOGIN_RL_SECRET ?? "";
  if (!segredo) return { ...BLOQUEIO, email };
  const { data: espera, error: errChecar } = await rpc("login_tentar", {
    p_email: email,
    p_ip: ip,
    p_segredo: segredo,
  });
  // falha fechada: sem o controle, não deixa tentar senha
  if (errChecar || Number(espera ?? 0) > 0) return { ...BLOQUEIO, email };

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.senha,
  });
  if (!error) await rpc("login_sucesso", { p_email: email, p_ip: ip, p_segredo: segredo });
  if (error) return error.status === 429 ? { ...BLOQUEIO, email } : generico;

  redirect("/painel");
}
