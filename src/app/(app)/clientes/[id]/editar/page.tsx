import { ClienteForm } from "@front/components/clientes/cliente-form";
import { Button } from "@front/components/ui/button";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
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

  if (!pessoa || !["diretor", "consultor"].includes(pessoa.papel)) redirect(`/clientes/${id}`);

  const [{ data: cliente }, { data: pessoas }] = await Promise.all([
    supabase.from("cliente").select("*").eq("id", id).is("deleted_at", null).single(),
    supabase
      .from("pessoa")
      .select("id, nome")
      .eq("ativo", true)
      .is("deleted_at", null)
      .order("nome"),
  ]);

  if (!cliente) notFound();

  async function atualizarCliente(formData: FormData) {
    "use server";
    const sb = await createSupabaseServer();
    const {
      data: { user: u },
    } = await sb.auth.getUser();
    if (!u) return;

    const { data: p } = await sb
      .from("pessoa")
      .select("id, org_id, papel")
      .eq("auth_user_id", u.id)
      .single();
    if (!p || !["diretor", "consultor"].includes(p.papel)) return;

    const clienteId = formData.get("id") as string;
    const { data: antes } = await sb.from("cliente").select("*").eq("id", clienteId).single();

    const razao_social = (formData.get("razao_social") as string)?.trim();
    if (!razao_social) return;

    const dados = {
      razao_social,
      nome_fantasia: (formData.get("nome_fantasia") as string)?.trim() || null,
      segmento: (formData.get("segmento") as string)?.trim() || null,
      cidade: (formData.get("cidade") as string)?.trim() || null,
      uf: (formData.get("uf") as string)?.trim() || null,
      responsavel_id: (formData.get("responsavel_id") as string) || null,
      tags:
        (formData.get("tags") as string)
          ?.split(",")
          .map((t) => t.trim())
          .filter(Boolean) ?? [],
      updated_at: new Date().toISOString(),
    };

    await sb.from("cliente").update(dados).eq("id", clienteId);

    await sb.from("evento").insert({
      org_id: p.org_id,
      quem_id: p.id,
      entidade: "cliente",
      entidade_id: clienteId,
      verbo: "editou",
      antes: antes as unknown as import("@shared/types/supabase").Json,
      depois: dados as unknown as import("@shared/types/supabase").Json,
      cliente_id: clienteId,
    });

    revalidatePath(`/clientes/${clienteId}`);
    revalidatePath("/clientes");
    redirect(`/clientes/${clienteId}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Button variant="ghost" size="sm" className="mb-4 gap-1.5 text-text-muted" asChild>
        <Link href={`/clientes/${id}`}>
          <ArrowLeft className="size-3.5" />
          Voltar
        </Link>
      </Button>
      <h1 className="mb-6 font-title text-2xl text-text">Editar cliente</h1>
      <ClienteForm action={atualizarCliente} pessoas={pessoas ?? []} cliente={cliente} />
    </div>
  );
}
