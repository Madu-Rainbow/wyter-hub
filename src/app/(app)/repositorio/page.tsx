import { Button } from "@front/components/ui/button";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { redirect } from "next/navigation";

async function publicar(formData: FormData) {
  "use server";
  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: pessoa } = await sb
    .from("pessoa")
    .select("id, org_id, papel")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (!pessoa || pessoa.papel === "convidado") redirect("/repositorio");

  const item = {
    org_id: pessoa.org_id,
    tipo: String(formData.get("tipo") ?? "skill"),
    slug: String(formData.get("slug") ?? "")
      .trim()
      .toLowerCase(),
    nome: String(formData.get("nome") ?? "").trim(),
    descricao: String(formData.get("descricao") ?? "").trim(),
    conteudo: String(formData.get("conteudo") ?? ""),
    versao: String(formData.get("versao") ?? "1.0.0").trim(),
    publicado: formData.get("publicado") === "on",
    criado_por: pessoa.id,
    atualizado_por: pessoa.id,
  };
  const { error } = await sb.from("repositorio_item" as never).insert(item as never);
  if (error) throw new Error(error.message);
  redirect("/repositorio");
}

export default async function RepositorioPage() {
  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: pessoa } = await sb
    .from("pessoa")
    .select("id, papel")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (!pessoa) redirect("/login");

  const { data } = await sb
    .from("repositorio_item" as never)
    .select("id, tipo, slug, nome, descricao, versao, publicado, updated_at")
    .order("tipo")
    .order("nome");
  const itens = (data ?? []) as unknown as {
    id: string;
    tipo: string;
    slug: string;
    nome: string;
    descricao: string;
    versao: string;
    publicado: boolean;
    updated_at: string;
  }[];
  const podePublicar = pessoa.papel !== "convidado";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-title text-2xl text-text">Repositório</h1>
        <p className="text-sm text-text-muted">
          Plugins e skills compartilhados pela equipe da Wyter.
        </p>
      </div>
      {podePublicar && (
        <form
          action={publicar}
          className="grid gap-3 rounded-md border border-border bg-surface p-4"
        >
          <h2 className="font-title text-lg text-text">Publicar item</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="nome"
              required
              placeholder="Nome"
              className="h-9 rounded border border-border px-2 text-sm"
            />
            <input
              name="slug"
              required
              placeholder="slug-do-item"
              className="h-9 rounded border border-border px-2 text-sm"
            />
            <select
              name="tipo"
              className="h-9 rounded border border-border bg-surface px-2 text-sm"
              defaultValue="skill"
            >
              <option value="skill">Skill</option>
              <option value="plugin">Plugin</option>
            </select>
            <input
              name="versao"
              defaultValue="1.0.0"
              required
              className="h-9 rounded border border-border px-2 text-sm"
            />
          </div>
          <input
            name="descricao"
            placeholder="Descrição curta"
            className="h-9 rounded border border-border px-2 text-sm"
          />
          <textarea
            name="conteudo"
            required
            placeholder="Conteúdo ou instruções do item"
            className="min-h-28 rounded border border-border p-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" name="publicado" />
            Publicar para os colegas
          </label>
          <Button type="submit" size="sm" className="w-fit">
            Publicar
          </Button>
        </form>
      )}
      <ul className="grid gap-3 md:grid-cols-2">
        {itens.map((item) => (
          <li key={item.id} className="rounded-md border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-text-muted">
                  {item.tipo} · v{item.versao}
                </p>
                <h2 className="font-title text-lg text-text">{item.nome}</h2>
              </div>
              <span className="text-xs text-text-muted">
                {item.publicado ? "Publicado" : "Rascunho"}
              </span>
            </div>
            <p className="mt-2 text-sm text-text-muted">{item.descricao || "Sem descrição."}</p>
            <p className="mt-3 font-mono text-xs text-text-muted">{item.slug}</p>
          </li>
        ))}
        {!itens.length && <li className="text-sm text-text-muted">Nenhum item disponível.</li>}
      </ul>
    </div>
  );
}
