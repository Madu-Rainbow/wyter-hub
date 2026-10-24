# Spec 006 — Painel

## Requisitos adicionados

- **FR-006-01**: Página inicial (`/painel`) DEVE exibir gráficos além dos contadores atuais:
  - Tarefas por status (barras).
  - Tarefas por prioridade (barras).
  - Carga por pessoa: horas estimadas abertas vs. `capacidade_semanal_horas` (barras).
  - Contratos por situação de andamento (rosca/barras), usando a view `contrato_andamento` da spec 007.
  - Projetos por status.
  - Tarefas concluídas por semana (linha, últimas 8 semanas).
- **FR-006-02**: Todo gráfico DEVE ter alternância "Gráfico / Tabela" mostrando os dados brutos. Sem exportação CSV.
- **FR-006-03**: Filtragem cruzada estilo Power BI: clicar em uma barra, fatia ou ponto SELECIONA aquele valor e TODOS os outros gráficos e KPIs passam a refletir apenas os dados selecionados. Clicar de novo desmarca; clicar em outro valor do mesmo gráfico troca a seleção; Ctrl/Shift+clique soma valores. Seleções de gráficos diferentes combinam (E). Elementos não selecionados ficam esmaecidos. Faixa "Filtros ativos" com chips removíveis e "Limpar tudo". Estado na URL (compartilhável). Navegar para a lista completa é ação secundária (link "Abrir lista" no cartão do gráfico).
- **FR-006-04**: Filtros globais do painel: cliente, projeto, responsável e período.
- **FR-006-05**: Dados respeitam RLS e papel (analista vê só os seus clientes). Carga por pessoa e valores de contrato só para diretor/consultor.
- **FR-006-06**: Cada contador do painel DEVE ser clicável e levar à lista correspondente.
- **FR-006-07**: Visual segue o design do projeto: sem gradientes, paleta sóbria, algarismos tabulares, rótulos em PT-BR e datas DD/MM/AAAA.

- **FR-006-08**: Layout de painel estilo Power BI: grade única de 12 colunas que cabe inteira na viewport sem rolar a página (em 1366x768 e acima). Cada visual ocupa um bloco de tamanho próprio: KPIs em faixa fina no topo; gráficos principais (tarefas por status, carga por pessoa) em blocos largos; secundários (prioridade, projetos por status, contratos por situação) em blocos médios; série temporal (concluídas por semana) em bloco largo e baixo. Blocos se redimensionam com a janela e cada gráfico se adapta ao seu espaço (rótulos truncados, escala de fonte). Abaixo de 1024px a grade empilha e a página rola.
- **FR-006-09**: Carga por pessoa: barras horizontais, uma linha por pessoa, com horas estimadas abertas contra a capacidade semanal (marcador de limite; barra em destaque quando acima de 100%), ordenadas da maior para a menor carga, com rolagem interna se houver muitas pessoas.

## Critérios de aceite

1. Painel mostra os 6 gráficos com dados do seed.
2. Clicar na barra "em_andamento" de tarefas por status filtra todos os outros gráficos e KPIs para essas tarefas; clicar de novo restaura.
3. Alternar para tabela exibe os mesmos números do gráfico.
4. Analista não vê gráfico de carga da equipe nem valores de contrato.
