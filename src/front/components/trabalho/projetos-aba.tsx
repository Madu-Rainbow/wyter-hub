import { ListFilters, limparBusca } from "@front/components/list-filters";
import { Progresso } from "@front/components/projetos/progresso";
import { ProjetosKanban } from "@front/components/projetos/projetos-kanban";
import { type ProjetoItem, STATUS_PROJETO } from "@front/components/projetos/tipos";
import { VisaoSwitch } from "@front/components/projetos/visao-switch";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { trabalhoHref } from "@front/lib/trabalho";
import Link from "next/link";
import { type Cont, fmtISO, type Params, type Scope, STATUS_COR } from "./tipos";

export function StatusProjeto({ status }: { status: string }) {
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${STATUS_COR[status] ?? ""}`}>
      {STATUS_PROJETO.find(([k]) => k === status)?.[1] ?? status}
    </span>
  );
}

export async function carregarProjetos(scope: Scope, cont: Cont): Promise<ProjetoItem[]> {
  const sb = await createSupabaseServer();
  let query = sb
    .from("projeto")
    .select(
      "id, nome, status, tipo, frente, data_inicio, data_fim, cliente:cliente_id(nome_fantasia, razao_social), responsavel:responsavel_id(nome)",
    )
    .is("deleted_at", null);
  if (scope.cliente) query = query.eq("cliente_id", scope.cliente);
  if (scope.contrato) query = query.eq("contrato_id", scope.contrato);
  const { data } = await query.order("nome");
  return (data ?? []).map((p) => {
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
}

export function ProjetoCards({ itens }: { itens: ProjetoItem[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-3">
      {itens.map((p) => (
        <Link
          key={p.id}
          href={trabalhoHref({ projeto: p.id })}
          className="rounded-md border border-border bg-surface p-4 transition-colors hover:border-accent/30 hover:bg-secondary/40 focus-visible:outline-2 focus-visible:outline-accent"
        >
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-text">{p.nome}</h3>
            <StatusProjeto status={p.status} />
          </div>
          <p className="mt-1 text-sm text-text-muted">{p.cliente}</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
            {p.frente && <span>{p.frente}</span>}
            <span>{p.tipo === "continuo" ? "Contínuo" : "Pontual"}</span>
            {p.responsavel && <span>{p.responsavel}</span>}
            {p.data_inicio && (
              <span className="tabular-nums">
                {fmtISO(p.data_inicio)}
                {p.data_fim ? ` — ${fmtISO(p.data_fim)}` : ""}
              </span>
            )}
          </div>
          <div className="mt-3">
            <Progresso feitas={p.feitas} total={p.total} />
          </div>
        </Link>
      ))}
    </div>
  );
}

/** Aba Projetos (nível Cliente/Contrato): cards, lista e kanban por status (FR-002-29). */
export async function ProjetosAba({
  scope,
  params,
  cont,
  sp,
}: {
  scope: Scope;
  params: Params;
  cont: Cont;
  sp: Params;
}) {
  const { q, status, resp, ordem = "status", dir = "asc" } = sp;
  const visao = ["cards", "lista", "kanban"].includes(sp.visao ?? "")
    ? (sp.visao as string)
    : "cards";
  const sb = await createSupabaseServer();
  const [todos, { data: pessoas }] = await Promise.all([
    carregarProjetos(scope, cont),
    sb.from("pessoa").select("id, nome").eq("ativo", true).is("deleted_at", null).order("nome"),
  ]);
  const busca = limparBusca(q).toLowerCase();
  const respNome = pessoas?.find((p) => p.id === resp)?.nome;
  const itens = todos.filter(
    (p) =>
      (!busca || p.nome.toLowerCase().includes(busca)) &&
      (!status || p.status === status) &&
      (!resp || p.responsavel === respNome),
  );

  const ordemStatus = STATUS_PROJETO.map(([k]) => k);
  const cmp: Record<string, (a: ProjetoItem, b: ProjetoItem) => number> = {
    nome: (a, b) => a.nome.localeCompare(b.nome, "pt-BR"),
    cliente: (a, b) => a.cliente.localeCompare(b.cliente, "pt-BR"),
    status: (a, b) =>
      ordemStatus.indexOf(a.status) - ordemStatus.indexOf(b.status) ||
      a.nome.localeCompare(b.nome, "pt-BR"),
    prazo: (a, b) => (a.data_fim ?? "9999").localeCompare(b.data_fim ?? "9999"),
  };
  const sorted = [...itens].sort(cmp[ordem] ?? cmp.status);
  if (dir === "desc") sorted.reverse();
  const filtrado = !!(q || status || resp);
  const base: Params = { ...params, aba: "projetos" };

  const th = (key: string, label: string, cls = "") => (
    <th
      className={`px-4 py-2.5 text-left font-medium text-text-muted ${cls}`}
      aria-sort={ordem === key ? (dir === "asc" ? "ascending" : "descending") : undefined}
    >
      <Link
        href={trabalhoHref({
          ...base,
          visao,
          q,
          status,
          resp,
          ordem: key,
          dir: ordem === key && dir === "asc" ? "desc" : "asc",
        })}
        className="hover:text-text"
      >
        {label}
        {ordem === key ? (dir === "asc" ? " ↑" : " ↓") : ""}
      </Link>
    </th>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-text-muted">{itens.length} projetos</p>
        <VisaoSwitch atual={visao} params={{ ...base, q, status, resp }} />
      </div>
      <ListFilters
        basePath="/trabalho"
        q={q}
        hidden={{ ...base, visao }}
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
          {filtrado
            ? "Nenhum projeto encontrado com esses filtros."
            : "Nenhum projeto neste escopo."}
        </div>
      ) : visao === "kanban" ? (
        <ProjetosKanban projetos={itens} />
      ) : visao === "lista" ? (
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
              {sorted.map((p) => (
                <tr
                  key={p.id}
                  className="relative border-b border-border last:border-0 focus-within:bg-secondary/50 hover:bg-secondary/50"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={trabalhoHref({ projeto: p.id })}
                      className="font-medium text-text after:absolute after:inset-0 hover:text-accent"
                    >
                      {p.nome}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-2.5 text-text-muted sm:table-cell">{p.cliente}</td>
                  <td className="px-4 py-2.5">
                    <StatusProjeto status={p.status} />
                  </td>
                  <td className="hidden px-4 py-2.5 tabular-nums text-text-muted md:table-cell">
                    {p.data_fim ? fmtISO(p.data_fim) : "—"}
                  </td>
                  <td className="hidden px-4 py-2.5 lg:table-cell">
                    <Progresso feitas={p.feitas} total={p.total} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ProjetoCards itens={sorted} />
      )}
    </div>
  );
}
