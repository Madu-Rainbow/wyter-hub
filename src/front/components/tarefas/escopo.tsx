import type {
  ChecklistItem,
  Etiqueta,
  Filtros,
  PessoaOpt,
  Tarefa,
} from "@front/components/tarefas/shared";
import { TarefasView } from "@front/components/tarefas/tarefas-view";
import { carregarArvore } from "@front/lib/arvore";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { lerTodas } from "@front/lib/tarefas";
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
  "id, titulo, descricao, status, prioridade, urgencia, esforco, responsavel_id, estimativa_horas, data_prazo, data_inicio, categoria, bloqueada_por_id, link_externo, parent_id, projeto_id, numero, prazo_hora, lembrete_em, entregue_em, arquivada_em, capa_anexo_id, n_anexos, responsavel:responsavel_id(nome), n:comentario(count), cl:checklist(itens:checklist_item(id, texto, feito)), m:tarefa_membro(pessoa:pessoa_id(id, nome)), e:tarefa_etiqueta(etiqueta:etiqueta_id(id, nome, cor)), capa:capa_anexo_id(url_ou_caminho, eh_arquivo)";

/** Tarefas de todos os projetos do escopo (cliente/contrato/projeto) com breadcrumb; kanban/lista/tabela via TarefasView. */
export async function TarefasDoEscopo({
  escopo,
  abrirNumero,
  nova = false,
}: {
  escopo: Escopo;
  /** Abre o painel da tarefa de numero N (?tarefa=CHAVE); exige escopo.projeto. */
  abrirNumero?: number;
  /** Abre o painel de nova tarefa. */
  nova?: boolean;
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
  const [tarefas, { data: eu }, { data: pessoas }] = await Promise.all([
    // Paginado: o PostgREST corta cada resposta em 1000 linhas.
    ids.length
      ? lerTodas((de, ate) =>
          supabase
            .from("tarefa")
            .select(SELECT)
            .in("projeto_id", ids)
            .is("deleted_at", null)
            .order("urgencia", { ascending: false })
            .order("esforco", { ascending: false })
            .order("id")
            .range(de, ate),
        )
      : Promise.resolve([]),
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

  const lista: Tarefa[] = tarefas.map((t) => {
    const { n, cl, m, e, capa, ...resto } = t as unknown as Tarefa & {
      n: { count: number }[] | null;
      cl: { itens: ChecklistItem[] }[] | null;
      m: { pessoa: PessoaOpt | null }[] | null;
      e: { etiqueta: Etiqueta | null }[] | null;
      capa: { url_ou_caminho: string; eh_arquivo: boolean } | null;
    };
    return {
      ...resto,
      checklist: (cl ?? []).flatMap((c) => c.itens),
      n_comentarios: n?.[0]?.count ?? 0,
      membros: (m ?? []).flatMap((x) => (x.pessoa ? [x.pessoa] : [])),
      etiquetas: (e ?? []).flatMap((x) => (x.etiqueta ? [x.etiqueta] : [])),
      capa: capa?.eh_arquivo ? { path: capa.url_ou_caminho } : null,
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <TarefasView
        key={JSON.stringify([escopo, abrirNumero, nova])}
        tarefas={lista}
        pessoas={pessoas ?? []}
        abrirId={abrir?.id ?? null}
        abrirNova={nova}
        filtrosIniciais={filtros}
        ctx={{
          orgId: eu?.org_id ?? "",
          projetoId: escopo.projeto ?? null,
          // So os projetos do escopo: criar/mover tarefa nao oferece projeto de outro cliente.
          projetos: noEscopo,
          meId: eu?.id ?? null,
          readOnly: !eu || eu.papel === "convidado",
        }}
      />
    </div>
  );
}
