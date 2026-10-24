import {
  brl,
  fmtData,
  Progresso,
  SituacaoBadge,
  vigencia,
} from "@front/components/contratos/situacao";
import { Button } from "@front/components/ui/button";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function ContratoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: pessoa },
    { data: c },
    { data: a },
    { data: projetos },
    { data: aditivos },
    { data: escopos },
    { data: extras },
  ] = await Promise.all([
    supabase.from("pessoa").select("papel").eq("auth_user_id", user.id).single(),
    supabase
      .from("contrato")
      .select("*, cliente:cliente_id(id, nome_fantasia, razao_social)")
      .eq("id", id)
      .is("deleted_at", null)
      .single(),
    supabase.from("contrato_andamento").select("*").eq("contrato_id", id).maybeSingle(),
    supabase
      .from("projeto")
      .select("id, nome, status, tipo")
      .eq("contrato_id", id)
      .is("deleted_at", null)
      .order("nome"),
    supabase.from("aditivo").select("*").eq("contrato_id", id).order("data", { ascending: false }),
    supabase.from("escopo").select("*").eq("contrato_id", id).order("created_at"),
    supabase.from("escopo_extra").select("*").eq("contrato_id", id).order("created_at"),
  ]);
  if (!c) notFound();

  const cliente = c.cliente as unknown as {
    id: string;
    nome_fantasia: string | null;
    razao_social: string;
  } | null;
  const podeEditar = !!pessoa && ["diretor", "consultor"].includes(pessoa.papel);
  const h2 = "mb-2 font-title text-lg text-text";
  const empty = <p className="text-sm text-text-muted">Nenhum registro.</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="mb-4 gap-1.5 text-text-muted" asChild>
          <Link href="/contratos">
            <ArrowLeft className="size-3.5" />
            Contratos
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-title text-2xl text-text">{c.tipo}</h1>
            <p className="text-sm text-text-muted">
              {c.numero ? `${c.numero} · ` : ""}
              {cliente ? (
                <Link href={`/clientes/${cliente.id}`} className="hover:underline">
                  {cliente.nome_fantasia || cliente.razao_social}
                </Link>
              ) : (
                "—"
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SituacaoBadge situacao={a?.situacao ?? "sem_projeto"} />
            {podeEditar && (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/contratos/${id}/editar`}>Editar</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <dl className="grid gap-4 rounded-md border border-border p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-text-muted">Valor</dt>
          <dd className="tabular-nums text-text">{brl(c.valor)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Vigência</dt>
          <dd className="tabular-nums text-text">{vigencia(c.vigencia_inicio, c.vigencia_fim)}</dd>
        </div>
        <div>
          <dt className="text-text-muted">Pagamento</dt>
          <dd className="text-text">{c.forma_pagamento ?? "—"}</dd>
        </div>
      </dl>

      <section>
        <h2 className={h2}>Progresso</h2>
        <Progresso entregues={a?.tarefas_entregues ?? 0} total={a?.total_tarefas ?? 0} />
      </section>

      <section>
        <h2 className={h2}>Projetos vinculados</h2>
        {projetos && projetos.length > 0 ? (
          <ul className="divide-y divide-border rounded-md border border-border text-sm">
            {projetos.map((p) => (
              <li key={p.id} className="flex justify-between px-4 py-2.5">
                <Link href={`/projetos/${p.id}`} className="font-medium text-text hover:underline">
                  {p.nome}
                </Link>
                <span className="text-text-muted">{p.status.replace("_", " ")}</span>
              </li>
            ))}
          </ul>
        ) : (
          empty
        )}
      </section>

      <section>
        <h2 className={h2}>Aditivos</h2>
        {aditivos && aditivos.length > 0 ? (
          <ul className="divide-y divide-border rounded-md border border-border text-sm">
            {aditivos.map((x) => (
              <li key={x.id} className="px-4 py-2.5">
                <p className="text-text">
                  <span className="tabular-nums text-text-muted">{fmtData(x.data)}</span> —{" "}
                  {x.motivo}
                </p>
                <p className="text-xs text-text-muted">
                  {x.impacto_valor != null && `Valor: ${brl(x.impacto_valor)} · `}
                  {x.impacto_prazo && `Prazo: ${x.impacto_prazo} · `}
                  {x.impacto_escopo && `Escopo: ${x.impacto_escopo}`}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          empty
        )}
      </section>

      <section>
        <h2 className={h2}>Escopos</h2>
        {escopos && escopos.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-sm text-text">
            {escopos.map((e) => (
              <li key={e.id}>{e.descricao}</li>
            ))}
          </ul>
        ) : (
          empty
        )}
      </section>

      <section>
        <h2 className={h2}>Escopos extras</h2>
        {extras && extras.length > 0 ? (
          <ul className="divide-y divide-border rounded-md border border-border text-sm">
            {extras.map((e) => (
              <li key={e.id} className="flex justify-between gap-4 px-4 py-2.5">
                <span className="text-text">{e.descricao}</span>
                <span className="shrink-0 text-text-muted">{e.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          empty
        )}
      </section>
    </div>
  );
}
