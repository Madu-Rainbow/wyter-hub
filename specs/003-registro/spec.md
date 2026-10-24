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

## Meu dia visual e relatório narrativo (revisão 2)

O log é a fonte, não o produto: "Meu dia" e o relatório diário NÃO podem ser uma lista de eventos. Devem transformar o log e os dados em contexto numa leitura visual e num texto de relatório pronto.

- **FR-003-09**: **Painel visual do dia**: cabeçalho com saudação e data; KPIs do dia (concluídas, em andamento, movidas, comentários, horas estimadas entregues, tempo ativo entre a primeira e a última ação); anel de progresso "entregue vs planejado" (tarefas com prazo hoje); linha do tempo horizontal do dia (blocos por hora, cor por cliente, clique abre a tarefa); barras de esforço por cliente e por projeto; mapa de calor semanal (dias x intensidade) com o dia selecionado destacado; comparativo com a média das últimas 4 semanas.
- **FR-003-10**: **Cartões de entrega**: cada tarefa concluída vira um cartão com cliente, projeto, título, resumo (descrição curta), checklist concluído (x/y), anexos, comentários relevantes e quem colaborou; tarefas movidas mostram "de X para Y"; bloqueios e atrasos em cartão de alerta com motivo (bloqueada por, dias de atraso).
- **FR-003-11**: **Relatório narrativo gerado** (não só eventos): texto em PT-BR em prosa e tópicos, por cliente, com seções Resumo do dia, Entregas, Em andamento, Bloqueios e riscos, Próximos passos e Observações, composto a partir de `evento` + `tarefa` + descrição + checklist + comentários do dia + prazos próximos; frases naturais ("Concluí a revisão do contrato X, que destravou Y"), agrupando eventos repetidos da mesma tarefa em uma frase só. Gerado por regras determinísticas agora, com ponto de extensão para um agente de IA (spec 004) reescrever o texto; antes de qualquer envio a IA, mascarar dados sensíveis e valores.
- **FR-003-12**: Editor do relatório lado a lado com pré-visualização; botões Regenerar (preserva edições manuais por seção), Salvar no registro diário, Copiar, Baixar PDF e Criar rascunho de e-mail (nunca envia automaticamente). Escolher quais clientes entram.
- **FR-003-13**: Visões Dia / Semana / Mês: semana e mês geram relatório consolidado com tendências (entregas por dia, clientes mais atendidos) e destaques.
- **FR-003-14**: Item "Relatórios" na barra lateral para diretor/consultor; relatório por cliente tem o mesmo formato visual e narrativo, com seletor de período.

## Critérios de aceite

1. Arrastar um card de "A fazer" para "Concluída" cria um evento `concluiu` com o autor correto, mesmo se a mudança vier por SQL/MCP.
2. Mudar prazo gera `reagendou` com antes/depois.
3. "Meu dia" lista as ações do dia em ordem e agrupadas por cliente.
4. "Meu dia" mostra KPIs, anel de progresso, linha do tempo por hora e cartões de entrega, não apenas uma lista de eventos.
5. "Fechar o dia" gera texto narrativo por cliente com seções (Resumo, Entregas, Em andamento, Bloqueios, Próximos passos) a partir do log e dos dados das tarefas.
