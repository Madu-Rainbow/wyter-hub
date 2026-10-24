import {
  brl,
  Progresso,
  SITUACOES,
  SituacaoBadge,
  vigencia,
} from "@front/components/contratos/situacao";
import { ListFilters } from "@front/components/list-filters";
import { VisaoSwitch } from "@front/components/projetos/visao-switch";
import { financeiroContratos } from "@front/lib/financeiro";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { COLUNAS_CONTRATO, type ContratoRow, trabalhoHref } from "@front/lib/trabalho";
import Link from "next/link";
import type { Params, Scope } from "./tipos";

export type ContratoItem = ContratoRow & {
  clienteNome: string;
  situacao: string;
  entregues: number;
  total: number;
};

export async function carregarContratos(scope: Scope, gestor: boolean): Promise<ContratoItem[]> {
  const sb = await createSupabaseServer();
  let q = sb
    .from("contrato")
    .select(`${COLUNAS_CONTRATO}, cliente:cliente_id(nome_fantasia, razao_social)`)
    .is("deleted_at", null);
  if (scope.cliente) q = q.eq("cliente_id", scope.cliente);
  if (scope.contrato) q = q.eq("id", scope.contrato);
  const [{ data: rows }, { data: andamento }, fin] = await Promise.all([
    q.order("vigencia_inicio", { ascending: false }),
    sb.from("contrato_andamento").select("*"),
    gestor ? financeiroContratos(sb) : Promise.resolve(null),
  ]);
  const andMap = new Map((andamento ?? []).map((a) => [a.contrato_id, a]));
  return (
    (rows ?? []) as unknown as (ContratoRow & {
      cliente: { nome_fantasia: string | null; razao_social: string } | null;
    })[]
  ).map((c) => {
    const a = andMap.get(c.id);
    return {
      ...c,
      ...(fin?.get(c.id) ?? {}),
      clienteNome: c.cliente?.nome_fantasia || c.cliente?.razao_social || "—",
      situacao: a?.situacao ?? "sem_projeto",
      entregues: a?.tarefas_entregues ?? 0,
      total: a?.total_tarefas ?? 0,
    };
  });
}

const th = "px-4 py-2.5 text-left font-medium text-text-muted";

/** Aba Contratos (nível Cliente): lista e kanban por situação (FR-002-29). Valores só para gestor. */
export async function ContratosAba({
  scope,
  params,
  gestor,
  sp,
}: {
  scope: Scope;
  params: Params;
  gestor: boolean;
  sp: Params;
}) {
  const visao = sp.visao === "kanban" ? "kanban" : "lista";
  const todos = await carregarContratos(scope, gestor);
  const contratos = todos.filter((c) => !sp.situacao || c.situacao === sp.situacao);
  const totalValor = contratos.reduce((s, c) => s + (c.valor ?? 0), 0);
  const base: Params = { ...params, aba: "contratos" };
  const href = (c: ContratoItem) => trabalhoHref({ cliente: c.cliente_id, contrato: c.id });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-text-muted">
          {contratos.length} contratos{gestor ? ` — Total: ${brl(totalValor)}` : ""}
        </p>
        <VisaoSwitch
          atual={visao}
          params={{ ...base, situacao: sp.situacao }}
          chaves={["lista", "kanban"]}
        />
      </div>
      <ListFilters
        basePath="/trabalho"
        hidden={{ ...base, visao }}
        campos={[
          {
            name: "situacao",
            label: "Situação",
            value: sp.situacao,
            options: SITUACOES.map((s) => [s.key, s.label]),
          },
        ]}
      />
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
                      href={href(c)}
                      className="block rounded-md border border-border bg-bg p-3 hover:border-accent"
                    >
                      <p className="text-sm font-medium text-text">{c.clienteNome}</p>
                      <p className="text-xs text-text-muted">
                        {c.numero ? `${c.numero} · ` : ""}
                        {c.tipo}
                      </p>
                      {gestor && (
                        <p className="mt-1 text-sm tabular-nums text-text">
                          {brl(c.valor ?? null)}
                        </p>
                      )}
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
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className={th}>Tipo</th>
                <th className={`hidden sm:table-cell ${th}`}>N°</th>
                <th className={th}>Cliente</th>
                {gestor && <th className={`hidden text-right md:table-cell ${th}`}>Valor</th>}
                <th className={`hidden lg:table-cell ${th}`}>Vigência</th>
                <th className={`hidden md:table-cell ${th}`}>Progresso</th>
                <th className={th}>Situação</th>
              </tr>
            </thead>
            <tbody>
              {contratos.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border last:border-0 hover:bg-secondary/50"
                >
                  <td className="px-4 py-2.5 font-medium text-text">
                    <Link href={href(c)} className="hover:underline">
                      {c.tipo}
                    </Link>
                  </td>
                  <td className="hidden px-4 py-2.5 text-text-muted sm:table-cell">
                    {c.numero ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-text-muted">{c.clienteNome}</td>
                  {gestor && (
                    <td className="hidden px-4 py-2.5 text-right tabular-nums text-text md:table-cell">
                      {brl(c.valor ?? null)}
                    </td>
                  )}
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
                    Nenhum contrato neste escopo.
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
