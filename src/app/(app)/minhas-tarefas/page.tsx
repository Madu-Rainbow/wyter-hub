import { createSupabaseServer } from "@front/lib/supabase/server";
import { ABERTAS, formatDataISO, hojeISO, statusLabels } from "@front/lib/tarefas";
import Link from "next/link";
import { redirect } from "next/navigation";

type Tarefa = {
  id: string;
  titulo: string;
  status: string;
  prioridade: string;
  data_prazo: string | null;
  projeto: { id: string; nome: string } | null;
};

export default async function MinhasTarefasPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pessoa } = await supabase
    .from("pessoa")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();
  const { data } = pessoa
    ? await supabase
        .from("tarefa")
        .select("id, titulo, status, prioridade, data_prazo, projeto:projeto_id(id, nome)")
        .eq("responsavel_id", pessoa.id)
        .in("status", ABERTAS)
        .is("deleted_at", null)
        .order("data_prazo", { nullsFirst: false })
    : { data: [] };
  const tarefas = (data ?? []) as unknown as Tarefa[];

  const hoje = hojeISO();
  const semana = hojeISO(7);
  const grupos: { titulo: string; itens: Tarefa[] }[] = [
    { titulo: "Atrasadas", itens: tarefas.filter((t) => t.data_prazo && t.data_prazo < hoje) },
    { titulo: "Hoje", itens: tarefas.filter((t) => t.data_prazo === hoje) },
    {
      titulo: "Esta semana",
      itens: tarefas.filter((t) => t.data_prazo && t.data_prazo > hoje && t.data_prazo <= semana),
    },
    { titulo: "Depois", itens: tarefas.filter((t) => t.data_prazo && t.data_prazo > semana) },
    { titulo: "Sem prazo", itens: tarefas.filter((t) => !t.data_prazo) },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="font-title text-2xl text-text">Minhas tarefas</h1>
        <p className="text-sm text-text-muted">{tarefas.length} abertas</p>
      </div>

      {tarefas.length === 0 && (
        <div className="rounded-md border border-dashed border-border p-8 text-center">
          <p className="text-sm text-text-muted">Nenhuma tarefa aberta atribuída a você.</p>
          <Link href="/projetos" className="mt-2 inline-block text-sm text-accent hover:underline">
            Ver projetos
          </Link>
        </div>
      )}

      {grupos
        .filter((g) => g.itens.length > 0)
        .map((g) => (
          <section key={g.titulo} className="mb-6">
            <h2
              className={`mb-2 font-title text-lg ${g.titulo === "Atrasadas" ? "text-danger" : "text-text"}`}
            >
              {g.titulo} ({g.itens.length})
            </h2>
            <ul className="divide-y divide-border rounded-md border border-border bg-surface">
              {g.itens.map((t) => (
                <li key={t.id}>
                  <Link
                    href={t.projeto ? `/tarefas?projeto=${t.projeto.id}` : "/tarefas"}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-secondary/50 focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">{t.titulo}</p>
                      <p className="truncate text-xs text-text-muted">{t.projeto?.nome ?? "—"}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-text-muted tabular-nums">
                      <p>{statusLabels[t.status] ?? t.status}</p>
                      {t.data_prazo && <p>{formatDataISO(t.data_prazo)}</p>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}
