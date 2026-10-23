import { requireRole } from "@back/auth/middleware.js";
import { db } from "@back/db/drizzle.js";
import { emailAutorizado } from "@back/db/schema/email-autorizado.js";
import { pessoa } from "@back/db/schema/pessoa.js";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { AddEmailForm } from "./add-email-form.js";

export default async function AdminEmailsPage() {
  const session = await requireRole("diretor");
  const orgId = (session.user as Record<string, unknown>).orgId as string;

  const emails = await db
    .select({
      id: emailAutorizado.id,
      email: emailAutorizado.email,
      createdAt: emailAutorizado.createdAt,
      adicionadoPor: pessoa.nome,
    })
    .from(emailAutorizado)
    .leftJoin(pessoa, eq(emailAutorizado.adicionadoPorId, pessoa.id))
    .where(eq(emailAutorizado.orgId, orgId));

  async function addEmail(formData: FormData) {
    "use server";
    const s = await requireRole("diretor");
    const oId = (s.user as Record<string, unknown>).orgId as string;
    const email = (formData.get("email") as string)?.toLowerCase().trim();
    if (!email) return;

    const [pessoaAtual] = await db
      .select()
      .from(pessoa)
      .where(eq(pessoa.email, s.user.email))
      .limit(1);

    await db.insert(emailAutorizado).values({
      orgId: oId,
      email,
      adicionadoPorId: pessoaAtual?.id ?? null,
    });

    revalidatePath("/admin/emails");
  }

  async function removeEmail(formData: FormData) {
    "use server";
    await requireRole("diretor");
    const emailId = formData.get("emailId") as string;
    if (!emailId) return;

    await db.delete(emailAutorizado).where(eq(emailAutorizado.id, emailId));
    revalidatePath("/admin/emails");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 font-title text-2xl text-text">E-mails autorizados</h1>
      <p className="mb-6 text-sm text-text-muted">
        Gerencie quais e-mails podem acessar o sistema via Google OAuth.
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
            {emails.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2.5">{e.email}</td>
                <td className="px-4 py-2.5 text-text-muted">{e.adicionadoPor ?? "—"}</td>
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
            {emails.length === 0 && (
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
