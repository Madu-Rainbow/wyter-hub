export type TrabalhoParams = Record<string, string | undefined>;

/** Monta /trabalho?cliente=&contrato=&projeto=&aba=&visao=&tarefa= (FR-002-27). */
export function trabalhoHref(p: TrabalhoParams = {}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `/trabalho?${s}` : "/trabalho";
}

export type Nivel = "tudo" | "cliente" | "contrato" | "projeto";

export const ABAS: Record<Nivel, [string, string][]> = {
  tudo: [
    ["geral", "Visão geral"],
    ["tarefas", "Tarefas"],
  ],
  cliente: [
    ["geral", "Visão geral"],
    ["tarefas", "Tarefas"],
    ["projetos", "Projetos"],
    ["contratos", "Contratos"],
    ["dossie", "Dossiê e registros"],
  ],
  contrato: [
    ["geral", "Visão geral"],
    ["tarefas", "Tarefas"],
    ["projetos", "Projetos"],
  ],
  projeto: [
    ["geral", "Visão geral"],
    ["tarefas", "Tarefas"],
  ],
};

/** Sem valor/forma_pagamento: esses vêm de contrato_financeiro (só gestor). */
export const COLUNAS_CONTRATO = "id, tipo, numero, cliente_id, vigencia_inicio, vigencia_fim";

export type ContratoRow = {
  id: string;
  tipo: string;
  numero: string | null;
  cliente_id: string;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  valor?: number | null;
  forma_pagamento?: string | null;
};
