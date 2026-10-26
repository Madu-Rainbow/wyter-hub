import { Button } from "@front/components/ui/button";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { ArrowLeft, FolderOpen } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function GavetaClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: cliente } = await sb
    .from("cliente")
    .select("id, nome_fantasia, razao_social")
    .eq("id", id)
    .is("deleted_at", null)
    .single();
  if (!cliente) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="mb-2 gap-1.5 text-text-muted" asChild>
          <Link href={`/clientes/${id}`}>
            <ArrowLeft className="size-3.5" />
            Cliente
          </Link>
        </Button>
        <h1 className="font-title text-2xl text-text">Arquivos</h1>
        <p className="text-sm text-text-muted">{cliente.nome_fantasia || cliente.razao_social}</p>
      </div>
      <section className="flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-border bg-surface px-6 text-center">
        <FolderOpen className="mb-3 size-8 text-text-muted" aria-hidden />
        <h2 className="font-title text-lg text-text">Gaveta de arquivos</h2>
        <p className="mt-1 max-w-md text-sm text-text-muted">
          A área foi criada e está pronta para receber pastas e arquivos. Upload, versões e
          pré-visualização serão habilitados na próxima etapa.
        </p>
      </section>
    </div>
  );
}
