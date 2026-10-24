# Roadmap de capacidades — Wyter Hub como PSA de consultoria

Base: leitura de CLAUDE.md, specs 001/006/007, schema inicial e telas em `src/app/(app)`; referência de mercado em guias de PSA (Rocketlane, BigTime, Rev.io, Teamwork) — fontes de fornecedores, usar com cautela.
Data: 24/10/2026. Porte: ~5 pessoas, 3 clientes-tipo (farmácia, advocacia, indústria).

## (a) Capacidades essenciais x situação atual

| Capacidade | Situação | Observação |
|---|---|---|
| Clientes, contatos, dossiê | Existe | Tabelas `cliente`, `contato_cliente`, `dossie_cliente`; telas em /clientes |
| Projetos e tarefas (lista/kanban/gantt) | Parcial | CRUD de projetos existe; visões da spec 002 ainda sem tela de tarefas |
| Eventos / auditoria append-only | Existe | Tabela `evento` |
| Registro diário / relatório | Parcial | Tabela `registro_diario`; sem tela e sem rascunho de e-mail (spec 003) |
| Contratos, aditivos, escopos | Parcial | Tabelas e /contratos; kanban derivado na spec 007 |
| Aprovações | Parcial | Tabela `aprovacao`; sem fluxo/notificação |
| Painel / carga | Parcial | Spec 006; carga usa só estimativa, não horas reais |
| Apontamento de horas (timesheet) | Falta | Não há campo de horas realizadas em nenhuma tabela |
| Rentabilidade por contrato/cliente | Falta | Depende de horas + custo/hora |
| Faturamento e recebíveis | Falta | `contrato.valor` existe; sem parcelas, NF, vencimentos |
| Pipeline comercial e propostas | Falta | Sem lead, proposta, funil |
| Reuniões e atas | Falta | Só `registro_diario` e `comentario` |
| Base de conhecimento / playbooks | Parcial | Dossiê é por cliente; falta biblioteca da Wyter (modelos, checklists) |
| Portal do cliente / relatório ao cliente | Falta | Papel `convidado` existe, sem telas |
| SLA e demandas recorrentes (retainer) | Falta | Sem tempo de resposta/prazo contratual |
| Importadores Trello/Drive/Gmail | Falta | Spec 005 planejada, `integracao` no schema |
| Ponte com Claude (MCP) | Falta | Spec 004 planejada |

## (b) 10 lacunas mais valiosas (valor/esforço, da maior para a menor)

1. **Apontamento de horas** — registrar horas por tarefa/projeto/dia (timer ou manual), com flag faturável. Sem isso não há carga real, rentabilidade nem cobrança por hora. Spec sugerida: `009-horas`.
2. **Rentabilidade por contrato e cliente** — receita do contrato contra horas x custo/hora, com alerta de estouro de escopo. Responde "qual cliente dá lucro". Spec: `010-rentabilidade` (depende de 009).
3. **Faturamento e recebíveis** — parcelas por contrato, vencimento, status (a emitir, emitida, paga, atrasada), fluxo de caixa previsto. Caixa é a dor nº 1 de consultoria pequena. Spec: `011-faturamento`.
4. **Relatório ao cliente (periódico)** — gerar do `registro_diario` + tarefas um relatório mensal/semanal em PDF/HTML, com rascunho de e-mail (nunca envio automático). Entrega valor percebido e reduz retrabalho. Spec: `012-relatorio-cliente`.
5. **Carga e capacidade com horas reais** — planejado x realizado por pessoa/semana, alerta de sobrecarga e previsão de folga. Estende a spec 006 com dados de 009. Spec: `013-capacidade`.
6. **Pipeline comercial e propostas** — funil simples (lead, reunião, proposta, ganho/perdido), proposta com escopo e valor que vira contrato e escopos ao ganhar. Evita perder leads e retrabalhar escopo. Spec: `014-comercial`.
7. **Escopo extra e aditivos com fluxo de aprovação** — pedido do cliente fora do escopo gera estimativa, aprovação interna, proposta de aditivo e aceite registrado. Protege a margem. Spec: `015-escopo-extra` (liga `escopo_extra` e `aprovacao`).
8. **Reuniões e atas** — agenda, pauta, ata estruturada, decisões e tarefas geradas; alimenta dossiê e eventos. Hoje a decisão some em e-mail e chat. Spec: `016-reunioes`.
9. **Biblioteca de conhecimento e modelos** — playbooks, checklists e modelos de projeto por segmento (farmácia, advocacia, indústria); criar projeto a partir de modelo. Acelera onboarding e padroniza entrega. Spec: `017-biblioteca`.
10. **Portal do cliente (somente leitura)** — papel `convidado` vê andamento, entregas, pendências e aprova itens, sem ver horas nem margem. Reduz pedidos de status por e-mail. Spec: `018-portal-cliente`.

Ordem de execução sugerida: 009 -> 010 e 013 -> 011 -> 012 -> 015 -> 014 -> 016 -> 017 -> 018. Specs 002-005 (visões, registro, MCP, importadores) seguem como fundação e não são repetidas aqui.

Observação sobre SLA: tratar como campo de contrato (prazo de resposta e tarefas recorrentes de retainer) dentro de `015` ou `013`, sem spec própria por ora.

## (c) O que NÃO vale construir agora

- Emissão de nota fiscal e integração contábil/ERP: usar o sistema do contador; registrar só número e status da NF (011).
- Gateway de pagamento, boleto, Pix automático: fora do núcleo de gestão.
- Controle de despesas com captura de recibo e reembolso: volume baixo, planilha resolve.
- Folha, ponto, RH, férias: ferramenta própria do contador.
- Planejamento de recursos por habilidades, matriz de competências: 5 pessoas se coordenam sem isso.
- Multi-organização com troca de tenant e cobrança por plano: `org_id` já prepara; não implementar a UI (FR-012).
- CRM completo (automação de marketing, sequências de e-mail): usar funil simples (014).
- Assinatura eletrônica própria: usar ferramenta externa e anexar o PDF assinado.
- Chat interno e app mobile nativo: manter Gmail/WhatsApp; web responsivo basta.
- Previsão por IA de margem e risco: só após 6+ meses de horas e faturamento reais.
