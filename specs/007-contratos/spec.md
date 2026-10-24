# Spec 007 — Contratos

## Requisitos adicionados

- **FR-007-01**: Projeto DEVE poder ser vinculado a um contrato (`projeto.contrato_id`, nullable, FK para `contrato`). Requer migration nova: hoje não existe vínculo.
- **FR-007-02**: Contrato DEVE ter situação de andamento derivada, nunca digitada:
  - **Em andamento**: existe ao menos 1 projeto vinculado com ao menos 1 tarefa não entregue (status fora de `concluida` e `cancelada`, `deleted_at` nulo).
  - **Entregue**: há projetos vinculados e todas as tarefas estão entregues.
  - **Sem projeto**: nenhum projeto vinculado.
  - **Encerrado**: vigência vencida (`vigencia_fim` < hoje); sobrepõe as demais e exibe também a situação de entrega.
- **FR-007-03**: Tela `/contratos` DEVE ter alternância Lista / Kanban. O kanban tem colunas Sem projeto, Em andamento, Entregue, Encerrado. Card mostra cliente, número, valor, vigência e progresso (tarefas entregues / total).
- **FR-007-04**: Clicar no card/linha abre o detalhe do contrato com projetos vinculados, aditivos, escopos e escopos extras.
- **FR-007-05**: Colunas do kanban de contratos são somente leitura (situação é derivada); arrastar NÃO altera dados.
- **FR-007-06**: A situação DEVE ser calculada no banco (view `contrato_andamento`), respeitando RLS, para ser reutilizada pelo painel (spec 006).

## Critérios de aceite

1. Contrato com projeto vinculado e 1 tarefa em `revisao` aparece em "Em andamento".
2. Ao concluir a última tarefa, o contrato passa a "Entregue" sem ação manual.
3. Contrato sem projeto aparece em "Sem projeto".

## Nota de permissão

- **FR-007-07**: RLS de `contrato`, `aditivo` e `escopo` hoje só permite escrita ao diretor. Decisão pendente: abrir escrita ao consultor ou ocultar as ações para ele.
