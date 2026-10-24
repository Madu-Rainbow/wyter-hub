import { PainelInterativo, type TarefaR } from "@front/components/painel/painel-interativo";
import { selDeParams } from "@front/lib/painel-sel";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { ABERTAS, hojeISO, statusLabels } from "@front/lib/tarefas";
import Link from "next/link";
import { redirect } from "next/navigation";

type SP = Record<string, string | undefined>;

const PRIORIDADES: [string, string][] = [
  ["critica", "Crítica"],
  ["alta", "Alta"],
  ["media", "Média"],
  ["baixa", "Baixa"],
];
const PROJ_STATUS: [string, string][] = [
  ["planejado", "Planejado"],
  ["em_andamento", "Em andamento"],
  ["pausado", "Pausado"],
  ["concluido", "Concluído"],
  ["cancelado", "Cancelado"],
];
const SITUACOES: [string, string][] = [
  ["em_andamento", "Em andamento"],
  ["entregue", "Entregue"],
  ["sem_projeto", "Sem projeto"],
  ["encerrado", "Encerrado"],
];
const TAREFA_STATUS = [
  "backlog",
  "a_fazer",
  "em_andamento",
  "aguardando",
  "revisao",
  "concluida",
  "cancelada",
];

function segundaDe(d: Date) {
  const r = new Date(d);
  r.setUTCHours(0, 0, 0, 0);
  r.setUTCDate(r.getUTCDate() - ((r.getUTCDay() + 6) % 7));
  return r;
}

