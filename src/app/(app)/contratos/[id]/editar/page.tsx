import { ContratoForm } from "@front/components/contratos/contrato-form";
import { Button } from "@front/components/ui/button";
import { createSupabaseServer } from "@front/lib/supabase/server";
import type { Database } from "@shared/types/supabase";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function EditarContratoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  if (!pessoa || !["diretor", "consultor"].includes(pessoa.papel)) redirect(`/contratos/${id}`);

  const [{ data: contrato }, { data: clientes }] = await Promise.all([
    supabase.from("contrato").select("*").eq("id", id).is("deleted_at", null).single(),
    supabase
      .from("cliente")
      .select("id, nome_fantasia, razao_social")
      .eq("status", "ativo")
      .is("deleted_at", null)
      .order("nome_fantasia"),
  ]);
  if (!contrato) notFound();

  async function editarContrato(_prev: unknown, formData: FormData) {
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

    const { data: antes } = await sb.from("contrato").select("*").eq("id", id).single();
    const row = {
      cliente_id,
      tipo,
      numero: (formData.get("numero") as string)?.trim() || null,
      vigencia_inicio,
      vigencia_fim: (formData.get("vigencia_fim") as string) || null,
      valor: valor ? Number(valor) : null,
      forma_pagamento: (formData.get("forma_pagamento") as string)?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data: upd, error } = await sb.from("contrato").update(row).eq("id", id).select("id");
    if (error) return { error: error.message };
    if (!upd?.length) return { error: "Sem permissão para alterar este contrato." };

    await sb.from("evento").insert({
      org_id: p.org_id,
      quem_id: p.id,
      entidade: "contrato",
      entidade_id: id,
      verbo: "editou",
      antes: antes as unknown as Database["public"]["Tables"]["evento"]["Insert"]["antes"],
      depois: row as unknown as Database["public"]["Tables"]["evento"]["Insert"]["depois"],
      cliente_id,
    });
    redirect(`/contratos/${id}`);
  }

  return (
    <div className="mx-auto max-w-xl">
      <Button variant="ghost" size="sm" className="mb-4 gap-1.5 text-text-muted" asChild>
        <Link href={`/contratos/${id}`}>
          <ArrowLeft className="size-3.5" />
          Voltar
        </Link>
      </Button>
      <h1 className="mb-6 font-title text-2xl text-text">Editar contrato</h1>
      <ContratoForm
        action={editarContrato}
        clientes={(clientes ?? []).map((c) => ({
          id: c.id,
          label: c.nome_fantasia || c.razao_social,
        }))}
        contrato={contrato}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
