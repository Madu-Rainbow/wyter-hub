export const PAPEIS = ["diretor", "consultor", "analista", "convidado"] as const;
export const CLIENTE_STATUS = ["ativo", "inativo", "arquivado"] as const;
export const PAPEL_NO_CLIENTE = [
  "decisor",
  "operacional",
  "fornecedor",
  "contador",
  "advogado",
] as const;
export const PROJETO_TIPOS = ["continuo", "pontual"] as const;
export const PROJETO_STATUS = [
  "planejado",
  "em_andamento",
  "pausado",
  "concluido",
  "cancelado",
] as const;
export const PRIORIDADES = ["critica", "alta", "media", "baixa"] as const;
export const TAREFA_STATUS = [
  "backlog",
  "a_fazer",
  "em_andamento",
  "aguardando",
  "revisao",
  "concluida",
  "cancelada",
] as const;
export const ORIGENS = ["ui", "trello", "email", "drive", "mcp", "ia"] as const;
export const APROVACAO_STATUS = ["pendente", "aprovada", "recusada"] as const;
export const TREINAMENTO_DIRETORIA = ["nao_iniciado", "em_andamento", "concluido"] as const;
export const DOSSIE_TIPOS = [
  "fato",
  "decisao",
  "restricao",
  "sistema",
  "glossario",
  "pessoa_chave",
] as const;
export const DOSSIE_CONFIANCA = ["fato", "a_confirmar"] as const;
export const ESCOPO_EXTRA_STATUS = ["proposto", "aprovado", "recusado", "faturado"] as const;
