/**
 * Rótulos PT-BR para os verbos e entidades da tabela `evento`.
 * Verbos vêm das migrations (log_evento_*, triggers) e das actions do front.
 * Código sem mapa cai em `humanizar`, nunca aparece cru.
 */

/** Verbos genéricos: a frase ganha o alvo ("Concluiu a tarefa"). */
export const VERBOS_EVENTO: Record<string, string> = {
  criou: "Criou",
  editou: "Editou",
  atualizou: "Atualizou",
  excluiu: "Excluiu",
  restaurou: "Restaurou",
  arquivou: "Arquivou",
  concluiu: "Concluiu",
  reabriu: "Reabriu",
  moveu: "Moveu",
  reatribuiu: "Reatribuiu",
  reagendou: "Reagendou",
  comentou: "Comentou",
  convidou: "Convidou",
  desativou: "Desativou",
  reativou: "Reativou",
};

/** Frases completas: já trazem o objeto, não recebem a entidade. */
export const FRASES_EVENTO: Record<string, string> = {
  moveu_projeto: "Moveu a tarefa para outro projeto",
  repriorizou: "Alterou a prioridade",
  alterou_papel: "Alterou o papel de uma pessoa",
  revogou_convite: "Revogou um convite",
  acessou_sensivel: "Revelou dado sensível",
  gravou_sensivel: "Gravou dado sensível",
  editou_comentario: "Editou um comentário",
  excluiu_comentario: "Excluiu um comentário",
  adicionou_membro: "Adicionou um membro",
  removeu_membro: "Removeu um membro",
  aplicou_etiqueta: "Aplicou uma etiqueta",
  removeu_etiqueta: "Removeu uma etiqueta",
  anexou: "Anexou um arquivo",
  removeu_anexo: "Removeu um anexo",
  criou_checklist: "Criou uma checklist",
  removeu_checklist: "Removeu uma checklist",
  marcou_item: "Marcou um item",
  desmarcou_item: "Desmarcou um item",
  marcou_entrega: "Marcou uma entrega",
  desmarcou_entrega: "Desmarcou uma entrega",
  definiu_lembrete: "Definiu um lembrete",
  removeu_lembrete: "Removeu um lembrete",
  definiu_capa: "Definiu uma capa",
  removeu_capa: "Removeu uma capa",
};

/** Entidade com artigo, pronta para completar a frase genérica. */
export const ENTIDADES_EVENTO: Record<string, string> = {
  tarefa: "a tarefa",
  cliente: "o cliente",
  contrato: "o contrato",
  projeto: "o projeto",
  pessoa: "a pessoa",
  comentario: "o comentário",
  anexo: "o anexo",
  etiqueta: "a etiqueta",
  checklist: "a checklist",
  checklist_item: "o item da checklist",
  dado_sensivel: "dado sensível",
  dossie_cliente: "o dossiê do cliente",
  mcp: "o token MCP",
};

/** Código sem mapa vira texto legível ("foo_bar" -> "Foo bar"). */
export function humanizar(codigo: string) {
  const t = codigo.replace(/_/g, " ").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}

/** Frase PT-BR do evento, ex.: "Concluiu a tarefa". O título ou cliente vem depois, pelo chamador. */
export function rotuloEvento(verbo: string, entidade?: string | null) {
  if (FRASES_EVENTO[verbo]) return FRASES_EVENTO[verbo];
  const v = VERBOS_EVENTO[verbo] ?? humanizar(verbo);
  const e = entidade ? (ENTIDADES_EVENTO[entidade] ?? humanizar(entidade).toLowerCase()) : "";
  return e ? `${v} ${e}` : v;
}
