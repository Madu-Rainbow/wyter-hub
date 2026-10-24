import { VisaoRegistro } from "@front/components/registro/visao";
import { carregarPeriodo, resolvePeriodo } from "@front/lib/registro";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { formatDataISO } from "@front/lib/tarefas";
import { redirect } from "next/navigation";

export default async function MeuDiaPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; data?: string; aba?: string }>;
}) {
  const sp = await searchParams;
  const { p, ref, dias } = resolvePeriodo(sp.periodo, sp.data);
  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: eu } = await sb
    .from("pessoa")
    .select("id, nome, papel")
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!eu) redirect("/login");

  const d = await carregarPeriodo(sb, { ref, dias, pessoaId: eu.id });
  let salvos: Map<string, string> | undefined;
  if (dias === 1) {
    const { data } = await sb
      .from("registro_diario")
      .select("cliente_id, o_que_fiz")
      .eq("pessoa_id", eu.id)
      .eq("data", ref);
    salvos = new Map((data ?? []).map((r) => [r.cliente_id, r.o_que_fiz]));
  }

  const hora = Number(
    new Date().toLocaleString("pt-BR", {
      timeZone: "America/Cuiaba",
      hour: "2-digit",
      hour12: false,
    }),
  );
  const saud = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  return (
    <VisaoRegistro
      base="/meu-dia"
      titulo={`${saud}, ${eu.nome.split(" ")[0]}`}
      subtitulo={dias === 1 ? formatDataISO(ref) : `Últimos ${dias} dias até ${formatDataISO(ref)}`}
      aba={sp.aba === "relatorio" ? "relatorio" : "painel"}
      periodo={p}
      ref={ref}
      dias={dias as 1 | 7 | 30}
      d={d}
      voz="eu"
      podeSalvar={eu.papel !== "convidado"}
      salvos={salvos}
      params={{}}
    />
  );
}
