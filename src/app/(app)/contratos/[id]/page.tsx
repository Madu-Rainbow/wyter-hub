import { trabalhoHref } from "@front/lib/trabalho";
import { redirect } from "next/navigation";

export default async function ContratoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(trabalhoHref({ contrato: id }));
}
