import { DatawareGrafo } from "@front/components/dataware/dataware-grafo";
import { type DwAresta, paraNo } from "@front/lib/dataware";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "DataWare" };

export default async function DatawarePage() {
  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  // Carga inicial (FR-008-11): Clientes > Contratos > Projetos (+ Pessoas); o resto vem ao expandir.
  const [n, a, r, gn, ga] = await Promise.all([
    sb
      .from("dw_no")
      .select("*")
      .in("tipo", ["cliente", "contrato", "projeto", "pessoa"])
      .limit(1000),
    sb
      .from("dw_aresta")
      .select("*")
      .in("relacao", ["contrato", "projeto", "subprojeto"])
      .limit(1000),
    sb.from("dw_aresta").select("*").eq("relacao", "responsavel").limit(1000),
    sb.from("dw_gaveta_no").select("*").limit(1000),
    sb.from("dw_gaveta_aresta").select("*").limit(2000),
  ]);
  const nos = [...(n.data ?? []), ...(gn.data ?? [])].map(paraNo);
  const arestas = [...(a.data ?? []), ...(r.data ?? []), ...(ga.data ?? [])] as DwAresta[];

  return (
    <div className="flex h-[calc(100dvh-5rem)] min-h-0 min-w-0 flex-col overflow-hidden sm:h-[calc(100dvh-5.5rem)] lg:h-[calc(100dvh-3rem)]">
      <h1 className="mb-2 shrink-0 font-title text-[clamp(1.125rem,2.2vw,1.5rem)] text-text">
        DataWare
      </h1>
      <DatawareGrafo nosIniciais={nos} arestasIniciais={arestas} />
    </div>
  );
}
