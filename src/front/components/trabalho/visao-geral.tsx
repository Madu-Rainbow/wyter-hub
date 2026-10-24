import {
  brl,
  fmtData,
  Progresso as ProgContrato,
  SituacaoBadge,
  vigencia,
} from "@front/components/contratos/situacao";
import type { Arvore } from "@front/lib/arvore";
import { impactoAditivos } from "@front/lib/financeiro";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { statusLabels } from "@front/lib/tarefas";
import { type Nivel, trabalhoHref } from "@front/lib/trabalho";
import Link from "next/link";
import { type ContratoItem, carregarContratos } from "./contratos-aba";
import { carregarProjetos, ProjetoCards } from "./projetos-aba";
import { type Cont, fmtISO, type Scope } from "./tipos";

const h2 = "mb-2 font-title text-lg text-text";
const lista = "divide-y divide-border rounded-md border border-border bg-surface text-sm";
const vazio = <p className="text-sm text-text-muted">Nenhum registro.</p>;

function Contratos({ itens, gestor }: { itens: ContratoItem[]; gestor: boolean }) {
  if (!itens.length) return vazio;
  return (
    <ul className={lista}>
      {itens.map((c) => (
        <li key={c.id} className="px-4 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href={trabalhoHref({ cliente: c.cliente_id, contrato: c.id })}
              className="font-medium text-text hover:underline"
            >
              {c.numero ? `${c.numero} · ` : ""}
              {c.tipo}
            </Link>
            <SituacaoBadge situacao={c.situacao} />
          </div>
          <p className="text-xs tabular-nums text-text-muted">
            {vigencia(c.vigencia_inicio, c.vigencia_fim)}
            {gestor && c.valor != null ? ` · ${brl(c.valor)}` : ""}
          </p>
          <div className="mt-1.5 max-w-xs">
            <ProgContrato entregues={c.entregues} total={c.total} />
          </div>
        </li>
      ))}
    </ul>
  );
}

async function Atividades({ clienteId }: { clienteId: string }) {
  const sb = await createSupabaseServer();
  const { data } = await sb
    .from("evento")
    .select("id, entidade, verbo, quando, quem:quem_id(nome)")
    .eq("cliente_id", clienteId)
    .order("quando", { ascending: false })
    .limit(8);
  if (!data?.length) return vazio;
  return (
    <ul className={lista}>
      {data.map((e) => (
        <li key={e.id} className="flex justify-between gap-3 px-4 py-2">
          <span className="text-text">
            {(e.quem as unknown as { nome: string } | null)?.nome ?? "—"} {e.verbo} {e.entidade}
          </span>
          <span className="shrink-0 tabular-nums text-text-muted">{fmtISO(e.quando)}</span>
        </li>
      ))}
    </ul>
  );
}

async function PorStatus({ projetoId }: { projetoId: string }) {
  const sb = await createSupabaseServer();
  const { data } = await sb
    .from("tarefa")
    .select("status")
    .eq("projeto_id", projetoId)
    .is("deleted_at", null);
  const n = new Map<string, number>();
  for (const t of data ?? []) n.set(t.status, (n.get(t.status) ?? 0) + 1);
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {Object.entries(statusLabels).map(([k, label]) => (
        <div key={k} className="rounded-md border border-border bg-surface p-3">
          <dt className="text-xs text-text-muted">{label}</dt>
          <dd className="text-xl tabular-nums text-text">{n.get(k) ?? 0}</dd>
        </div>
      ))}
    </dl>
  );
}

