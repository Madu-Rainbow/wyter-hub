import { TokensMcp } from "@front/components/mcp/tokens-mcp";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function ClaudeMcpPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: p } = await supabase
    .from("pessoa")
    .select("papel")
    .eq("auth_user_id", user.id)
    .single();
  if (!p) redirect("/painel");

  const { data: tokens } = await supabase
    .from("token_mcp")
    .select("id, nome, prefixo, escopo, expira_em, ultimo_uso_em, revogado_em, created_at")
    .order("created_at", { ascending: false });

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://rnfgzsdsetitvwbvrafz.supabase.co"}/functions/v1/mcp`;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/perfil"
        className="mb-3 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft className="size-3.5" />
        Perfil
      </Link>
      <h1 className="mb-1 font-title text-2xl text-text">Claude (MCP)</h1>
      <p className="mb-6 text-sm text-text-muted">
        Conecte o Claude ao Wyter Hub com um token pessoal. O Claude enxerga somente o que você
        enxerga; valores financeiros e dados sensíveis nunca são enviados; nenhum e-mail é enviado.
      </p>
      {p.papel === "convidado" ? (
        <p className="text-sm text-text-muted">Convidados não podem criar tokens.</p>
      ) : (
        <TokensMcp tokens={tokens ?? []} url={url} />
      )}
    </div>
  );
}
