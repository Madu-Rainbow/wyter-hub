import { ClienteForm } from "@front/components/clientes/cliente-form";
import { Button } from "@front/components/ui/button";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function NovoClientePage() {
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

  if (!pessoa || !["diretor", "consultor"].includes(pessoa.papel)) redirect("/clientes");

  const { data: pessoas } = await supabase
    .from("pessoa")
    .select("id, nome")
    .eq("ativo", true)
    .is("deleted_at", null)
    .order("nome");

  async function criarCliente(formData: FormData) {
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

    const razao_social = (formData.get("razao_social") as string)?.trim();
    if (!razao_social) return;

    const dados = {
      org_id: p.org_id,
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
    };

    const { data: novo } = await sb.from("cliente").insert(dados).select("id").single();

    if (novo) {
      await sb.from("evento").insert({
        org_id: p.org_id,
        quem_id: p.id,
        entidade: "cliente",
        entidade_id: novo.id,
        verbo: "criou",
        depois: dados as unknown as import("@shared/types/supabase").Json,
        cliente_id: novo.id,
      });
    }

    revalidatePath("/clientes");
    redirect("/clientes");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Button variant="ghost" size="sm" className="mb-4 gap-1.5 text-text-muted" asChild>
        <Link href="/clientes">
          <ArrowLeft className="size-3.5" />
          Clientes
        </Link>
      </Button>
      <h1 className="mb-6 font-title text-2xl text-text">Novo cliente</h1>
      <ClienteForm action={criarCliente} pessoas={pessoas ?? []} />
    </div>
  );
}
