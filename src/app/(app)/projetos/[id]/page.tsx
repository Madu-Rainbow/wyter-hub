import { TarefasDoEscopo } from "@front/components/tarefas/escopo";
import { Button } from "@front/components/ui/button";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function ProjetoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: projeto } = await supabase
    .from("projeto")
    .select(
      "*, cliente:cliente_id(id, nome_fantasia, razao_social), responsavel:responsavel_id(nome)",
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!projeto) notFound();

  const cliente = projeto.cliente as unknown as {
    id: string;
    nome_fantasia: string | null;
    razao_social: string;
  } | null;
  const responsavel = projeto.responsavel as unknown as { nome: string } | null;

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="mb-2 gap-1.5 text-text-muted" asChild>
          <Link href="/projetos">
            <ArrowLeft className="size-3.5" />
            Projetos
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <h1 className="font-title text-2xl text-text">
            {projeto.nome}
            <span className="ml-2 text-sm font-normal tabular-nums text-text-muted">
              {projeto.chave}
            </span>
          </h1>
          <Button size="sm" variant="ghost" className="gap-1.5 text-text-muted" asChild>
            <Link href={`/projetos/${id}/editar`}>
              <Pencil className="size-3.5" />
              Editar
            </Link>
          </Button>
        </div>
        <div className="mt-1 flex flex-wrap gap-3 text-sm text-text-muted">
          {cliente && (
            <Link href={`/clientes/${cliente.id}`} className="hover:text-accent">
              {cliente.nome_fantasia || cliente.razao_social}
            </Link>
          )}
          {projeto.frente && <span>{projeto.frente}</span>}
          <span>{projeto.tipo === "continuo" ? "Contínuo" : "Pontual"}</span>
          {responsavel && <span>Resp: {responsavel.nome}</span>}
          <ProjetoStatusBadge status={projeto.status} />
        </div>
        {projeto.data_inicio && (
          <p className="mt-1 text-xs text-text-muted">
            {formatDate(projeto.data_inicio)}
            {projeto.data_fim ? ` — ${formatDate(projeto.data_fim)}` : ""}
          </p>
        )}
      </div>

      <TarefasDoEscopo escopo={{ projeto: id }} breadcrumb={false} />
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Cuiaba" });
}

function ProjetoStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    em_andamento: "bg-blue-50 text-blue-700",
    planejado: "bg-gray-50 text-gray-600",
    pausado: "bg-amber-50 text-amber-700",
    concluido: "bg-green-50 text-green-700",
    cancelado: "bg-red-50 text-red-600",
  };
  const labels: Record<string, string> = {
    em_andamento: "Em andamento",
    planejado: "Planejado",
    pausado: "Pausado",
    concluido: "Concluído",
    cancelado: "Cancelado",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs ${colors[status] ?? ""}`}>
      {labels[status] ?? status}
    </span>
  );
}
