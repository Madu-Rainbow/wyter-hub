import { ListFilters, limparBusca } from "@front/components/list-filters";
import { Button } from "@front/components/ui/button";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; resp?: string }>;
}) {
  const { q, status, resp } = await searchParams;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let query = supabase
    .from("cliente")
    .select(
      "id, razao_social, nome_fantasia, segmento, cidade, uf, status, tags, responsavel:responsavel_id(nome)",
    )
    .is("deleted_at", null);
  const busca = limparBusca(q);
  if (busca) query = query.or(`nome_fantasia.ilike.%${busca}%,razao_social.ilike.%${busca}%`);
  if (status) query = query.eq("status", status as "ativo");
  if (resp) query = query.eq("responsavel_id", resp);
  const [{ data: clientes }, { data: pessoas }] = await Promise.all([
    query.order("nome_fantasia"),
    supabase
      .from("pessoa")
      .select("id, nome")
      .eq("ativo", true)
      .is("deleted_at", null)
      .order("nome"),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-title text-2xl text-text">Clientes</h1>
          <p className="text-sm text-text-muted">{clientes?.length ?? 0} clientes cadastrados</p>
        </div>
        <Button size="sm" className="gap-1.5" asChild>
          <Link href="/clientes/novo">
            <Plus className="size-4" />
            Novo cliente
          </Link>
        </Button>
      </div>

      <ListFilters
        basePath="/clientes"
        q={q}
        campos={[
          {
            name: "status",
            label: "Status",
            value: status,
            options: [
              ["ativo", "Ativo"],
              ["inativo", "Inativo"],
              ["arquivado", "Arquivado"],
            ],
          },
          {
            name: "resp",
            label: "Responsável",
            value: resp,
            options: (pessoas ?? []).map((p) => [p.id, p.nome]),
          },
        ]}
      />

      <div className="rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-4 py-2.5 text-left font-medium text-text-muted">Cliente</th>
              <th className="hidden px-4 py-2.5 text-left font-medium text-text-muted md:table-cell">
                Segmento
              </th>
              <th className="hidden px-4 py-2.5 text-left font-medium text-text-muted sm:table-cell">
                Cidade/UF
              </th>
              <th className="hidden px-4 py-2.5 text-left font-medium text-text-muted lg:table-cell">
                Responsável
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-text-muted">Status</th>
            </tr>
          </thead>
          <tbody>
            {clientes?.map((c) => (
              <tr
                key={c.id}
                className="relative border-b border-border last:border-0 hover:bg-secondary/50 focus-within:bg-secondary/50"
              >
                <td className="px-4 py-2.5">
                  <Link
                    href={`/clientes/${c.id}`}
                    className="font-medium text-text after:absolute after:inset-0 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    {c.nome_fantasia || c.razao_social}
                  </Link>
                  {c.nome_fantasia && <p className="text-xs text-text-muted">{c.razao_social}</p>}
                </td>
                <td className="hidden px-4 py-2.5 text-text-muted md:table-cell">
                  {c.segmento ?? "—"}
                </td>
                <td className="hidden px-4 py-2.5 text-text-muted sm:table-cell">
                  {c.cidade && c.uf ? `${c.cidade}/${c.uf}` : (c.uf ?? "—")}
                </td>
                <td className="hidden px-4 py-2.5 text-text-muted lg:table-cell">
                  {(c.responsavel as unknown as { nome: string } | null)?.nome ?? "—"}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={c.status} />
                </td>
              </tr>
            ))}
            {(!clientes || clientes.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-text-muted">
                  {q || status || resp
                    ? "Nenhum cliente encontrado com esses filtros."
                    : "Nenhum cliente cadastrado."}{" "}
                  <Link
                    href={q || status || resp ? "/clientes" : "/clientes/novo"}
                    className="text-accent hover:underline"
                  >
                    {q || status || resp ? "Limpar filtros" : "Cadastrar cliente"}
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ativo: "bg-green-50 text-green-700 border-green-200",
    inativo: "bg-gray-50 text-gray-600 border-gray-200",
    arquivado: "bg-amber-50 text-amber-700 border-amber-200",
  };
  const labels: Record<string, string> = {
    ativo: "Ativo",
    inativo: "Inativo",
    arquivado: "Arquivado",
  };
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs ${colors[status] ?? colors.inativo}`}
    >
      {labels[status] ?? status}
    </span>
  );
}
