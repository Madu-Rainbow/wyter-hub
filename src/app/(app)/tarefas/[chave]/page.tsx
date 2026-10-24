import { trabalhoHref } from "@front/lib/trabalho";
import { redirect } from "next/navigation";

/** /tarefas/FARM-12 -> /trabalho?tarefa=FARM-12 (a página deriva o projeto da chave). */
export default async function TarefaPorChavePage({
  params,
}: {
  params: Promise<{ chave: string }>;
}) {
  const { chave } = await params;
  redirect(trabalhoHref({ tarefa: decodeURIComponent(chave).toUpperCase() }));
}
