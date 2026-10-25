import { ArvoreNav } from "@front/components/arvore-nav";
import { TarefasDoEscopo } from "@front/components/tarefas/escopo";
import { Cabecalho } from "@front/components/trabalho/cabecalho";
import { ContratosAba } from "@front/components/trabalho/contratos-aba";
import { ProjetosAba } from "@front/components/trabalho/projetos-aba";
import type { Cont, Params } from "@front/components/trabalho/tipos";
import { VisaoGeral } from "@front/components/trabalho/visao-geral";
import { carregarArvore } from "@front/lib/arvore";
import { ehGestor } from "@front/lib/papel";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { lerTodas } from "@front/lib/tarefas";
import { ABAS, type Nivel, trabalhoHref } from "@front/lib/trabalho";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { DossieAba } from "./_components/dossie-aba";

const CHAVE = /^([A-Za-z0-9]{2,6})-(\d+)$/;
const FILTROS_TAREFA = ["resp", "status", "prioridade", "atrasadas"];

/** Área de Trabalho unificada: árvore Cliente > Contrato > Projeto + abas por nível (FR-002-23 a 29). */
export default async function TrabalhoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const sp: Params = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: eu }, arvore] = await Promise.all([
    sb.from("pessoa").select("papel").eq("auth_user_id", user.id).single(),
    carregarArvore(),
  ]);
  const papel = eu?.papel ?? "convidado";
  const gestor = ehGestor(papel);

  // Normaliza o escopo: o pai é derivado do filho (projeto -> contrato -> cliente).
  let { cliente, contrato, projeto } = sp;
  const { tarefa } = sp;
  const chave = tarefa ? CHAVE.exec(tarefa) : null;
  if (tarefa && !chave) notFound();
  if (chave && !projeto)
    projeto = arvore.projetos.find((p) => p.chave === chave[1].toUpperCase())?.id;
  if (projeto) {
    const p = arvore.projetos.find((x) => x.id === projeto);
    if (!p) notFound();
    contrato = p.contratoId ?? undefined;
    cliente = p.clienteId;
  } else if (contrato) {
    const c = arvore.clientes.find((x) => x.contratos.some((k) => k.id === contrato));
    if (!c) notFound();
    cliente = c.id;
  } else if (cliente && !arvore.clientes.some((x) => x.id === cliente)) notFound();

  const nivel: Nivel = projeto ? "projeto" : contrato ? "contrato" : cliente ? "cliente" : "tudo";
  const temFiltro = FILTROS_TAREFA.some((f) => sp[f]);
  let aba = sp.aba ?? (tarefa || sp.nova || temFiltro ? "tarefas" : "geral");
  if (!ABAS[nivel].some(([k]) => k === aba)) aba = "geral";

  if (
    cliente !== sp.cliente ||
    contrato !== sp.contrato ||
    projeto !== sp.projeto ||
    aba !== sp.aba
  )
    redirect(trabalhoHref({ ...sp, cliente, contrato, projeto, aba }));

  const scope = { cliente, contrato, projeto };
  const params: Params = scope;
  const idsProjetos = arvore.projetos
    .filter(
      (p) =>
        (!projeto || p.id === projeto) &&
        (!contrato || p.contratoId === contrato) &&
        (!cliente || p.clienteId === cliente),
    )
    .map((p) => p.id);

  const cont: Cont = new Map();
  if (idsProjetos.length && nivel !== "tudo") {
    // Lê todas as linhas em páginas (o PostgREST corta em 1000) para o progresso não truncar.
    const data = await lerTodas((de, ate) =>
      sb
        .from("tarefa")
        .select("id, projeto_id, status")
        .in("projeto_id", idsProjetos)
        .neq("status", "cancelada")
        .is("deleted_at", null)
        .order("id")
        .range(de, ate),
    );
    for (const t of data) {
      const c = cont.get(t.projeto_id) ?? { feitas: 0, total: 0 };
      c.total++;
      if (t.status === "concluida") c.feitas++;
      cont.set(t.projeto_id, c);
    }
  }

  const arvoreNav = (
    <Suspense fallback={<div className="flex-1" />}>
      <ArvoreNav clientes={arvore.clientes} />
    </Suspense>
  );

  return (
    <div className="flex h-[calc(100dvh-5rem)] min-h-0 flex-col gap-3 sm:h-[calc(100dvh-5.5rem)] lg:h-[calc(100dvh-3rem)] lg:flex-row lg:gap-4">
      <details className="shrink-0 rounded-md border border-border bg-surface lg:hidden">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-text">
          Navegar (Cliente / Contrato / Projeto)
        </summary>
        <div className="flex max-h-64 flex-col pb-2">{arvoreNav}</div>
      </details>
      <aside
        aria-label="Árvore de trabalho"
        className="hidden w-64 shrink-0 flex-col rounded-md border border-border bg-surface pt-2 lg:flex"
      >
        {arvoreNav}
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Cabecalho
          nivel={nivel}
          scope={scope}
          papel={papel}
          aba={aba}
          cont={cont}
          idsProjetos={idsProjetos}
        />
        {/* Gantt tem rolagem propria (grade); aqui nao rola para nao haver rolagem dupla. */}
        <div
          className={`flex min-h-0 flex-1 flex-col pt-4 ${aba === "tarefas" && sp.visao === "gantt" ? "overflow-hidden" : "overflow-y-auto"}`}
        >
          {aba === "tarefas" ? (
            <TarefasDoEscopo
              escopo={{
                ...scope,
                resp: sp.resp,
                status: sp.status,
                prioridade: sp.prioridade,
                atrasadas: sp.atrasadas,
              }}
              abrirNumero={chave ? Number(chave[2]) : undefined}
              nova={sp.nova === "1"}
            />
          ) : aba === "projetos" ? (
            <ProjetosAba scope={scope} params={params} cont={cont} sp={sp} />
          ) : aba === "contratos" ? (
            <ContratosAba scope={scope} params={params} gestor={gestor} sp={sp} />
          ) : aba === "dossie" && cliente ? (
            <DossieAba clienteId={cliente} papel={papel} />
          ) : (
            <VisaoGeral nivel={nivel} scope={scope} arvore={arvore} cont={cont} gestor={gestor} />
          )}
        </div>
      </section>
    </div>
  );
}
