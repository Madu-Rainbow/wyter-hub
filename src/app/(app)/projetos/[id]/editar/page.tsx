import { Button } from "@front/components/ui/button";
import { createSupabaseServer } from "@front/lib/supabase/server";
import type { Database } from "@shared/types/supabase";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProjetoForm } from "../../_components/projeto-form";

export default async function EditarProjetoPage({ params }: { params: Promise<{ id: string }> }) {
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

  if (!pessoa || !["diretor", "consultor"].includes(pessoa.papel)) {
    redirect(`/projetos/${id}`);
  }

  const { data: projeto } = await supabase
    .from("projeto")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!projeto) notFound();

  const [{ data: clientes }, { data: pessoas }, { data: projetos }, { data: contratos }] =
    await Promise.all([
      supabase
        .from("cliente")
        .select("id, nome_fantasia, razao_social")
        .eq("status", "ativo")
        .is("deleted_at", null)
        .order("nome_fantasia"),
      supabase
        .from("pessoa")
        .select("id, nome")
        .eq("ativo", true)
        .is("deleted_at", null)
        .order("nome"),
      supabase
        .from("projeto")
        .select("id, nome")
        .is("deleted_at", null)
        .neq("id", id)
        .order("nome"),
      supabase
        .from("contrato")
        .select("id, tipo, numero, cliente_id")
        .is("deleted_at", null)
        .order("vigencia_inicio", { ascending: false }),
    ]);

  async function editarProjeto(_prev: unknown, formData: FormData) {
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
    if (!p || !["diretor", "consultor"].includes(p.papel)) {
      return { error: "Sem permissão." };
    }

    const { data: antes } = await sb.from("projeto").select("*").eq("id", id).single();

    const nome = (formData.get("nome") as string)?.trim();
    const cliente_id = formData.get("cliente_id") as string;
    const contrato_id = (formData.get("contrato_id") as string) || null;
    if (!nome || !cliente_id || !contrato_id)
      return { error: "Nome, cliente e contrato são obrigatórios." };
    const { data: ct } = await sb
      .from("contrato")
      .select("cliente_id")
      .eq("id", contrato_id)
      .single();
    if (!ct || ct.cliente_id !== cliente_id)
      return { error: "O contrato deve ser do cliente escolhido." };
    const chave = ((formData.get("chave") as string) || "").trim().toUpperCase();
    if (chave && !/^[A-Z0-9]{2,6}$/.test(chave))
      return { error: "Chave: 2 a 6 letras ou números." };

    type ProjetoStatus = Database["public"]["Enums"]["projeto_status"];
    type ProjetoTipo = Database["public"]["Enums"]["projeto_tipo"];

    const row = {
      nome,
      cliente_id,
      tipo: ((formData.get("tipo") as string) || "pontual") as ProjetoTipo,
      frente: (formData.get("frente") as string)?.trim() || null,
      data_inicio: (formData.get("data_inicio") as string) || null,
      data_fim: (formData.get("data_fim") as string) || null,
      status: ((formData.get("status") as string) || "planejado") as ProjetoStatus,
      responsavel_id: (formData.get("responsavel_id") as string) || null,
      parent_id: (formData.get("parent_id") as string) || null,
      contrato_id,
      ...(chave ? { chave } : {}),
      updated_at: new Date().toISOString(),
    };

    const { error } = await sb.from("projeto").update(row).eq("id", id);
    if (error)
      return { error: error.code === "23505" ? "Esta chave já está em uso." : error.message };

    await sb.from("evento").insert({
      org_id: p.org_id,
      quem_id: p.id,
      entidade: "projeto",
      entidade_id: id,
      verbo: "editou",
      antes: antes as unknown as Database["public"]["Tables"]["evento"]["Insert"]["antes"],
      depois: row as unknown as Database["public"]["Tables"]["evento"]["Insert"]["depois"],
      cliente_id,
    });

    redirect(`/projetos/${id}`);
  }

  return (
    <div className="mx-auto max-w-xl">
      <Button variant="ghost" size="sm" className="mb-4 gap-1.5 text-text-muted" asChild>
        <Link href={`/projetos/${id}`}>
          <ArrowLeft className="size-3.5" />
          Voltar
        </Link>
      </Button>
      <h1 className="mb-6 font-title text-2xl text-text">Editar projeto</h1>
      <ProjetoForm
        action={editarProjeto}
        clientes={(clientes ?? []).map((c) => ({
          id: c.id,
          label: c.nome_fantasia || c.razao_social,
        }))}
        pessoas={(pessoas ?? []).map((p) => ({ id: p.id, label: p.nome }))}
        projetos={(projetos ?? []).map((p) => ({ id: p.id, label: p.nome }))}
        contratos={(contratos ?? []).map((c) => ({
          id: c.id,
          cliente_id: c.cliente_id,
          label: c.numero ? `${c.numero} · ${c.tipo}` : c.tipo,
        }))}
        defaults={{
          nome: projeto.nome,
          chave: projeto.chave,
          cliente_id: projeto.cliente_id,
          tipo: projeto.tipo,
          frente: projeto.frente ?? undefined,
          data_inicio: projeto.data_inicio ?? undefined,
          data_fim: projeto.data_fim ?? undefined,
          status: projeto.status,
          responsavel_id: projeto.responsavel_id ?? undefined,
          parent_id: projeto.parent_id ?? undefined,
          contrato_id: projeto.contrato_id ?? undefined,
        }}
        submitLabel="Salvar alterações"
      />
    </div>
  );
}
