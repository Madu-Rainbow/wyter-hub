import { UploadArquivo } from "@front/components/gaveta/upload-arquivo";
import { Button } from "@front/components/ui/button";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

async function criarPasta(clienteId: string, formData: FormData) {
  "use server";
  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: pessoa } = await sb
    .from("pessoa")
    .select("id, org_id, papel")
    .eq("auth_user_id", user.id)
    .single();
  if (!pessoa || !["diretor", "consultor"].includes(pessoa.papel)) {
    throw new Error("Você não pode criar pastas neste cliente.");
  }
  const nome = String(formData.get("nome") ?? "").trim();
  const paiId = String(formData.get("pai_id") ?? "").trim() || null;
  if (!nome) throw new Error("Informe o nome da pasta.");
  const { error } = await sb.from("gaveta_pasta").insert({
    org_id: pessoa.org_id,
    cliente_id: clienteId,
    pai_id: paiId,
    nome,
    criado_por: pessoa.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/clientes/${clienteId}/gaveta`);
}

async function baixarArquivo(clienteId: string, storagePath: string) {
  "use server";
  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await sb.storage.from("gaveta").createSignedUrl(storagePath, 300);
  if (error || !data?.signedUrl)
    throw new Error(error?.message ?? "Não foi possível gerar o download.");
  redirect(data.signedUrl);
}

export default async function GavetaClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pasta?: string }>;
}) {
  const { id } = await params;
  const { pasta: pastaSelecionada } = await searchParams;
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
  const pastaAtual = pastas?.find((p) => p.id === pastaSelecionada) ?? raiz;
  const [arquivos, subpastas] = pastaAtual
    ? await Promise.all([
        sb
          .from("gaveta_arquivo")
          .select("id, nome, tipo_mime, tamanho, storage_path, versao_atual")
          .eq("cliente_id", id)
          .eq("pasta_id", pastaAtual.id)
          .is("deleted_at", null)
          .order("nome"),
        Promise.resolve({
          data: pastas?.filter((p) => p.pai_id === pastaAtual.id) ?? [],
        }),
      ])
    : [{ data: [] }, { data: [] }];
  const criarPastaCliente = criarPasta.bind(null, id);

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
          {pessoa && pastaAtual && ["diretor", "consultor"].includes(pessoa.papel) && (
            <UploadArquivo
              orgId={pessoa.org_id}
              clienteId={id}
              pessoaId={pessoa.id}
              pastaId={pastaAtual.id}
            />
          )}
          {pessoa && pastaAtual && ["diretor", "consultor"].includes(pessoa.papel) && (
            <form action={criarPastaCliente} className="flex items-center gap-2">
              <input name="pai_id" type="hidden" value={pastaAtual.id} />
              <input
                name="nome"
                required
                placeholder="Nova subpasta"
                className="h-8 w-40 rounded border border-border bg-background px-2 text-xs"
              />
              <Button type="submit" size="sm" variant="outline">
                Criar pasta
              </Button>
            </form>
          )}
        </div>
        <div className="mb-4 flex flex-wrap gap-2 border-b border-border pb-4">
          {pastas?.map((pasta) => (
            <Button
              key={pasta.id}
              variant={pasta.id === pastaAtual?.id ? "secondary" : "ghost"}
              size="sm"
              asChild
            >
              <Link href={`/clientes/${id}/gaveta?pasta=${pasta.id}`}>
                <FolderOpen className="size-3.5" />
                {pasta.nome}
              </Link>
            </Button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {subpastas.data?.map((pasta) => (
            <Link
              key={pasta.id}
              href={`/clientes/${id}/gaveta?pasta=${pasta.id}`}
              className="rounded-md border border-border p-3 transition-colors hover:border-accent/40"
            >
              <FolderOpen className="mb-2 size-5 text-text-muted" aria-hidden />
              <p className="truncate text-sm font-medium text-text">{pasta.nome}</p>
            </Link>
          ))}
          {arquivos.data?.map((arquivo) => (
            <div key={arquivo.id} className="rounded-md border border-border p-3">
              <p className="truncate text-sm font-medium text-text">{arquivo.nome}</p>
              <p className="mt-1 text-xs text-text-muted">
                {arquivo.tipo_mime} · {(arquivo.tamanho / 1024).toFixed(0)} KB
              </p>
              <form action={baixarArquivo.bind(null, id, arquivo.storage_path)} className="mt-3">
                <Button type="submit" size="sm" variant="outline">
                  Baixar
                </Button>
              </form>
            </div>
          ))}
          {!subpastas.data?.length && !arquivos.data?.length && (
            <p className="text-sm text-text-muted">Esta pasta está vazia.</p>
          )}
        </div>
      </section>
    </div>
  );
}
