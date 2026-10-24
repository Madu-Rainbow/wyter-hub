import { trabalhoHref } from "@front/lib/trabalho";
import { redirect } from "next/navigation";

export default async function TarefasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { cliente, contrato, projeto, resp, status, prioridade, atrasadas, visao } =
    await searchParams;
  redirect(
    trabalhoHref({
      cliente,
      contrato,
      projeto,
      resp,
      status,
      prioridade,
      atrasadas,
      visao,
      aba: "tarefas",
    }),
  );
}
