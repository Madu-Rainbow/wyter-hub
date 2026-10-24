import { ContatoForm } from "@front/components/clientes/contato-form";
import { DossieSheet } from "@front/components/clientes/dossie-sheet";
import { Button } from "@front/components/ui/button";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { ABERTAS, formatDataISO, statusLabels } from "@front/lib/tarefas";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { adicionarContato, adicionarDossie } from "./actions";

export default async function ClienteDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cliente } = await supabase
    .from("cliente")
    .select("*, responsavel:responsavel_id(nome)")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!cliente) notFound();
  const { data: eu } = await supabase
    .from("pessoa")
    .select("papel")
    .eq("auth_user_id", user.id)
    .single();
  const pessoaPapel = eu?.papel;

  const [
    { data: projetos },
    { data: contratos },
    { data: dossies },
    { data: contatos },
    { data: tarefasRaw },
  ] = await Promise.all([
    supabase
      .from("projeto")
      .select("id, nome, status, tipo, frente, responsavel:responsavel_id(nome)")
      .eq("cliente_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("contrato")
      .select("id, tipo, numero, valor, vigencia_inicio, vigencia_fim")
      .eq("cliente_id", id)
      .is("deleted_at", null)
      .order("vigencia_inicio", { ascending: false }),
    supabase
      .from("dossie_cliente")
      .select("id, tipo, conteudo, fonte, confianca, created_at")
      .eq("cliente_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("contato_cliente")
      .select("id, nome, email, telefone, papel_no_cliente")
      .eq("cliente_id", id)
      .is("deleted_at", null)
      .order("nome"),
    supabase
      .from("tarefa")
      .select("id, titulo, status, data_prazo, projeto:projeto_id!inner(id, nome, cliente_id)")
      .eq("projeto.cliente_id", id)
      .in("status", ABERTAS)
      .is("deleted_at", null)
      .order("data_prazo", { nullsFirst: false })
      .limit(30),
  ]);
  const tarefas = (tarefasRaw ?? []) as unknown as {
    id: string;
    titulo: string;
    status: string;
    data_prazo: string | null;
    projeto: { id: string; nome: string };
  }[];
  const RET = /^\[Retificação:([0-9a-f-]{36})\]\s*/;
  const retificadas = new Set(
    (dossies ?? []).map((d) => RET.exec(d.conteudo)?.[1]).filter(Boolean),
  );
  const podeEditar = ["diretor", "consultor"].includes(pessoaPapel ?? "");
  const addContato = adicionarContato.bind(null, id);
  const addDossie = adicionarDossie.bind(null, id);

  return (
    <div>
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="mb-2 gap-1.5 text-text-muted" asChild>
          <Link href="/clientes">
            <ArrowLeft className="size-3.5" />
            Clientes
          </Link>
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-title text-2xl text-text">
              {cliente.nome_fantasia || cliente.razao_social}
            </h1>
            {cliente.nome_fantasia && (
              <p className="text-sm text-text-muted">{cliente.razao_social}</p>
            )}
            <div className="mt-1 flex gap-3 text-sm text-text-muted">
              {cliente.segmento && <span>{cliente.segmento}</span>}
              {cliente.cidade && (
                <span>
                  {cliente.cidade}/{cliente.uf}
                </span>
              )}
              <span>
                Responsável:{" "}
                {(cliente.responsavel as unknown as { nome: string } | null)?.nome ?? "—"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5 text-text-muted" asChild>
              <Link href={`/clientes/${id}/editar`}>
                <Pencil className="size-3.5" />
                Editar
              </Link>
            </Button>
            <StatusBadge status={cliente.status} />
          </div>
        </div>
        {cliente.tags && cliente.tags.length > 0 && (
          <div className="mt-2 flex gap-1.5">
            {cliente.tags.map((tag: string) => (
              <span key={tag} className="rounded bg-secondary px-2 py-0.5 text-xs text-text-muted">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Projetos */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-title text-lg text-text">Projetos ({projetos?.length ?? 0})</h2>
            <Button variant="ghost" size="sm" className="gap-1 text-text-muted" asChild>
              <Link href={`/projetos/novo?cliente=${id}`}>
                <Plus className="size-3.5" />
                Novo
              </Link>
            </Button>
          </div>
          <div className="space-y-2">
            {projetos?.map((p) => (
              <Link
                key={p.id}
                href={`/projetos/${p.id}`}
                className="block rounded-md border border-border bg-surface p-3 transition-colors hover:border-accent/30"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-text">{p.nome}</span>
                  <ProjetoStatusBadge status={p.status} />
                </div>
                <div className="mt-1 flex gap-3 text-xs text-text-muted">
                  {p.frente && <span>{p.frente}</span>}
                  <span>{p.tipo === "continuo" ? "Contínuo" : "Pontual"}</span>
                  <span>{(p.responsavel as unknown as { nome: string } | null)?.nome ?? "—"}</span>
                </div>
              </Link>
            ))}
            {(!projetos || projetos.length === 0) && (
              <p className="text-sm text-text-muted">
                Nenhum projeto.{" "}
                <Link href={`/projetos/novo?cliente=${id}`} className="text-accent hover:underline">
                  Criar o primeiro
                </Link>
              </p>
            )}
          </div>
        </section>

        {/* Contratos */}
        <section>
          <h2 className="mb-3 font-title text-lg text-text">
            Contratos ({contratos?.length ?? 0})
          </h2>
          <div className="space-y-2">
            {contratos?.map((ct) => (
              <Link
                key={ct.id}
                href={`/contratos/${ct.id}`}
                className="block rounded-md border border-border bg-surface p-3 transition-colors hover:border-accent/30 hover:bg-secondary/40"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-text">{ct.tipo}</span>
                  {ct.numero && <span className="text-xs text-text-muted">{ct.numero}</span>}
                </div>
                <div className="mt-1 flex gap-3 text-xs text-text-muted">
                  {ct.valor != null && (
                    <span>R$ {ct.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  )}
                  <span>
                    {formatDate(ct.vigencia_inicio)}
                    {ct.vigencia_fim ? ` — ${formatDate(ct.vigencia_fim)}` : " — em aberto"}
                  </span>
                </div>
              </Link>
            ))}
            {(!contratos || contratos.length === 0) && (
              <p className="text-sm text-text-muted">
                Nenhum contrato.{" "}
                <Link href="/contratos" className="text-accent hover:underline">
                  Ver contratos
                </Link>
              </p>
            )}
          </div>
        </section>

        {/* Contatos */}
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between">
            <h2 className="font-title text-lg text-text">Contatos ({contatos?.length ?? 0})</h2>
            {podeEditar && <ContatoForm action={addContato} />}
          </div>
          <div className="space-y-2">
            {contatos?.map((ct) => (
              <div key={ct.id} className="rounded-md border border-border bg-surface p-3 text-sm">
                <p className="font-medium text-text">
                  {ct.nome}
                  {ct.papel_no_cliente && (
                    <span className="ml-2 text-xs font-normal capitalize text-text-muted">
                      {ct.papel_no_cliente}
                    </span>
                  )}
                </p>
                <p className="text-xs text-text-muted">
                  {ct.email && (
                    <a href={`mailto:${ct.email}`} className="hover:text-accent">
                      {ct.email}
                    </a>
                  )}
                  {ct.email && ct.telefone && " · "}
                  {ct.telefone}
                </p>
              </div>
            ))}
            {!contatos?.length && (
              <p className="text-sm text-text-muted">Nenhum contato cadastrado.</p>
            )}
          </div>
        </section>

        {/* Tarefas abertas */}
        <section>
          <h2 className="mb-3 font-title text-lg text-text">Tarefas abertas ({tarefas.length})</h2>
          <ul className="divide-y divide-border rounded-md border border-border bg-surface">
            {tarefas.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/projetos/${t.projeto.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors hover:bg-secondary/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-text">{t.titulo}</span>
                    <span className="block truncate text-xs text-text-muted">{t.projeto.nome}</span>
                  </span>
                  <span className="shrink-0 text-xs text-text-muted tabular-nums">
                    {statusLabels[t.status]}
                    {t.data_prazo ? ` · ${formatDataISO(t.data_prazo)}` : ""}
                  </span>
                </Link>
              </li>
            ))}
            {!tarefas.length && (
              <li className="px-3 py-3 text-sm text-text-muted">Nenhuma tarefa aberta.</li>
            )}
          </ul>
        </section>

        {/* Dossiê */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-title text-lg text-text">Dossiê ({dossies?.length ?? 0})</h2>
            {pessoaPapel !== "convidado" && <DossieSheet action={addDossie} />}
          </div>
          <div className="space-y-2">
            {dossies?.map((d) => {
              const orig = RET.exec(d.conteudo)?.[1];
              const texto = d.conteudo.replace(RET, "");
              return (
                <div
                  key={d.id}
                  className={`rounded-md border border-border bg-surface p-3 ${retificadas.has(d.id) ? "opacity-70" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <DossieTipoBadge tipo={d.tipo} />
                    {orig && <span className="text-xs text-accent">Retificação</span>}
                    {retificadas.has(d.id) && (
                      <span className="text-xs text-text-muted">Retificada</span>
                    )}
                    <span className="ml-auto flex items-center gap-2">
                      <span className="text-xs text-text-muted tabular-nums">
                        {formatDate(d.created_at)}
                      </span>
                      {pessoaPapel !== "convidado" && !orig && !retificadas.has(d.id) && (
                        <DossieSheet
                          action={addDossie}
                          retifica={{ id: d.id, tipo: d.tipo, conteudo: texto }}
                        />
                      )}
                    </span>
                    {d.confianca === "a_confirmar" && (
                      <span className="text-xs text-amber-600">A confirmar</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-text">{texto}</p>
                  {d.fonte && <p className="mt-1 text-xs text-text-muted">Fonte: {d.fonte}</p>}
                </div>
              );
            })}
            {(!dossies || dossies.length === 0) && (
              <p className="text-sm text-text-muted">
                Nenhuma entrada no dossiê. Use "Adicionar entrada" para registrar o primeiro fato.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Cuiaba" });
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ativo: "bg-green-50 text-green-700 border-green-200",
    inativo: "bg-gray-50 text-gray-600 border-gray-200",
    arquivado: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs ${colors[status] ?? colors.inativo}`}
    >
      {status === "ativo" ? "Ativo" : status === "inativo" ? "Inativo" : "Arquivado"}
    </span>
  );
}

function ProjetoStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    em_andamento: "bg-blue-50 text-blue-700",
    planejado: "bg-gray-50 text-gray-600",
    pausado: "bg-amber-50 text-amber-700",
    concluido: "bg-green-50 text-green-700",
    cancelado: "bg-red-50 text-red-600",
  };
  const labels: Record<string, string> = {
    em_andamento: "Em andamento",
    planejado: "Planejado",
    pausado: "Pausado",
    concluido: "Concluído",
    cancelado: "Cancelado",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs ${colors[status] ?? ""}`}>
      {labels[status] ?? status}
    </span>
  );
}

function DossieTipoBadge({ tipo }: { tipo: string }) {
  const labels: Record<string, string> = {
    fato: "Fato",
    decisao: "Decisão",
    restricao: "Restrição",
    sistema: "Sistema",
    glossario: "Glossário",
    pessoa_chave: "Pessoa-chave",
  };
  return (
    <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-text-muted">
      {labels[tipo] ?? tipo}
    </span>
  );
}
