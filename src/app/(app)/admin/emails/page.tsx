import { createSupabaseServer } from "@front/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AddEmailForm } from "./add-email-form";

export default async function AdminEmailsPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pessoa } = await supabase
    .from("pessoa")
    .select("id, org_id, papel")
    .eq("auth_user_id", user.id)
    .single();

  if (pessoa?.papel !== "diretor") redirect("/painel");

  const { data: emails } = await supabase
    .from("email_autorizado")
    .select("id, email, created_at, pessoa:adicionado_por_id(nome)")
    .order("created_at", { ascending: false });

  async function addEmail(formData: FormData) {
    "use server";
    const sb = await createSupabaseServer();
    const email = (formData.get("email") as string)?.toLowerCase().trim();
    if (!email) return;

    const {
      data: { user: u },
    } = await sb.auth.getUser();
    if (!u) return;
    const { data: p } = await sb
      .from("pessoa")
      .select("id, org_id, papel")
      .eq("auth_user_id", u.id)
      .single();
    if (p?.papel !== "diretor") return;

    await sb.from("email_autorizado").insert({
      org_id: p.org_id,
      email,
      adicionado_por_id: p.id,
    });
    revalidatePath("/admin/emails");
  }

  async function removeEmail(formData: FormData) {
    "use server";
    const sb = await createSupabaseServer();
    const emailId = formData.get("emailId") as string;
    if (!emailId) return;

    await sb.from("email_autorizado").delete().eq("id", emailId);
    revalidatePath("/admin/emails");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 font-title text-2xl text-text">E-mails autorizados</h1>
      <p className="mb-6 text-sm text-text-muted">
        Gerencie quais e-mails podem acessar o sistema.
      </p>

      <AddEmailForm addEmail={addEmail} />

      <div className="mt-6 rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="px-4 py-2.5 text-left font-medium text-text-muted">E-mail</th>
              <th className="px-4 py-2.5 text-left font-medium text-text-muted">Adicionado por</th>
              <th className="px-4 py-2.5 text-right font-medium text-text-muted">Ação</th>
            </tr>
          </thead>
          <tbody>
            {emails?.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5">{e.email}</td>
                <td className="px-4 py-2.5 text-text-muted">
                  {(e.pessoa as unknown as { nome: string } | null)?.nome ?? "—"}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <form action={removeEmail} className="inline">
                    <input type="hidden" name="emailId" value={e.id} />
                    <button type="submit" className="text-xs text-danger hover:text-danger-hover">
                      Remover
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {(!emails || emails.length === 0) && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-text-muted">
                  Nenhum e-mail autorizado cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
