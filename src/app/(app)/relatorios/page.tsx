import { PeriodoNav } from "@front/components/registro/periodo-nav";
import { ehGestor } from "@front/lib/papel";
import {
  carregarAbertas,
  carregarNomes,
  carregarTarefas,
  chaveDe,
  descreve,
  EV_COLUNAS,
  type Ev,
  mascarar,
  resolvePeriodo,
  type TarefaInfo,
} from "@front/lib/registro";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { formatDataISO, hojeISO } from "@front/lib/tarefas";
import { trabalhoHref } from "@front/lib/trabalho";
import Link from "next/link";
import { redirect } from "next/navigation";

const sel = "h-9 rounded-md border border-input bg-surface px-2 text-sm";

function Tarefa({ t, extra }: { t: TarefaInfo | undefined; extra?: string }) {
  if (!t) return <li className="text-text-muted">(tarefa removida)</li>;
  return (
    <li className="text-sm">
      <Link href={trabalhoHref({ tarefa: chaveDe(t) })} className="text-accent hover:underline">
        {chaveDe(t)} {mascarar(t.titulo)}
      </Link>
      {extra && <span className="text-text-muted"> {extra}</span>}
    </li>
  );
}

function Coluna({ titulo, n, children }: { titulo: string; n: number; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <h4 className="mb-1 text-xs font-medium uppercase tracking-wider text-text-muted">
        {titulo} <span className="tabular-nums">({n})</span>
      </h4>
      {n === 0 ? (
        <p className="text-sm text-text-muted">Nada</p>
      ) : (
        <ul className="space-y-1">{children}</ul>
      )}
    </div>
  );
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; data?: string; cliente?: string; pessoa?: string }>;
}) {
  const sp = await searchParams;
  const { p, ref, dias, ini, fim } = resolvePeriodo(sp.periodo, sp.data);
  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: eu } = await sb
    .from("pessoa")
    .select("id, papel")
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!eu || eu.papel === "convidado") redirect("/painel");

  const gestor = ehGestor(eu.papel);
  // Analista só vê o que ele próprio fez.
  const pessoaF = gestor ? sp.pessoa || undefined : eu.id;
  const clienteF = sp.cliente || undefined;

  let q = sb
    .from("evento")
    .select(EV_COLUNAS)
    .eq("entidade", "tarefa")
    .gte("quando", ini)
    .lt("quando", fim)
    .order("quando", { ascending: true })
    .limit(3000);
  if (pessoaF) q = q.eq("quem_id", pessoaF);
  if (clienteF) q = q.eq("cliente_id", clienteF);
  const { data } = await q;
  const eventos = (data ?? []) as unknown as Ev[];

  const [tarefas, nomes, abertasTodas] = await Promise.all([
    carregarTarefas(sb, [...new Set(eventos.map((e) => e.entidade_id))]),
    carregarNomes(sb),
    carregarAbertas(sb, pessoaF),
  ]);
  const hoje = hojeISO();
  const abertas = abertasTodas.filter((t) => !clienteF || t.cliente_id === clienteF);
  const bloqueadas = abertas.filter(
    (t) => t.status === "aguardando" || (t.data_prazo && t.data_prazo < hoje),
  );

  const cidDe = (e: Ev) => e.cliente_id ?? tarefas.get(e.entidade_id)?.cliente_id ?? "";
  const cids = new Set<string>([
    ...eventos.map(cidDe),
    ...bloqueadas.map((t) => t.cliente_id ?? ""),
  ]);
  const nome = (id: string) => nomes.pessoas.get(id) ?? "?";

  // Opções de filtro: analista só vê clientes em que atua.
  const doAnalista = new Set([...abertasTodas.map((t) => t.cliente_id), ...eventos.map(cidDe)]);
  const opcClientes = [...nomes.clientes]
    .filter(([id]) => gestor || doAnalista.has(id))
    .sort((a, b) => a[1].localeCompare(b[1]));
  const opcPessoas = [...nomes.pessoas].sort((a, b) => a[1].localeCompare(b[1]));
  const extra = { cliente: clienteF, pessoa: gestor ? pessoaF : undefined };

  return (
    <div className="flex h-[calc(100dvh-5rem)] min-h-0 flex-col gap-3 sm:h-[calc(100dvh-5.5rem)] lg:h-[calc(100dvh-3rem)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-title text-2xl text-text">Relatórios</h1>
          <p className="text-sm tabular-nums text-text-muted">
            {dias === 7 ? `Semana até ${formatDataISO(ref)}` : formatDataISO(ref)} ·{" "}
            {eventos.length} eventos
          </p>
        </div>
        <PeriodoNav base="/relatorios" periodo={p} data={ref} extra={extra} />
      </div>

      <form action="/relatorios" className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="periodo" value={p} />
        <input type="hidden" name="data" value={ref} />
        <select name="cliente" defaultValue={clienteF ?? ""} aria-label="Cliente" className={sel}>
          <option value="">Todos os clientes</option>
          {opcClientes.map(([id, n]) => (
            <option key={id} value={id}>
              {n}
            </option>
          ))}
        </select>
        {gestor && (
          <select name="pessoa" defaultValue={pessoaF ?? ""} aria-label="Pessoa" className={sel}>
            <option value="">Todas as pessoas</option>
            {opcPessoas.map(([id, n]) => (
              <option key={id} value={id}>
                {n}
              </option>
            ))}
          </select>
        )}
        <button
          type="submit"
          className="h-9 rounded-md border border-border bg-surface px-3 text-sm hover:bg-secondary"
        >
          Filtrar
        </button>
      </form>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {cids.size === 0 && (
          <p className="p-4 text-sm text-text-muted">Nada a relatar no período.</p>
        )}
        {[...cids]
          .sort((a, b) =>
            (nomes.clientes.get(a) ?? "~").localeCompare(nomes.clientes.get(b) ?? "~"),
          )
          .map((cid) => {
            const evs = eventos.filter((e) => cidDe(e) === cid);
            const entregues = evs.filter((e) => e.verbo === "concluiu");
            const feitas = new Set(entregues.map((e) => e.entidade_id));
            const porTarefa = new Map<string, Ev[]>();
            for (const e of evs)
              if (e.verbo !== "concluiu" && !feitas.has(e.entidade_id))
                porTarefa.set(e.entidade_id, [...(porTarefa.get(e.entidade_id) ?? []), e]);
            const bloq = bloqueadas.filter((t) => (t.cliente_id ?? "") === cid);
            return (
              <section key={cid} className="rounded-md border border-border bg-surface p-4">
                <h2 className="mb-3 font-title text-lg text-text">
                  {nomes.clientes.get(cid) ?? "Sem cliente"}
                </h2>
                <div className="grid gap-4 md:grid-cols-3">
                  <Coluna titulo="Entregue" n={entregues.length}>
                    {entregues.map((e) => (
                      <Tarefa
                        key={e.id}
                        t={tarefas.get(e.entidade_id)}
                        extra={`- ${nome(e.quem_id)}`}
                      />
                    ))}
                  </Coluna>
                  <Coluna titulo="Andou" n={porTarefa.size}>
                    {[...porTarefa].map(([tid, es]) => (
                      <Tarefa
                        key={tid}
                        t={tarefas.get(tid)}
                        extra={`- ${[...new Set(es.map((e) => `${nome(e.quem_id)} ${descreve(e, nomes.pessoas)}`))].join("; ")}`}
                      />
                    ))}
                  </Coluna>
                  <Coluna titulo="Bloqueado ou atrasado" n={bloq.length}>
                    {bloq.map((t) => (
                      <Tarefa
                        key={t.id}
                        t={t}
                        extra={`- ${t.status === "aguardando" ? "aguardando" : `prazo ${formatDataISO(t.data_prazo ?? "")}`}${t.responsavel_id ? `, ${nome(t.responsavel_id)}` : ""}`}
                      />
                    ))}
                  </Coluna>
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );
}
