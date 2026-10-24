"use server";

import { createSupabaseServer } from "@front/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type Resultado = { ok?: string; erro?: string };

const TIPOS = ["fato", "decisao", "restricao", "sistema", "glossario", "pessoa_chave"] as const;
const CAMPOS = ["cpf", "endereco", "dado_processual"] as const;
const PAPEIS = ["decisor", "operacional", "fornecedor", "contador", "advogado"] as const;
type Tipo = (typeof TIPOS)[number];
type PapelCli = (typeof PAPEIS)[number];

async function contexto() {
  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: p } = await sb
    .from("pessoa")
    .select("id, org_id, papel")
    .eq("auth_user_id", user.id)
    .single();
  return p ? { sb, p } : null;
}

const txt = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function adicionarContato(clienteId: string, fd: FormData): Promise<Resultado> {
  const c = await contexto();
  if (!c || !["diretor", "consultor"].includes(c.p.papel))
    return { erro: "Sem permissão para adicionar contatos." };
  const nome = txt(fd, "nome");
  if (!nome) return { erro: "Informe o nome." };
  const papel = txt(fd, "papel_no_cliente");
  const { error } = await c.sb.from("contato_cliente").insert({
    org_id: c.p.org_id,
    cliente_id: clienteId,
    nome,
    papel_no_cliente: PAPEIS.includes(papel as PapelCli) ? (papel as PapelCli) : null,
    email: txt(fd, "email") || null,
    telefone: txt(fd, "telefone") || null,
  });
  if (error) return { erro: "Não foi possível salvar o contato." };
  revalidatePath(`/clientes/${clienteId}`);
  return { ok: "Contato adicionado." };
}

export async function adicionarDossie(clienteId: string, fd: FormData): Promise<Resultado> {
  const c = await contexto();
  if (!c || c.p.papel === "convidado") return { erro: "Sem permissão para adicionar entradas." };
  const tipo = txt(fd, "tipo");
  const conteudo = txt(fd, "conteudo");
  if (!TIPOS.includes(tipo as Tipo)) return { erro: "Tipo inválido." };
  if (!conteudo) return { erro: "Informe o conteúdo." };
  const retifica = txt(fd, "retifica_id");
  const { error } = await c.sb.from("dossie_cliente").insert({
    org_id: c.p.org_id,
    cliente_id: clienteId,
    tipo: retifica ? "retificacao" : (tipo as Tipo),
    retifica_id: retifica || null,
    conteudo,
    fonte: txt(fd, "fonte") || null,
    confianca: txt(fd, "confianca") === "fato" ? "fato" : "a_confirmar",
  });
  if (error) return { erro: "Não foi possível salvar a entrada." };
  revalidatePath(`/clientes/${clienteId}`);
  return { ok: retifica ? "Retificação registrada." : "Entrada adicionada." };
}

export async function gravarSensivel(clienteId: string, fd: FormData): Promise<Resultado> {
  const c = await contexto();
  const campo = txt(fd, "campo");
  if (!c || !["diretor", "consultor"].includes(c.p.papel)) return { erro: "Sem permissão." };
  if (!CAMPOS.includes(campo as (typeof CAMPOS)[number]) || !txt(fd, "valor"))
    return { erro: "Informe o campo e o valor." };
  const { error } = await c.sb.rpc("gravar_sensivel", {
    p_cliente: clienteId,
    p_campo: campo,
    p_valor: txt(fd, "valor"),
  });
  if (error) return { erro: "Não foi possível salvar o dado sensível." };
  revalidatePath(`/clientes/${clienteId}`);
  return { ok: "Dado sensível salvo." };
}

/** Descriptografa e grava evento acessou_sensivel (auditoria, sem o valor). */
export async function revelarSensivel(id: string): Promise<{ valor?: string; erro?: string }> {
  const c = await contexto();
  if (!c) return { erro: "Sem permissão." };
  const { data, error } = await c.sb.rpc("revelar_sensivel", { p_id: id });
  return error || data == null ? { erro: "Não foi possível revelar." } : { valor: data };
}
