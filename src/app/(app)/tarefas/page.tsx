import { type Escopo, TarefasDoEscopo } from "@front/components/tarefas/escopo";

export default async function TarefasPage({ searchParams }: { searchParams: Promise<Escopo> }) {
  const { cliente, contrato, projeto, resp, status, prioridade, atrasadas } = await searchParams;
  return (
    <TarefasDoEscopo escopo={{ cliente, contrato, projeto, resp, status, prioridade, atrasadas }} />
  );
}
