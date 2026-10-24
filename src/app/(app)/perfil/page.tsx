import { Flash } from "@front/components/flash";
import { Button } from "@front/components/ui/button";
import { Input } from "@front/components/ui/input";
import { Label } from "@front/components/ui/label";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { LogOut } from "lucide-react";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { ok, erro } = await searchParams;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: p } = await supabase
    .from("pessoa")
    .select("id, nome, email, papel, cargo")
    .eq("auth_user_id", user.id)
    .single();
  if (!p) redirect("/painel");

  async function salvar(formData: FormData) {
    "use server";
    const sb = await createSupabaseServer();
    const {
      data: { user: u },
    } = await sb.auth.getUser();
    if (!u) redirect("/login");
    const nome = String(formData.get("nome") ?? "").trim();
    if (!nome) redirect(`/perfil?erro=${encodeURIComponent("Informe o nome.")}`);
    // Só nome e cargo: papel/ativo/capacidade ficam protegidos pela trigger trg_pessoa_proteger_colunas.
    const { data, error } = await sb
      .from("pessoa")
      .update({ nome, cargo: String(formData.get("cargo") ?? "").trim() || null })
      .eq("auth_user_id", u.id)
      .select("id");
    // shortcut: RLS pessoa_update só permite diretor/consultor; analista recebe 0 linhas. Ajustar policy (self-update) em migration.
    if (error || !data?.length)
      redirect(
        `/perfil?erro=${encodeURIComponent("Não foi possível salvar o perfil (sem permissão).")}`,
      );
    revalidatePath("/", "layout");
    redirect(`/perfil?ok=${encodeURIComponent("Perfil atualizado.")}`);
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 font-title text-2xl text-text">Meu perfil</h1>
      <p className="mb-6 text-sm text-text-muted">Dados exibidos para a equipe.</p>
      <Flash ok={ok} erro={erro} />
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-full bg-accent text-xl font-medium text-primary-foreground">
          {p.nome.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-text">{p.nome}</p>
          <p className="text-sm capitalize text-text-muted">{p.papel}</p>
        </div>
      </div>
      <form action={salvar} className="space-y-4 rounded-md border border-border bg-surface p-4">
        <div className="space-y-1">
          <Label htmlFor="nome">Nome de exibição</Label>
          <Input id="nome" name="nome" defaultValue={p.nome} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cargo">Cargo</Label>
          <Input id="cargo" name="cargo" defaultValue={p.cargo ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" value={p.email} readOnly disabled />
        </div>
        <div className="space-y-1">
          <Label htmlFor="papel">Papel</Label>
          <Input id="papel" value={p.papel} readOnly disabled className="capitalize" />
        </div>
        <Button type="submit" size="sm">
          Salvar
        </Button>
      </form>
      <Link
        href="/perfil/claude"
        className="mt-6 block text-sm text-primary underline-offset-4 hover:underline"
      >
        Claude (MCP)
      </Link>
      <form action="/api/auth/sign-out" method="POST" className="mt-6">
        <Button type="submit" variant="secondary" size="sm" className="gap-2">
          <LogOut className="size-3.5" />
          Sair
        </Button>
      </form>
    </div>
  );
}
