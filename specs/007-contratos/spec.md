# Spec 007 — Contratos

## Estado atual — 2026-10-26

**Status geral:** PARCIAL — vínculo e situação derivada estão implementados; a experiência final depende da área unificada e da validação financeira.

### FEITO

- Vínculo opcional Projeto → Contrato.
- Situação derivada `Sem projeto`, `Em andamento`, `Entregue` e `Encerrado`.
- View de andamento reutilizada pelo painel.
- Tela de contratos integrada à área `/trabalho`, com lista, detalhe, projetos, aditivos e escopos.
- Proteção de valores financeiros e remoção desses valores dos eventos.

### EM VALIDAÇÃO

- Exibição dos valores para diretor/consultor com dados remotos reais.
- Teste de RLS e de escrita por papel.

### FALTA

- Decidir e documentar se consultor terá escrita completa ou apenas ações visíveis conforme permissão.
- Completar testes E2E de situação derivada, aditivos, escopos e valores.

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
