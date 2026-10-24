import { createSupabaseServer } from "@front/lib/supabase/server";
import { gravarSensivel } from "../../../app/(app)/clientes/[id]/actions";
import { SensiveisLista } from "./sensiveis-lista";

/** Dados sensíveis cifrados do cliente (CPF, endereço, dado processual). Só diretor/consultor. */
export async function SensiveisSecao({ clienteId, papel }: { clienteId: string; papel: string }) {
  if (!["diretor", "consultor"].includes(papel)) return null;
  const sb = await createSupabaseServer();
  const { data } = await sb
    .from("dado_sensivel")
    .select("id, campo, created_at")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false });
  return <SensiveisLista itens={data ?? []} gravar={gravarSensivel.bind(null, clienteId)} />;
}
