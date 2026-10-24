import { ContratoForm } from "@front/components/contratos/contrato-form";
import { Button } from "@front/components/ui/button";
import { createSupabaseServer } from "@front/lib/supabase/server";
import type { Database } from "@shared/types/supabase";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NovoContratoPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  const { cliente: clienteParam } = await searchParams;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pessoa } = await supabase
    .from("pessoa")
    .select("id, org_id, papel")
    .eq("auth_user_id", user.id)
    .single();
  if (!pessoa || !["diretor", "consultor"].includes(pessoa.papel))
    redirect("/trabalho?aba=contratos");

  const { data: clientes } = await supabase
    .from("cliente")
    .select("id, nome_fantasia, razao_social")
    .eq("status", "ativo")
    .is("deleted_at", null)
    .order("nome_fantasia");

  async function criarContrato(_prev: unknown, formData: FormData) {
    "use server";
    const sb = await createSupabaseServer();
    const {
      data: { user: u },
    } = await sb.auth.getUser();
    if (!u) return { error: "Não autenticado." };
    const { data: p } = await sb
      .from("pessoa")
      .select("id, org_id, papel")
      .eq("auth_user_id", u.id)
      .single();
    if (!p || !["diretor", "consultor"].includes(p.papel)) return { error: "Sem permissão." };

    const cliente_id = formData.get("cliente_id") as string;
    const tipo = (formData.get("tipo") as string)?.trim();
    const vigencia_inicio = formData.get("vigencia_inicio") as string;
    if (!cliente_id || !tipo || !vigencia_inicio)
      return { error: "Cliente, tipo e início da vigência são obrigatórios." };
    const valor = formData.get("valor") as string;

    const row = {
      org_id: p.org_id,
      cliente_id,
      tipo,
      numero: (formData.get("numero") as string)?.trim() || null,
      vigencia_inicio,
      vigencia_fim: (formData.get("vigencia_fim") as string) || null,
      valor: valor ? Number(valor) : null,
      forma_pagamento: (formData.get("forma_pagamento") as string)?.trim() || null,
    };

    const { data: novo, error } = await sb.from("contrato").insert(row).select("id").single();
    if (error) return { error: error.message };

    await sb.from("evento").insert({
      org_id: p.org_id,
      quem_id: p.id,
      entidade: "contrato",
      entidade_id: novo.id,
      verbo: "criou",
      depois: row as unknown as Database["public"]["Tables"]["evento"]["Insert"]["depois"],
      cliente_id,
    });
    redirect(`/trabalho?contrato=${novo.id}`);
  }

  return (
    <div className="mx-auto max-w-xl">
      <Button variant="ghost" size="sm" className="mb-4 gap-1.5 text-text-muted" asChild>
        <Link href="/trabalho">
          <ArrowLeft className="size-3.5" />
          Trabalho
        </Link>
      </Button>
      <h1 className="mb-6 font-title text-2xl text-text">Novo contrato</h1>
      <ContratoForm
        action={criarContrato}
        clientes={(clientes ?? []).map((c) => ({
          id: c.id,
          label: c.nome_fantasia || c.razao_social,
        }))}
        clienteInicial={clienteParam}
        submitLabel="Criar contrato"
      />
    </div>
  );
}
