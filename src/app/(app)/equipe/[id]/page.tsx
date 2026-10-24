import { Flash } from "@front/components/flash";
import { Button } from "@front/components/ui/button";
import { Input } from "@front/components/ui/input";
import { Label } from "@front/components/ui/label";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { ABERTAS, formatDataISO, hojeISO, statusLabels } from "@front/lib/tarefas";
import { ArrowLeft } from "lucide-react";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type Tarefa = {
  id: string;
  titulo: string;
  status: string;
  data_prazo: string | null;
  estimativa_horas: number | null;
  projeto: { id: string; nome: string } | null;
};

export default async function PessoaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { id } = await params;
  const { ok, erro } = await searchParams;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: eu }, { data: p }] = await Promise.all([
    supabase.from("pessoa").select("papel").eq("auth_user_id", user.id).single(),
    supabase
      .from("pessoa")
      .select("id, nome, email, papel, cargo, ativo, capacidade_semanal_horas")
      .eq("id", id)
      .is("deleted_at", null)
      .single(),
  ]);
  if (!p) notFound();
  const isDiretor = eu?.papel === "diretor";

  const [{ data: clientes }, { data }] = await Promise.all([
    supabase
      .from("cliente")
      .select("id, nome_fantasia, razao_social")
      .eq("responsavel_id", id)
      .is("deleted_at", null)
      .order("nome_fantasia"),
    supabase
      .from("tarefa")
      .select("id, titulo, status, data_prazo, estimativa_horas, projeto:projeto_id(id, nome)")
      .eq("responsavel_id", id)
      .in("status", ABERTAS)
      .is("deleted_at", null)
      .order("data_prazo", { nullsFirst: false }),
  ]);
  const tarefas = (data ?? []) as unknown as Tarefa[];

  const porProjeto = new Map<string, { nome: string; itens: Tarefa[] }>();
  for (const t of tarefas) {
    const k = t.projeto?.id ?? "-";
    if (!porProjeto.has(k))
      porProjeto.set(k, { nome: t.projeto?.nome ?? "Sem projeto", itens: [] });
    porProjeto.get(k)?.itens.push(t);
  }

  const horas = tarefas.reduce((s, t) => s + Number(t.estimativa_horas ?? 0), 0);
  const cap = p.capacidade_semanal_horas;
  const pct = cap ? Math.round((horas / cap) * 100) : null;
  const hoje = hojeISO();

  async function salvar(formData: FormData) {
    "use server";
    const sb = await createSupabaseServer();
    const {
      data: { user: u },
    } = await sb.auth.getUser();
    const volta = (q: string) => redirect(`/equipe/${id}?${q}`);
    if (!u) redirect("/login");
    const { data: me } = await sb.from("pessoa").select("papel").eq("auth_user_id", u.id).single();
    if (me?.papel !== "diretor")
      volta(`erro=${encodeURIComponent("Somente diretor pode editar.")}`);

    const capRaw = String(formData.get("capacidade") ?? "").trim();
    const capacidade = capRaw === "" ? null : Number(capRaw);
    if (
      capacidade !== null &&
      (!Number.isInteger(capacidade) || capacidade < 0 || capacidade > 168)
    )
      volta(`erro=${encodeURIComponent("Capacidade inválida (0 a 168 horas).")}`);

    const { error } = await sb
      .from("pessoa")
      .update({
        cargo: String(formData.get("cargo") ?? "").trim() || null,
        capacidade_semanal_horas: capacidade,
        ativo: formData.get("ativo") === "on",
      })
      .eq("id", id);
    if (error) volta(`erro=${encodeURIComponent("Não foi possível salvar.")}`);
    revalidatePath(`/equipe/${id}`);
    revalidatePath("/equipe");
    volta(`ok=${encodeURIComponent("Dados salvos.")}`);
  }

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-2 gap-1.5 text-text-muted" asChild>
        <Link href="/equipe">
          <ArrowLeft className="size-3.5" />
          Equipe
        </Link>
      </Button>
      <Flash ok={ok} erro={erro} />
      <div className="mb-6">
        <h1 className="font-title text-2xl text-text">{p.nome}</h1>
        <p className="text-sm text-text-muted">
          {p.cargo ? `${p.cargo} · ` : ""}
          {p.email} · <span className="capitalize">{p.papel}</span>
          {!p.ativo && " · Inativo"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-title text-lg text-text">Carga semanal</h2>
          <div className="rounded-md border border-border bg-surface p-4">
            <p className="text-sm text-text tabular-nums">
              {horas}h estimadas abertas{" "}
              {cap != null ? `de ${cap}h/semana` : "(capacidade não definida)"}
              {pct != null && ` (${pct}%)`}
            </p>
            {pct != null && (
              <div
                className="mt-2 h-2 rounded bg-secondary"
                role="progressbar"
                aria-valuenow={Math.min(pct, 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`h-2 rounded ${pct > 100 ? "bg-danger" : "bg-accent"}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            )}
            <p className="mt-2 text-xs text-text-muted">{tarefas.length} tarefas abertas</p>
          </div>

          {isDiretor && (
            <form
              action={salvar}
              className="mt-4 space-y-3 rounded-md border border-border bg-surface p-4"
            >
              <h3 className="text-sm font-medium text-text">Editar</h3>
              <div className="space-y-1">
                <Label htmlFor="cargo">Cargo</Label>
                <Input id="cargo" name="cargo" defaultValue={p.cargo ?? ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="capacidade">Capacidade semanal (horas)</Label>
                <Input
                  id="capacidade"
                  name="capacidade"
                  type="number"
                  min={0}
                  max={168}
                  defaultValue={cap ?? ""}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  name="ativo"
                  defaultChecked={p.ativo}
                  className="size-4 accent-[#1b2a4a]"
                />
                Ativo
              </label>
              <Button type="submit" size="sm">
                Salvar
              </Button>
            </form>
          )}

          <h2 className="mb-3 mt-6 font-title text-lg text-text">
            Clientes sob responsabilidade ({clientes?.length ?? 0})
          </h2>
          <div className="space-y-2">
            {clientes?.map((c) => (
              <Link
                key={c.id}
                href={`/clientes/${c.id}`}
                className="block rounded-md border border-border bg-surface p-3 text-sm text-text transition-colors hover:border-accent/30 hover:bg-secondary/40"
              >
                {c.nome_fantasia || c.razao_social}
              </Link>
            ))}
            {!clientes?.length && <p className="text-sm text-text-muted">Nenhum cliente.</p>}
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-title text-lg text-text">Tarefas abertas ({tarefas.length})</h2>
          {!tarefas.length && <p className="text-sm text-text-muted">Nenhuma tarefa aberta.</p>}
          {[...porProjeto.entries()].map(([pid, g]) => (
            <div key={pid} className="mb-4">
              <h3 className="mb-1 text-sm font-medium">
                {pid === "-" ? (
                  g.nome
                ) : (
                  <Link href={`/trabalho?projeto=${pid}`} className="text-accent hover:underline">
                    {g.nome}
                  </Link>
                )}
              </h3>
              <ul className="divide-y divide-border rounded-md border border-border bg-surface">
                {g.itens.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate text-text">{t.titulo}</span>
                    <span
                      className={`shrink-0 text-xs tabular-nums ${t.data_prazo && t.data_prazo < hoje ? "text-danger" : "text-text-muted"}`}
                    >
                      {statusLabels[t.status]}
                      {t.data_prazo ? ` · ${formatDataISO(t.data_prazo)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
