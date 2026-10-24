import { hojeISO } from "@front/lib/tarefas";

export type ChecklistItem = { id: string; texto: string; feito: boolean };

export type Tarefa = {
  id: string;
  titulo: string;
  descricao: string | null;
  status: string;
  prioridade: string;
  urgencia: number;
  esforco: number;
  data_prazo: string | null;
  data_inicio: string | null;
  estimativa_horas: number | null;
  responsavel_id: string | null;
  categoria: string | null;
  bloqueada_por_id: string | null;
  link_externo: string | null;
  checklist: ChecklistItem[];
  n_comentarios: number;
  responsavel: { nome: string } | null;
  parent_id: string | null;
  projeto_id: string;
  numero: number;
  /** Derivados no cliente (enriquecer): chave FARM-12, caminho e progresso das subtarefas. */
  chave?: string;
  caminho?: string;
  sub?: { feitas: number; total: number };
};

export type ProjetoOpt = {
  id: string;
  nome: string;
  chave: string;
  clienteId: string;
  clienteNome: string;
  contratoId: string | null;
  contratoNome: string | null;
};

export type PessoaOpt = { id: string; nome: string };

export type Ctx = {
  orgId: string;
  /** Projeto definido pelo escopo (null = escopo amplo: exige escolher projeto). */
  projetoId: string | null;
  projetos: ProjetoOpt[];
  meId: string | null;
  readOnly: boolean;
};

export const STATUS_OPTS = [
  ["backlog", "Backlog"],
  ["a_fazer", "A fazer"],
  ["em_andamento", "Em andamento"],
  ["aguardando", "Aguardando"],
  ["revisao", "Revisão"],
  ["concluida", "Concluída"],
  ["cancelada", "Cancelada"],
] as const;

export const PRIORIDADE_OPTS = [
  ["critica", "Crítica"],
  ["alta", "Alta"],
  ["media", "Média"],
  ["baixa", "Baixa"],
] as const;

export const prioridadeLabels: Record<string, string> = Object.fromEntries(PRIORIDADE_OPTS);
export const statusLabels: Record<string, string> = Object.fromEntries(STATUS_OPTS);

export const prioridadeBorder: Record<string, string> = {
  critica: "border-l-red-600",
  alta: "border-l-orange-500",
  media: "border-l-amber-400",
  baixa: "border-l-slate-300",
};

export type Agrupar = "status" | "responsavel" | "prioridade" | "cliente" | "contrato" | "projeto";
export type Visao = "kanban" | "lista" | "tabela" | "gantt";

export type Filtros = {
  busca: string;
  responsavel: string;
  prioridade: string;
  categoria: string;
  atrasadas: boolean;
  minhas: boolean;
  /** "" | "abertas" | um status */
  status: string;
};

export const FILTROS_VAZIOS: Filtros = {
  busca: "",
  responsavel: "",
  prioridade: "",
  categoria: "",
  atrasadas: false,
  minhas: false,
  status: "",
};

export const FECHADAS = ["concluida", "cancelada"];

export function atrasada(t: Pick<Tarefa, "data_prazo" | "status">) {
  return !!t.data_prazo && !FECHADAS.includes(t.status) && t.data_prazo.slice(0, 10) < hojeISO();
}

/** "atrasada" | "proxima" (vence em ate 2 dias) | null */
export function situacaoPrazo(t: Pick<Tarefa, "data_prazo" | "status">) {
  if (!t.data_prazo || FECHADAS.includes(t.status)) return null;
  const d = t.data_prazo.slice(0, 10);
  if (d < hojeISO()) return "atrasada" as const;
  if (d <= hojeISO(2)) return "proxima" as const;
  return null;
}

export function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? (p[p.length - 1][0] ?? "") : "")).toUpperCase();
}

