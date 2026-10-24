import {
  brl,
  Progresso,
  SITUACOES,
  SituacaoBadge,
  VisaoToggle,
  vigencia,
} from "@front/components/contratos/situacao";
import { Button } from "@front/components/ui/button";
import { createSupabaseServer } from "@front/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ visao?: string; situacao?: string; cliente?: string }>;
}) {
  const { visao: v, situacao, cliente: clienteFiltro } = await searchParams;
  const visao = v === "kanban" ? "kanban" : "lista";
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: pessoa }, { data: rows }, { data: andamento }] = await Promise.all([
    supabase.from("pessoa").select("papel").eq("auth_user_id", user.id).single(),
    supabase
      .from("contrato")
      .select(
        "id, tipo, numero, cliente_id, valor, forma_pagamento, vigencia_inicio, vigencia_fim, cliente:cliente_id(id, nome_fantasia, razao_social)",
      )
      .is("deleted_at", null)
      .order("vigencia_inicio", { ascending: false }),
    supabase.from("contrato_andamento").select("*"),
  ]);

  const andMap = new Map((andamento ?? []).map((a) => [a.contrato_id, a]));
  const contratos = (rows ?? [])
    .filter((c) => !clienteFiltro || c.cliente_id === clienteFiltro)
    .map((c) => {
      const a = andMap.get(c.id);
      const cliente = c.cliente as unknown as {
        nome_fantasia: string | null;
        razao_social: string;
      } | null;
      return {
        ...c,
        clienteNome: cliente?.nome_fantasia || cliente?.razao_social || "—",
        situacao: a?.situacao ?? "sem_projeto",
        entregues: a?.tarefas_entregues ?? 0,
        total: a?.total_tarefas ?? 0,
      };
    })
    .filter((c) => !situacao || c.situacao === situacao);
  const totalValor = contratos.reduce((s, c) => s + (c.valor ?? 0), 0);
  const podeEditar = !!pessoa && ["diretor", "consultor"].includes(pessoa.papel);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-title text-2xl text-text">Contratos</h1>
          <p className="text-sm text-text-muted">
            {contratos.length} contratos — Total: {brl(totalValor)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <VisaoToggle visao={visao} />
          {podeEditar && (
            <Button asChild size="sm">
              <Link href="/contratos/novo">Novo contrato</Link>
            </Button>
          )}
        </div>
      </div>

      {visao === "kanban" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SITUACOES.map((col) => {
            const itens = contratos.filter((c) => c.situacao === col.key);
            return (
              <section key={col.key} className="rounded-md border border-border bg-surface/50 p-3">
                <h2 className="mb-3 flex justify-between text-sm font-medium text-text">
                  {col.label}
                  <span className="tabular-nums text-text-muted">{itens.length}</span>
                </h2>
                <div className="space-y-2">
                  {itens.map((c) => (
                    <Link
                      key={c.id}
                      href={`/contratos/${c.id}`}
                      className="block rounded-md border border-border bg-bg p-3 hover:border-accent"
                    >
                      <p className="text-sm font-medium text-text">{c.clienteNome}</p>
                      <p className="text-xs text-text-muted">
                        {c.numero ? `${c.numero} · ` : ""}
                        {c.tipo}
                      </p>
                      <p className="mt-1 text-sm tabular-nums text-text">{brl(c.valor)}</p>
                      <p className="mb-2 text-xs tabular-nums text-text-muted">
                        {vigencia(c.vigencia_inicio, c.vigencia_fim)}
                      </p>
                      <Progresso entregues={c.entregues} total={c.total} />
                    </Link>
                  ))}
                  {itens.length === 0 && (
                    <p className="py-4 text-center text-xs text-text-muted">Nenhum contrato.</p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="px-4 py-2.5 text-left font-medium text-text-muted">Tipo</th>
                <th className="hidden px-4 py-2.5 text-left font-medium text-text-muted sm:table-cell">
                  N°
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-text-muted">Cliente</th>
                <th className="hidden px-4 py-2.5 text-right font-medium text-text-muted md:table-cell">
                  Valor
                </th>
                <th className="hidden px-4 py-2.5 text-left font-medium text-text-muted lg:table-cell">
                  Vigência
                </th>
                <th className="hidden px-4 py-2.5 text-left font-medium text-text-muted md:table-cell">
                  Progresso
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-text-muted">Situação</th>
              </tr>
            </thead>
            <tbody>
              {contratos.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border last:border-0 hover:bg-secondary/50"
                >
                  <td className="px-4 py-2.5 font-medium text-text">
                    <Link href={`/contratos/${c.id}`} className="hover:underline">
                      {c.tipo}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-2.5 text-text-muted sm:table-cell">
                    {c.numero ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-text-muted">{c.clienteNome}</td>
                  <td className="hidden px-4 py-2.5 text-right tabular-nums text-text md:table-cell">
                    {brl(c.valor)}
                  </td>
                  <td className="hidden px-4 py-2.5 tabular-nums text-text-muted lg:table-cell">
                    {vigencia(c.vigencia_inicio, c.vigencia_fim)}
                  </td>
                  <td className="hidden w-40 px-4 py-2.5 md:table-cell">
                    <Progresso entregues={c.entregues} total={c.total} />
                  </td>
                  <td className="px-4 py-2.5">
                    <SituacaoBadge situacao={c.situacao} />
                  </td>
                </tr>
              ))}
              {contratos.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-text-muted">
                    Nenhum contrato cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
