import { Button } from "@front/components/ui/button";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { Building2, FolderOpen } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ArquivosPage() {
  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: pastas }, { data: arquivos }] = await Promise.all([
    sb
      .from("gaveta_pasta")
      .select(
        "id, cliente_id, nome, contrato_id, projeto_id, cliente:cliente_id(nome_fantasia, razao_social)",
      )
      .is("deleted_at", null)
      .is("pai_id", null)
      .order("nome")
      .limit(100),
    sb
      .from("gaveta_arquivo")
      .select(
        "id, cliente_id, nome, tipo_mime, tamanho, updated_at, cliente:cliente_id(nome_fantasia, razao_social)",
      )
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(100),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-title text-2xl text-text">Arquivos</h1>
          <p className="text-sm text-text-muted">
            Drive geral da Wyter, com os arquivos organizados por cliente.
          </p>
        </div>
      </div>

      <section className="rounded-md border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <FolderOpen className="size-4 text-text-muted" aria-hidden />
          <h2 className="font-title text-lg text-text">Pastas por cliente</h2>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {pastas?.map((pasta) => {
            const cliente = pasta.cliente as unknown as {
              nome_fantasia: string | null;
              razao_social: string;
            } | null;
            return (
              <Link
                key={pasta.id}
                href={`/clientes/${pasta.cliente_id}/gaveta`}
                className="rounded-md border border-border p-3 transition-colors hover:border-accent/40"
              >
                <p className="truncate text-sm font-medium text-text">{pasta.nome}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {cliente?.nome_fantasia || cliente?.razao_social || "Cliente"}
                </p>
              </Link>
            );
          })}
          {!pastas?.length && <p className="text-sm text-text-muted">Nenhuma pasta encontrada.</p>}
        </div>
      </section>

      <section className="rounded-md border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <FolderOpen className="size-4 text-text-muted" aria-hidden />
          <h2 className="font-title text-lg text-text">Arquivos recentes</h2>
        </div>
        <div className="divide-y divide-border">
          {arquivos?.map((arquivo) => {
            const cliente = arquivo.cliente as unknown as {
              nome_fantasia: string | null;
              razao_social: string;
            } | null;
            return (
              <div key={arquivo.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <FolderOpen className="size-4 shrink-0 text-text-muted" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">{arquivo.nome}</p>
                    <p className="flex items-center gap-1 text-xs text-text-muted">
                      <Building2 className="size-3" aria-hidden />
                      {cliente?.nome_fantasia || cliente?.razao_social || "Cliente"}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/clientes/${arquivo.cliente_id}/gaveta`}>Abrir</Link>
                </Button>
              </div>
            );
          })}
          {!arquivos?.length && (
            <div className="px-4 py-10 text-center">
              <FolderOpen className="mx-auto mb-2 size-8 text-text-muted" aria-hidden />
              <p className="text-sm text-text-muted">Nenhum arquivo disponível.</p>
              <p className="mt-1 text-xs text-text-muted">
                Os arquivos aparecerão aqui quando forem adicionados em um cliente.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