export function filtrar(ts: Tarefa[], f: Filtros, meId: string | null) {
  const q = f.busca.trim().toLowerCase();
  return ts.filter(
    (t) =>
      (!q || t.titulo.toLowerCase().includes(q) || !!t.chave?.toLowerCase().includes(q)) &&
      (!f.responsavel ||
        (f.responsavel === "_none" ? !t.responsavel_id : t.responsavel_id === f.responsavel)) &&
      (!f.status ||
        (f.status === "abertas" ? !FECHADAS.includes(t.status) : t.status === f.status)) &&
      (!f.prioridade || t.prioridade === f.prioridade) &&
      (!f.categoria || t.categoria === f.categoria) &&
      (!f.atrasadas || atrasada(t)) &&
      (!f.minhas || (!!meId && t.responsavel_id === meId)),
  );
}

export type Grupo = { key: string; label: string; items: Tarefa[] };

export function agrupar(
  ts: Tarefa[],
  por: Agrupar,
  pessoas: PessoaOpt[],
  todasColunas: boolean,
  projetos: ProjetoOpt[] = [],
): Grupo[] {
  const proj = new Map(projetos.map((p) => [p.id, p]));
  const hier = (t: Tarefa): [string, string] => {
    const p = proj.get(t.projeto_id);
    if (por === "cliente") return [p?.clienteId ?? "_none", p?.clienteNome ?? "Sem cliente"];
    if (por === "contrato") return [p?.contratoId ?? "_none", p?.contratoNome ?? "Sem contrato"];
    return [t.projeto_id, p ? `${p.chave} · ${p.nome}` : "Sem projeto"];
  };
  const hierarquico = por === "cliente" || por === "contrato" || por === "projeto";
  const defs: [string, string][] = hierarquico
    ? [...new Map(ts.map(hier)).entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))
    : por === "status"
      ? STATUS_OPTS.filter(([k]) => todasColunas || k !== "cancelada").map(([k, l]) => [k, l])
      : por === "prioridade"
        ? PRIORIDADE_OPTS.map(([k, l]) => [k, l])
        : [["_none", "Sem responsável"], ...pessoas.map((p): [string, string] => [p.id, p.nome])];
  const keyOf = (t: Tarefa) =>
    hierarquico
      ? hier(t)[0]
      : por === "status"
        ? t.status
        : por === "prioridade"
          ? t.prioridade
          : (t.responsavel_id ?? "_none");
  return defs.map(([key, label]) => ({
    key,
    label,
    items: ts
      .filter((t) => keyOf(t) === key)
      .sort((a, b) => b.urgencia - a.urgencia || b.esforco - a.esforco),
  }));
}

/** Patch de campo correspondente ao agrupamento ao soltar numa coluna. */
export function patchDoGrupo(por: Agrupar, key: string): Partial<Tarefa> {
  if (por === "status") return { status: key };
  if (por === "prioridade") return { prioridade: key };
  if (por === "projeto") return { projeto_id: key };
  if (por === "cliente" || por === "contrato") return {};
  return { responsavel_id: key === "_none" ? null : key };
}

/** Preenche chave, caminho e progresso de subtarefas a partir da lista de projetos. */
export function enriquecer(ts: Tarefa[], projetos: ProjetoOpt[]): Tarefa[] {
  const proj = new Map(projetos.map((p) => [p.id, p]));
  const sub = new Map<string, { feitas: number; total: number }>();
  for (const t of ts) {
    if (!t.parent_id) continue;
    const s = sub.get(t.parent_id) ?? { feitas: 0, total: 0 };
    s.total++;
    if (t.status === "concluida") s.feitas++;
    sub.set(t.parent_id, s);
  }
  return ts.map((t) => {
    const p = proj.get(t.projeto_id);
    return {
      ...t,
      chave: p ? `${p.chave}-${t.numero}` : String(t.numero),
      caminho: p ? [p.clienteNome, p.contratoNome ?? "Sem contrato", p.nome].join(" / ") : "",
      sub: sub.get(t.id),
    };
  });
}
