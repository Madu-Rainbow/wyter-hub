import { UploadArquivo } from "@front/components/gaveta/upload-arquivo";
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

  const [{ data: cliente }, { data: pessoa }] = await Promise.all([
    sb
      .from("cliente")
      .select("id, nome_fantasia, razao_social")
      .eq("id", id)
      .is("deleted_at", null)
      .single(),
    sb.from("pessoa").select("id, org_id, papel").eq("auth_user_id", user.id).single(),
  ]);
  if (!cliente) notFound();
  const { data: pastas } = await sb
    .from("gaveta_pasta")
    .select("id, nome, pai_id, contrato_id, projeto_id")
    .eq("cliente_id", id)
    .is("deleted_at", null)
    .order("nome");
  const raiz = pastas?.find((p) => !p.pai_id);

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
      <section className="rounded-md border border-border bg-surface p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="size-5 text-text-muted" aria-hidden />
            <h2 className="font-title text-lg text-text">Pastas do cliente</h2>
          </div>
          {pessoa && raiz && ["diretor", "consultor"].includes(pessoa.papel) && (
            <UploadArquivo
              orgId={pessoa.org_id}
              clienteId={id}
              pessoaId={pessoa.id}
              pastaId={raiz.id}
            />
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {pastas?.map((pasta) => (
            <div key={pasta.id} className="rounded-md border border-border p-3">
              <p className="truncate text-sm font-medium text-text">{pasta.nome}</p>
              <p className="mt-1 text-xs text-text-muted">
                {pasta.projeto_id ? "Projeto" : pasta.contrato_id ? "Contrato" : "Cliente"}
              </p>
              {pessoa && ["diretor", "consultor"].includes(pessoa.papel) && (
                <div className="mt-3">
                  <UploadArquivo
                    orgId={pessoa.org_id}
                    clienteId={id}
                    pessoaId={pessoa.id}
                    pastaId={pasta.id}
                  />
                </div>
              )}
            </div>
          ))}
          {!pastas?.length && <p className="text-sm text-text-muted">Nenhuma pasta criada.</p>}
        </div>
      </section>
    </div>
  );
}
