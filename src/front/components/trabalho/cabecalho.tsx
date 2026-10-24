import { brl, SituacaoBadge, vigencia } from "@front/components/contratos/situacao";
import { Progresso } from "@front/components/projetos/progresso";
import { Button } from "@front/components/ui/button";
import { financeiroContratos } from "@front/lib/financeiro";
import { ehGestor } from "@front/lib/papel";
import { createSupabaseServer } from "@front/lib/supabase/server";
import {
  ABAS,
  COLUNAS_CONTRATO,
  type ContratoRow,
  type Nivel,
  trabalhoHref,
} from "@front/lib/trabalho";
import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { StatusProjeto } from "./projetos-aba";
import { type Cont, fmtISO, type Scope, somar } from "./tipos";

const sep = <span aria-hidden="true">/</span>;

/** Breadcrumb, nome, status, responsável, vigência/prazo, progresso, "Novo" contextual e abas (FR-002-24/25/28). */
export async function Cabecalho({
  nivel,
  scope,
  papel,
  aba,
  cont,
  idsProjetos,
}: {
  nivel: Nivel;
  scope: Scope;
  papel: string;
  aba: string;
  cont: Cont;
  idsProjetos: string[];
}) {
  const gestor = ehGestor(papel);
  const sb = await createSupabaseServer();
  const [cli, ctr, prj] = await Promise.all([
    scope.cliente
      ? sb
          .from("cliente")
          .select("nome_fantasia, razao_social, status, segmento, responsavel:responsavel_id(nome)")
          .eq("id", scope.cliente)
          .maybeSingle()
      : null,
    scope.contrato
      ? sb.from("contrato").select(COLUNAS_CONTRATO).eq("id", scope.contrato).maybeSingle()
      : null,
    scope.projeto
      ? sb
          .from("projeto")
          .select(
            "nome, chave, status, tipo, data_inicio, data_fim, responsavel:responsavel_id(nome)",
          )
          .eq("id", scope.projeto)
          .maybeSingle()
      : null,
  ]);
  const { data: andamento } = scope.contrato
    ? await sb
        .from("contrato_andamento")
        .select("situacao")
        .eq("contrato_id", scope.contrato)
        .maybeSingle()
    : { data: null };

  const c = cli?.data;
  const nomeCliente = c ? c.nome_fantasia || c.razao_social : null;
  const fin =
    gestor && scope.contrato
      ? (await financeiroContratos(sb, [scope.contrato])).get(scope.contrato)
      : null;
  const k = ctr?.data ? ({ ...(ctr.data as unknown as ContratoRow), ...fin } as ContratoRow) : null;
  const nomeContrato = k ? (k.numero ? `${k.numero} · ${k.tipo}` : k.tipo) : null;
  const p = prj?.data;
  const resp = (x: unknown) => (x as { nome: string } | null)?.nome;
  const prog = somar(cont, idsProjetos);

  const titulo =
    nivel === "projeto"
      ? p?.nome
      : nivel === "contrato"
        ? nomeContrato
        : nivel === "cliente"
          ? nomeCliente
          : "Trabalho";
  const editar =
    gestor &&
    (nivel === "projeto"
      ? `/projetos/${scope.projeto}/editar`
      : nivel === "contrato"
        ? `/contratos/${scope.contrato}/editar`
        : nivel === "cliente"
          ? `/clientes/${scope.cliente}/editar`
          : null);

  // "Novo" contextual com o pai pré-preenchido (FR-002-28).
  const novos: { href: string; label: string }[] = [];
  if (nivel === "tudo" && gestor) novos.push({ href: "/clientes/novo", label: "Novo cliente" });
  if (nivel === "cliente" && gestor) {
    novos.push({ href: `/contratos/novo?cliente=${scope.cliente}`, label: "Novo contrato" });
    novos.push({ href: `/projetos/novo?cliente=${scope.cliente}`, label: "Novo projeto" });
  }
  if (nivel === "contrato" && gestor)
    novos.push({
      href: `/projetos/novo?cliente=${scope.cliente}&contrato=${scope.contrato}`,
      label: "Novo projeto",
    });
  if (nivel === "projeto" && papel !== "convidado")
    novos.push({
      href: trabalhoHref({ ...scope, aba: "tarefas", nova: "1" }),
      label: "Nova tarefa",
    });

  return (
    <header className="shrink-0 border-b border-border pb-3">
      <nav
        aria-label="Escopo"
        className="flex flex-wrap items-center gap-x-1.5 text-sm text-text-muted"
      >
        <Link href="/trabalho" className="hover:text-accent">
          Trabalho
        </Link>
        {nomeCliente && (
          <>
            {sep}
            <Link href={trabalhoHref({ cliente: scope.cliente })} className="hover:text-accent">
              {nomeCliente}
            </Link>
          </>
        )}
        {scope.projeto && !scope.contrato && (
          <>
            {sep}
            <span>Sem contrato</span>
          </>
        )}
        {nomeContrato && (
          <>
            {sep}
            <Link
              href={trabalhoHref({ cliente: scope.cliente, contrato: scope.contrato })}
              className="hover:text-accent"
            >
              {nomeContrato}
            </Link>
          </>
        )}
        {p && (
          <>
            {sep}
            <span className="font-medium text-text">{p.nome}</span>
          </>
        )}
      </nav>

      <div className="mt-1 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h1 className="font-title text-2xl text-text">
            {titulo}
            {p && (
              <span className="ml-2 text-sm font-normal tabular-nums text-text-muted">
                {p.chave}
              </span>
            )}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
            {p && <StatusProjeto status={p.status} />}
            {k && <SituacaoBadge situacao={andamento?.situacao ?? "sem_projeto"} />}
            {c && <span className="capitalize">{c.status}</span>}
            {c?.segmento && <span>{c.segmento}</span>}
            {(resp(p?.responsavel) ?? resp(c?.responsavel)) && (
              <span>Resp.: {resp(p?.responsavel) ?? resp(c?.responsavel)}</span>
            )}
            {k && (
              <span className="tabular-nums">
                Vigência: {vigencia(k.vigencia_inicio, k.vigencia_fim)}
              </span>
            )}
            {gestor && k?.valor != null && <span className="tabular-nums">{brl(k.valor)}</span>}
            {p?.data_inicio && (
              <span className="tabular-nums">
                Prazo: {fmtISO(p.data_inicio)}
                {p.data_fim ? ` — ${fmtISO(p.data_fim)}` : ""}
              </span>
            )}
            {nivel !== "tudo" && <Progresso feitas={prog.feitas} total={prog.total} />}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {editar && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-text-muted" asChild>
              <Link href={editar}>
                <Pencil className="size-3.5" />
                Editar
              </Link>
            </Button>
          )}
          {novos.map((n) => (
            <Button key={n.label} size="sm" className="gap-1.5" asChild>
              <Link href={n.href}>
                <Plus className="size-3.5" />
                {n.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Abas do escopo"
        className="-mb-3 mt-3 flex gap-1 overflow-x-auto"
      >
        {ABAS[nivel].map(([key, label]) => (
          <Link
            key={key}
            role="tab"
            aria-selected={aba === key}
            href={trabalhoHref({ ...scope, aba: key })}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-accent ${aba === key ? "border-accent font-medium text-text" : "border-transparent text-text-muted hover:text-text"}`}
          >
            {label}
          </Link>
        ))}
      </div>
    </header>
  );
}