async function Contrato({ id, gestor }: { id: string; gestor: boolean }) {
  const sb = await createSupabaseServer();
  const [{ data: aditivosRaw }, { data: escopos }, { data: extras }] = await Promise.all([
    sb
      .from("aditivo")
      .select("id, data, motivo, impacto_prazo, impacto_escopo")
      .eq("contrato_id", id)
      .order("data", { ascending: false }),
    sb.from("escopo").select("id, descricao").eq("contrato_id", id).order("created_at"),
    sb
      .from("escopo_extra")
      .select("id, descricao, status")
      .eq("contrato_id", id)
      .order("created_at"),
  ]);
  const imp = gestor ? await impactoAditivos(sb, id) : null;
  const aditivos = (aditivosRaw ?? []).map((a) => ({
    ...a,
    impacto_valor: imp?.get(a.id),
  })) as unknown as {
    id: string;
    data: string;
    motivo: string;
    impacto_prazo: string | null;
    impacto_escopo: string | null;
    impacto_valor?: number | null;
  }[];
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <h2 className={h2}>Aditivos</h2>
        {aditivos.length ? (
          <ul className={lista}>
            {aditivos.map((x) => (
              <li key={x.id} className="px-4 py-2.5">
                <p className="text-text">
                  <span className="tabular-nums text-text-muted">{fmtData(x.data)}</span> —{" "}
                  {x.motivo}
                </p>
                <p className="text-xs text-text-muted">
                  {gestor && x.impacto_valor != null && `Valor: ${brl(x.impacto_valor)} · `}
                  {x.impacto_prazo && `Prazo: ${x.impacto_prazo} · `}
                  {x.impacto_escopo && `Escopo: ${x.impacto_escopo}`}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          vazio
        )}
      </section>
      <section>
        <h2 className={h2}>Escopos</h2>
        {escopos?.length ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-text">
            {escopos.map((e) => (
              <li key={e.id}>{e.descricao}</li>
            ))}
          </ul>
        ) : (
          vazio
        )}
        <h2 className={`${h2} mt-6`}>Escopos extras</h2>
        {extras?.length ? (
          <ul className={lista}>
            {extras.map((e) => (
              <li key={e.id} className="flex justify-between gap-4 px-4 py-2.5">
                <span className="text-text">{e.descricao}</span>
                <span className="shrink-0 text-text-muted">{e.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          vazio
        )}
      </section>
    </div>
  );
}

/** Visão geral por nível (FR-002-26). Campos financeiros só para gestor. */
export async function VisaoGeral({
  nivel,
  scope,
  arvore,
  cont,
  gestor,
}: {
  nivel: Nivel;
  scope: Scope;
  arvore: Arvore;
  cont: Cont;
  gestor: boolean;
}) {
  if (nivel === "tudo")
    return (
      <div>
        <h2 className={h2}>Clientes</h2>
        <ul className={lista}>
          {arvore.clientes.map((c) => (
            <li key={c.id}>
              <Link
                href={trabalhoHref({ cliente: c.id })}
                className="flex justify-between gap-3 px-4 py-2.5 hover:bg-secondary/50"
              >
                <span className="font-medium text-text">{c.nome}</span>
                <span className="tabular-nums text-text-muted">
                  {c.contratos.length} contratos · {c.abertas} tarefas abertas
                </span>
              </Link>
            </li>
          ))}
          {!arvore.clientes.length && (
            <li className="px-4 py-3 text-text-muted">Nenhum cliente.</li>
          )}
        </ul>
      </div>
    );

  if (nivel === "projeto" && scope.projeto) return <PorStatus projetoId={scope.projeto} />;

  const [contratos, projetos] = await Promise.all([
    carregarContratos(scope, gestor),
    carregarProjetos(scope, cont),
  ]);
  return (
    <div className="space-y-6">
      {nivel === "cliente" && (
        <section>
          <h2 className={h2}>Contratos</h2>
          <Contratos itens={contratos} gestor={gestor} />
        </section>
      )}
      {nivel === "contrato" && contratos[0] && (
        <section>
          <h2 className={h2}>Situação</h2>
          <Contratos itens={contratos} gestor={gestor} />
        </section>
      )}
      <section>
        <h2 className={h2}>Projetos</h2>
        {projetos.length ? <ProjetoCards itens={projetos} /> : vazio}
      </section>
      {nivel === "contrato" && scope.contrato && <Contrato id={scope.contrato} gestor={gestor} />}
      {nivel === "cliente" && scope.cliente && (
        <section>
          <h2 className={h2}>Últimas atividades</h2>
          <Atividades clienteId={scope.cliente} />
        </section>
      )}
    </div>
  );
}
