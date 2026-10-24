import { trabalhoHref } from "@front/lib/trabalho";
import { redirect } from "next/navigation";

/** Rota antiga: vira a aba Contratos de /trabalho (FR-002-27). */
export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { visao, situacao, cliente } = await searchParams;
  redirect(trabalhoHref({ cliente, aba: cliente ? "contratos" : "geral", visao, situacao }));
}
