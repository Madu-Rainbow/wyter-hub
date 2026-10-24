import { TarefasDoEscopo } from "@front/components/tarefas/escopo";
import { carregarArvore } from "@front/lib/arvore";
import { notFound } from "next/navigation";

/** /tarefas/FARM-12: visao do projeto com o painel da tarefa aberto. */
export default async function TarefaPorChavePage({
  params,
}: {
  params: Promise<{ chave: string }>;
}) {
  const { chave } = await params;
  const m = /^([A-Za-z0-9]{2,6})-(\d+)$/.exec(decodeURIComponent(chave));
  if (!m) notFound();
  const { projetos } = await carregarArvore();
  const projeto = projetos.find((p) => p.chave === m[1].toUpperCase());
  if (!projeto) notFound();
  return <TarefasDoEscopo escopo={{ projeto: projeto.id }} abrirNumero={Number(m[2])} />;
}
