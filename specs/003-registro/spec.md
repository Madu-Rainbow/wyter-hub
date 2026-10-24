# Spec 003 — Registro (logs de atividade e relatórios diários)

## Log automático de atividade

- **FR-003-01**: Toda conclusão de tarefa, mudança de status/posição no kanban, reatribuição, mudança de prazo ou de prioridade, criação, exclusão e comentário DEVE gerar um evento (`evento`, append-only) com: quem, quando (UTC, exibido em America/Cuiaba), tarefa, projeto, contrato, cliente, verbo (`concluiu`, `moveu`, `reatribuiu`, `reagendou`, `repriorizou`, `criou`, `excluiu`, `comentou`), antes/depois (sem campos financeiros) e origem (`ui`, `mcp`, `importador`, `sistema`).
- **FR-003-02**: O log DEVE ser garantido no banco por trigger em `tarefa` (insert/update/soft delete), para valer para qualquer origem (UI, agente de IA, importador) e não depender do front. A UI deixa de gravar esses eventos à mão para evitar duplicidade. O trigger obtém o autor de `pessoa.auth_user_id = auth.uid()`; sem autor identificado, grava origem `sistema`.
- **FR-003-03**: Um evento `concluiu` é gerado quando o status passa a `concluida`; reabrir gera `reabriu`. Mover entre colunas gera `moveu` com `antes.status` e `depois.status`.
- **FR-003-04**: Eventos carregam `cliente_id`, `projeto_id` e `contrato_id` (denormalizados) para consultas por pessoa+dia e cliente+dia sem junções pesadas; índices em (quem_id, quando), (cliente_id, quando), (projeto_id, quando).
- **FR-003-05**: Valores financeiros (valor, forma de pagamento, impacto) NUNCA entram em `antes/depois`.

## Relatório diário (base)

- **FR-003-06**: Visão "Meu dia" por pessoa e por dia: lista cronológica dos eventos do usuário (concluídas, movidas, comentadas) agrupada por cliente e projeto, gerada só a partir de `evento`.
- **FR-003-07**: "Fechar o dia" gera rascunho do relatório diário (texto estruturado do registro diário) a partir do log do dia, editável antes de salvar. Nunca envia e-mail automaticamente; só cria rascunho.
- **FR-003-08**: Relatório por cliente e por dia (para o gestor) com o que foi entregue, o que andou e o que está bloqueado ou atrasado.

## Critérios de aceite

1. Arrastar um card de "A fazer" para "Concluída" cria um evento `concluiu` com o autor correto, mesmo se a mudança vier por SQL/MCP.
2. Mudar prazo gera `reagendou` com antes/depois.
3. "Meu dia" lista as ações do dia em ordem e agrupadas por cliente.
