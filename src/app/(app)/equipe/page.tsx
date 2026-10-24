import { createSupabaseServer } from "@front/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function EquipePage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pessoas } = await supabase
    .from("pessoa")
    .select("id, nome, email, papel, cargo, ativo, capacidade_semanal_horas")
    .is("deleted_at", null)
    .order("nome");

  const papelLabels: Record<string, string> = {
    diretor: "Diretor",
    consultor: "Consultor",
    analista: "Analista",
    convidado: "Convidado",
  };

  const papelColors: Record<string, string> = {
    diretor: "bg-purple-50 text-purple-700 border-purple-200",
    consultor: "bg-blue-50 text-blue-700 border-blue-200",
    analista: "bg-teal-50 text-teal-700 border-teal-200",
    convidado: "bg-gray-50 text-gray-600 border-gray-200",
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-title text-2xl text-text">Equipe</h1>
        <p className="text-sm text-text-muted">{pessoas?.length ?? 0} membros</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pessoas?.map((p) => (
          <Link
            key={p.id}
            href={`/equipe/${p.id}`}
            className="rounded-md border border-border bg-surface p-4 transition-colors hover:border-accent/30 hover:bg-secondary/40 focus-visible:outline-2 focus-visible:outline-accent"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-accent text-sm font-medium text-primary-foreground">
                  {p.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-text">{p.nome}</p>
                  <p className="text-xs text-text-muted">{p.cargo ?? p.email}</p>
                </div>
              </div>
              {!p.ativo && (
                <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-600">
                  Inativo
                </span>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span
                className={`inline-block rounded-full border px-2 py-0.5 text-xs ${papelColors[p.papel] ?? papelColors.convidado}`}
              >
                {papelLabels[p.papel] ?? p.papel}
              </span>
              {p.capacidade_semanal_horas != null && (
                <span className="text-xs text-text-muted">{p.capacidade_semanal_horas}h/sem</span>
              )}
            </div>
          </Link>
        ))}
        {(!pessoas || pessoas.length === 0) && (
          <p className="col-span-full py-8 text-center text-text-muted">
            Nenhum membro cadastrado.
          </p>
        )}
      </div>
    </div>
  );
}