export default async function PainelPage({ searchParams }: { searchParams: Promise<SP> }) {
  const f = await searchParams;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: eu } = await supabase
    .from("pessoa")
    .select("nome, papel")
    .eq("auth_user_id", user.id)
    .single();
  const papel = eu?.papel ?? "analista";
  const gestor = papel === "diretor" || papel === "consultor";
  const hoje = hojeISO();

  // Tarefas: filtros globais; RLS limita ao que o usuário pode ver.
  let qt = supabase
    .from("tarefa")
    .select(
      "id, status, prioridade, responsavel_id, projeto_id, estimativa_horas, data_prazo, updated_at, created_at, projeto:projeto_id!inner(cliente_id)",
    )
    .is("deleted_at", null)
    .limit(5000);
  if (f.projeto) qt = qt.eq("projeto_id", f.projeto);
  if (f.resp) qt = qt.eq("responsavel_id", f.resp);
  if (f.cliente) qt = qt.eq("projeto.cliente_id", f.cliente);
  if (f.de) qt = qt.gte("created_at", f.de);
  if (f.ate) qt = qt.lte("created_at", `${f.ate}T23:59:59`);

  let qp = supabase
    .from("projeto")
    .select("id, status, cliente_id, contrato_id")
    .is("deleted_at", null);
  if (f.cliente) qp = qp.eq("cliente_id", f.cliente);
  if (f.projeto) qp = qp.eq("id", f.projeto);
  if (f.resp) qp = qp.eq("responsavel_id", f.resp);

  let qc = supabase.from("contrato_andamento").select("contrato_id, cliente_id, situacao");
  if (f.cliente) qc = qc.eq("cliente_id", f.cliente);

  let qcl = supabase
    .from("cliente")
    .select("id", { count: "exact", head: true })
    .eq("status", "ativo");
  if (f.cliente) qcl = qcl.eq("id", f.cliente);

  const [
    tarefasR,
    projetosR,
    contratosR,
    clientesR,
    pessoasR,
    listaClientesR,
    listaProjetosR,
    aprovR,
    valoresR,
  ] = await Promise.all([
    qt,
    qp,
    qc,
    qcl,
    supabase
      .from("pessoa")
      .select("id, nome, capacidade_semanal_horas")
      .eq("ativo", true)
      .is("deleted_at", null)
      .order("nome"),
    supabase
      .from("cliente")
      .select("id, razao_social, nome_fantasia")
      .is("deleted_at", null)
      .order("razao_social"),
    supabase.from("projeto").select("id, nome").is("deleted_at", null).order("nome"),
    supabase
      .from("aprovacao")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendente"),
    gestor
      ? supabase.from("contrato_financeiro" as never).select("contrato_id, valor")
      : Promise.resolve({ data: null }),
  ]);

  const LIMITE = 5000;
  const tarefasRaw = tarefasR.data ?? [];
  const projetos = projetosR.data ?? [];
  const contratos = contratosR.data ?? [];
  const pessoas = pessoasR.data ?? [];
  const base = { cliente: f.cliente, projeto: f.projeto, resp: f.resp, de: f.de, ate: f.ate };

  // Últimas 8 semanas; updated_at serve de data de conclusão.
  const seg0 = segundaDe(new Date());
  const semanas = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(seg0);
    d.setUTCDate(d.getUTCDate() - (7 - i) * 7);
    return d;
  });
  const semanaDe = (iso: string) => {
    const u = new Date(iso).getTime();
    const i = semanas.findIndex(
      (d, k) => u >= d.getTime() && u < (k === 7 ? Infinity : semanas[k + 1].getTime()),
    );
    return i < 0 ? null : semanas[i].toISOString();
  };

  const tarefas: TarefaR[] = tarefasRaw.map((t) => ({
    s: t.status,
    p: t.prioridade,
    r: t.responsavel_id,
    pj: t.projeto_id,
    e: t.estimativa_horas ?? 0,
    sem: t.status === "concluida" ? semanaDe(t.updated_at) : null,
    aberta: (ABERTAS as string[]).includes(t.status),
    atr: !!t.data_prazo && t.data_prazo < hoje,
  }));
  const valores = new Map(
    ((valoresR.data ?? []) as unknown as { contrato_id: string; valor: number | null }[]).map(
      (c) => [c.contrato_id, c.valor],
    ),
  );
  const cats = {
    status: TAREFA_STATUS.map((k) => ({ key: k, label: statusLabels[k] ?? k })),
    prio: PRIORIDADES.map(([key, label]) => ({ key, label })),
    pst: PROJ_STATUS.map(([key, label]) => ({ key, label })),
    sit: SITUACOES.map(([key, label]) => ({ key, label })),
  };

  const sel = "rounded border border-border bg-surface px-2 py-1 text-sm text-text";

  return (
    <div className="flex flex-col lg:h-full lg:min-h-0">
      <h1 className="font-title text-xl text-text">Painel</h1>
      <p className="mb-2 text-sm text-text-muted">
        {eu?.nome ?? "Usuário"} · <span className="capitalize">{papel}</span>
      </p>

      <form className="mb-3 flex flex-wrap items-end gap-3 text-xs text-text-muted" method="get">
        <label className="flex flex-col gap-1">
          Cliente
          <select name="cliente" defaultValue={f.cliente ?? ""} className={sel}>
            <option value="">Todos</option>
            {(listaClientesR.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome_fantasia ?? c.razao_social}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Projeto
          <select name="projeto" defaultValue={f.projeto ?? ""} className={sel}>
            <option value="">Todos</option>
            {(listaProjetosR.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Responsável
          <select name="resp" defaultValue={f.resp ?? ""} className={sel}>
            <option value="">Todos</option>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Criadas de
          <input type="date" name="de" defaultValue={f.de ?? ""} className={sel} />
        </label>
        <label className="flex flex-col gap-1">
          até
          <input type="date" name="ate" defaultValue={f.ate ?? ""} className={sel} />
        </label>
        <button
          type="submit"
          className="rounded bg-accent px-3 py-1.5 text-sm text-accent-foreground hover:bg-accent-hover"
        >
          Aplicar
        </button>
        <Link href="/painel" className="px-2 py-1.5 text-sm text-text-muted underline">
          Limpar
        </Link>
      </form>

      <PainelInterativo
        tarefas={tarefas}
        projetos={projetos.map((x) => ({
          id: x.id,
          st: x.status,
          cl: x.cliente_id,
          ct: x.contrato_id,
        }))}
        contratos={contratos
          .filter((c) => c.contrato_id && c.situacao)
          .map((c) => ({
            id: c.contrato_id as string,
            sit: c.situacao as string,
            valor: gestor ? (valores.get(c.contrato_id as string) ?? null) : null,
          }))}
        clientesAtivos={clientesR.count ?? 0}
        aprovacoes={aprovR.count ?? 0}
        gestor={gestor}
        pessoas={pessoas.map((x) => ({
          key: x.id,
          label: x.nome,
          cap: x.capacidade_semanal_horas,
        }))}
        semanas={semanas.map((d) => {
          const [, m, dia] = d.toISOString().slice(0, 10).split("-");
          return { key: d.toISOString(), label: `${dia}/${m}` };
        })}
        cats={cats}
        selInicial={selDeParams(f)}
        base={base}
        truncado={tarefasRaw.length >= LIMITE}
      />
    </div>
  );
}
