import { ListFilters, limparBusca } from "@front/components/list-filters";
import { Progresso } from "@front/components/projetos/progresso";
import { ProjetosKanban } from "@front/components/projetos/projetos-kanban";
import { type ProjetoItem, STATUS_PROJETO } from "@front/components/projetos/tipos";
import { VisaoSwitch } from "@front/components/projetos/visao-switch";
import { Button } from "@front/components/ui/button";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { Plus } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

type SP = {
  q?: string;
  status?: string;
  resp?: string;
  visao?: string;
  ordem?: string;
  dir?: string;
};

export default async function ProjetosPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { q, status, resp, visao: visaoParam, ordem = "status", dir = "asc" } = await searchParams;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieVisao = (await cookies()).get("projetos_visao")?.value;
  const visao =
    [visaoParam, cookieVisao].find((v) => v === "cards" || v === "lista" || v === "kanban") ??
    "cards";

  let query = supabase
    .from("projeto")
    .select(
      "id, nome, status, tipo, frente, data_inicio, data_fim, cliente:cliente_id(nome_fantasia, razao_social), responsavel:responsavel_id(nome)",
    )
    .is("deleted_at", null);
  const busca = limparBusca(q);
  if (busca) query = query.ilike("nome", `%${busca}%`);
  if (status) query = query.eq("status", status as "planejado");
  if (resp) query = query.eq("responsavel_id", resp);
  const [{ data: projetos }, { data: pessoas }] = await Promise.all([
    query.order("nome"),
    supabase
      .from("pessoa")
      .select("id, nome")
      .eq("ativo", true)
      .is("deleted_at", null)
      .order("nome"),
  ]);

  const ids = (projetos ?? []).map((p) => p.id);
  const { data: tarefas } = ids.length
    ? await supabase
        .from("tarefa")
        .select("projeto_id, status")
        .in("projeto_id", ids)
        .neq("status", "cancelada")
        .is("deleted_at", null)
    : { data: [] };
  const cont = new Map<string, { feitas: number; total: number }>();
  for (const t of tarefas ?? []) {
    const c = cont.get(t.projeto_id) ?? { feitas: 0, total: 0 };
    c.total++;
    if (t.status === "concluida") c.feitas++;
    cont.set(t.projeto_id, c);
  }

  const itens: ProjetoItem[] = (projetos ?? []).map((p) => {
    const c = p.cliente as unknown as { nome_fantasia: string | null; razao_social: string } | null;
    return {
      id: p.id,
      nome: p.nome,
      status: p.status,
      tipo: p.tipo,
      frente: p.frente,
      data_inicio: p.data_inicio,
      data_fim: p.data_fim,
      cliente: c?.nome_fantasia || c?.razao_social || "—",
      responsavel: (p.responsavel as unknown as { nome: string } | null)?.nome ?? null,
      ...(cont.get(p.id) ?? { feitas: 0, total: 0 }),
    };
  });

  const statusOrder = STATUS_PROJETO.map(([k]) => k);
  const cmp: Record<string, (a: ProjetoItem, b: ProjetoItem) => number> = {
    nome: (a, b) => a.nome.localeCompare(b.nome, "pt-BR"),
    cliente: (a, b) => a.cliente.localeCompare(b.cliente, "pt-BR"),
    status: (a, b) =>
      statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status) ||
      a.nome.localeCompare(b.nome, "pt-BR"),
    prazo: (a, b) => (a.data_fim ?? "9999").localeCompare(b.data_fim ?? "9999"),
  };
  const sorted = [...itens].sort(cmp[ordem] ?? cmp.status);
  if (dir === "desc") sorted.reverse();

  const params = { q, status, resp };
  const filtrado = !!(q || status || resp);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-title text-2xl text-text">Projetos</h1>
          <p className="text-sm text-text-muted">{itens.length} projetos</p>
        </div>
        <div className="flex items-center gap-2">
          <VisaoSwitch atual={visao} params={params} />
          <Button size="sm" className="gap-1.5" asChild>
            <Link href="/projetos/novo">
              <Plus className="size-4" />
              Novo projeto
            </Link>
          </Button>
        </div>
      </div>

      <ListFilters
        basePath="/projetos"
        q={q}
        hidden={{ visao }}
        campos={[
          { name: "status", label: "Status", value: status, options: STATUS_PROJETO },
          {
            name: "resp",
            label: "Responsável",
            value: resp,
            options: (pessoas ?? []).map((p) => [p.id, p.nome]),
          },
        ]}
      />

      {itens.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-text-muted">
          {filtrado ? "Nenhum projeto encontrado com esses filtros." : "Nenhum projeto cadastrado."}{" "}
          <Link
            href={filtrado ? `/projetos?visao=${visao}` : "/projetos/novo"}
            className="text-accent hover:underline"
          >
            {filtrado ? "Limpar filtros" : "Criar projeto"}
          </Link>
        </div>
      ) : visao === "kanban" ? (
        <ProjetosKanban projetos={itens} />
      ) : visao === "lista" ? (
        <Lista itens={sorted} ordem={ordem} dir={dir} params={{ ...params, visao }} />
      ) : (
        <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))]">
          {sorted.map((p) => (
            <Link
              key={p.id}
              href={`/projetos/${p.id}`}
              className="rounded-md border border-border bg-surface p-4 transition-colors hover:border-accent/30 hover:bg-secondary/40 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-text">{p.nome}</h3>
                <StatusBadge status={p.status} />
              </div>
              <p className="mt-1 text-sm text-text-muted">{p.cliente}</p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
                {p.frente && <span>{p.frente}</span>}
                <span>{p.tipo === "continuo" ? "Contínuo" : "Pontual"}</span>
                {p.responsavel && <span>{p.responsavel}</span>}
                {p.data_inicio && (
                  <span className="tabular-nums">
                    {formatDate(p.data_inicio)}
                    {p.data_fim ? ` — ${formatDate(p.data_fim)}` : ""}
                  </span>
                )}
              </div>
              <div className="mt-3">
                <Progresso feitas={p.feitas} total={p.total} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Lista({
  itens,
  ordem,
  dir,
  params,
}: {
  itens: ProjetoItem[];
  ordem: string;
  dir: string;
  params: Record<string, string | undefined>;
}) {
  const th = (key: string, label: string, cls = "") => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    sp.set("ordem", key);
    sp.set("dir", ordem === key && dir === "asc" ? "desc" : "asc");
    return (
      <th
        className={`px-4 py-2.5 text-left font-medium text-text-muted ${cls}`}
        aria-sort={ordem === key ? (dir === "asc" ? "ascending" : "descending") : undefined}
      >
        <Link href={`/projetos?${sp}`} className="hover:text-text">
          {label}
          {ordem === key ? (dir === "asc" ? " ↑" : " ↓") : ""}
        </Link>
      </th>
    );
  };
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface">
            {th("nome", "Projeto")}
            {th("cliente", "Cliente", "hidden sm:table-cell")}
            {th("status", "Status")}
            {th("prazo", "Prazo", "hidden md:table-cell")}
            <th className="hidden px-4 py-2.5 text-left font-medium text-text-muted lg:table-cell">
              Progresso
            </th>
          </tr>
        </thead>
        <tbody>
          {itens.map((p) => (
            <tr
              key={p.id}
              className="relative border-b border-border last:border-0 hover:bg-secondary/50 focus-within:bg-secondary/50"
            >
              <td className="px-4 py-2.5">
                <Link
                  href={`/projetos/${p.id}`}
                  className="font-medium text-text after:absolute after:inset-0 hover:text-accent"
                >
                  {p.nome}
                </Link>
              </td>
              <td className="hidden px-4 py-2.5 text-text-muted sm:table-cell">{p.cliente}</td>
              <td className="px-4 py-2.5">
                <StatusBadge status={p.status} />
              </td>
              <td className="hidden px-4 py-2.5 text-text-muted tabular-nums md:table-cell">
                {p.data_fim ? formatDate(p.data_fim) : "—"}
              </td>
              <td className="hidden px-4 py-2.5 lg:table-cell">
                <Progresso feitas={p.feitas} total={p.total} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(d: string) {
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    em_andamento: "bg-blue-50 text-blue-700",
    planejado: "bg-gray-50 text-gray-600",
    pausado: "bg-amber-50 text-amber-700",
    concluido: "bg-green-50 text-green-700",
    cancelado: "bg-red-50 text-red-600",
  };
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${colors[status] ?? ""}`}>
      {STATUS_PROJETO.find(([k]) => k === status)?.[1] ?? status}
    </span>
  );
}
