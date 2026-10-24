import { trabalhoHref } from "@front/lib/trabalho";
import { redirect } from "next/navigation";

/** Rota antiga: vira a aba Projetos de /trabalho (FR-002-27). */
export default async function ProjetosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { q, status, resp, visao, ordem, dir } = await searchParams;
  redirect(trabalhoHref({ aba: "projetos", q, status, resp, visao, ordem, dir }));
}
