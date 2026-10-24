import type { ChecklistItem, Filtros, Tarefa } from "@front/components/tarefas/shared";
import { TarefasView } from "@front/components/tarefas/tarefas-view";
import { carregarArvore } from "@front/lib/arvore";
import { createSupabaseServer } from "@front/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export type Escopo = {
  cliente?: string;
  contrato?: string;
  projeto?: string;
  resp?: string;
  status?: string;
  prioridade?: string;
  atrasadas?: string;
};

const SELECT =
  "id, titulo, descricao, status, prioridade, urgencia, esforco, responsavel_id, estimativa_horas, data_prazo, data_inicio, categoria, bloqueada_por_id, link_externo, checklist, parent_id, projeto_id, numero, responsavel:responsavel_id(nome), n:comentario(count)";

/** Tarefas de todos os projetos do escopo (cliente/contrato/projeto) com breadcrumb; kanban/lista/tabela via TarefasView. */
export async function TarefasDoEscopo({
  escopo,
  abrirNumero,
  breadcrumb = true,
}: {
  escopo: Escopo;
  /** Abre o painel da tarefa de numero N (rota /tarefas/[chave]); exige escopo.projeto. */
  abrirNumero?: number;
  breadcrumb?: boolean;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { clientes, projetos } = await carregarArvore();
  const noEscopo = projetos.filter(
    (p) =>
      (!escopo.projeto || p.id === escopo.projeto) &&
      (!escopo.contrato || p.contratoId === escopo.contrato) &&
      (!escopo.cliente || p.clienteId === escopo.cliente),
  );
  if (escopo.projeto && noEscopo.length === 0) notFound();

  // Nome para o breadcrumb mesmo sem projetos (cliente/contrato vazios).
  const ref = noEscopo[0];
  const clienteNo = clientes.find((c) => c.id === (escopo.cliente ?? ref?.clienteId));
  const contratoNo = escopo.contrato
    ? clientes.flatMap((c) => c.contratos).find((k) => k.id === escopo.contrato)
    : null;
  if ((escopo.cliente && !clienteNo) || (escopo.contrato && !contratoNo)) notFound();

  const ids = noEscopo.map((p) => p.id);
  const [{ data: tarefas }, { data: eu }, { data: pessoas }] = await Promise.all([
    ids.length
      ? supabase
          .from("tarefa")
          .select(SELECT)
          .in("projeto_id", ids)
          .is("deleted_at", null)
          .order("urgencia", { ascending: false })
          .order("esforco", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      .from("pessoa")
      .select("id, org_id, papel")
      .eq("auth_user_id", user.id)
      .eq("ativo", true)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("pessoa")
      .select("id, nome")
      .eq("ativo", true)
      .is("deleted_at", null)
      .order("nome"),
  ]);

  const lista: Tarefa[] = (tarefas ?? []).map((t) => {
    const { n, ...resto } = t as unknown as Tarefa & { n: { count: number }[] | null };
    return {
      ...resto,
      checklist: Array.isArray(resto.checklist) ? (resto.checklist as ChecklistItem[]) : [],
      n_comentarios: n?.[0]?.count ?? 0,
    };
  });
  const abrir = abrirNumero !== undefined ? lista.find((t) => t.numero === abrirNumero) : undefined;
  if (abrirNumero !== undefined && !abrir) notFound();

  const filtros: Partial<Filtros> = {
    responsavel: escopo.resp ?? "",
    status: escopo.status ?? "",
    prioridade: escopo.prioridade ?? "",
    atrasadas: escopo.atrasadas === "1",
  };

  return (
    <div className="min-w-0">
      {breadcrumb && (
        <nav aria-label="Escopo" className="mb-4">
          <h1 className="font-title text-2xl text-text">Tarefas</h1>
          <p className="mt-1 flex flex-wrap gap-x-1.5 text-sm text-text-muted">
            <Link href="/tarefas" className="hover:text-accent">
              Todas
            </Link>
            {clienteNo && (
              <>
                <span>/</span>
                <Link href={`/tarefas?cliente=${clienteNo.id}`} className="hover:text-accent">
                  {clienteNo.nome}
                </Link>
              </>
            )}
            {(contratoNo || (escopo.projeto && ref)) && (
              <>
                <span>/</span>
                {contratoNo || ref?.contratoId ? (
                  <Link
                    href={`/tarefas?contrato=${contratoNo?.id ?? ref?.contratoId}`}
                    className="hover:text-accent"
                  >
                    {contratoNo?.nome ?? ref?.contratoNome}
                  </Link>
                ) : (
                  <span>Sem contrato</span>
                )}
              </>
            )}
            {escopo.projeto && ref && (
              <>
                <span>/</span>
                <Link href={`/tarefas?projeto=${ref.id}`} className="font-medium text-text">
                  {ref.nome}
                </Link>
              </>
            )}
          </p>
        </nav>
      )}
      <TarefasView
        key={JSON.stringify(escopo)}
        tarefas={lista}
        pessoas={pessoas ?? []}
        abrirId={abrir?.id ?? null}
        filtrosIniciais={filtros}
        ctx={{
          orgId: eu?.org_id ?? "",
          projetoId: escopo.projeto ?? null,
          projetos,
          meId: eu?.id ?? null,
          readOnly: !eu || eu.papel === "convidado",
        }}
      />
    </div>
  );
}
