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

## Mapa, novos gráficos e reorganização (revisão 2)

- **FR-006-10**: **Mapa dinâmico dos clientes**: mostra apenas a região onde há clientes, nunca o Brasil inteiro. O enquadramento (bounds) é calculado a partir das coordenadas dos clientes visíveis (ex.: clientes em São Paulo e Campinas enquadram só essa região) e se reajusta quando a filtragem cruzada muda. Marcadores por cidade com tamanho proporcional ao nº de clientes ou valor de contratos (valor só para gestor); clicar num marcador seleciona a cidade (filtragem cruzada, FR-006-03). Um único cliente enquadra a cidade com zoom razoável. Sem cliente com coordenadas: estado vazio. Requer `cliente.latitude` e `cliente.longitude` (migration), preenchidos por geocodificação da cidade/UF a partir da tabela de municípios do IBGE (centroide), sem chamadas externas em tempo de consulta. Mapa base leve (tiles públicos com atribuição), sem chave de API.
- **FR-006-11**: **Pizza/rosca de segmentos**: clientes (e valor, só gestor) por `cliente.segmento`, com os maiores segmentos em destaque e "Outros" agrupando a cauda. Participa da filtragem cruzada.
- **FR-006-12**: **Pizza/rosca de categorias de contratação**: contratos por `contrato.tipo` (ex.: auditoria, consultoria, projeto de inovação), com "Outros" para a cauda. Participa da filtragem cruzada. Os tipos de contrato devem ser padronizados (lista controlada no formulário, com "outro" livre) para a agregação fazer sentido.
- **FR-006-13**: **Medidor de estresse da equipe** (gauge semicircular com ponteiro, estilo termômetro/manômetro): mede quão cheia a equipe está, de 0 a 150%+, com faixas verde (até 70%), âmbar (70 a 100%), vermelho (acima de 100%). Índice = (horas estimadas das tarefas abertas com prazo na janela de 4 semanas + 1,5 x horas das atrasadas) / (soma de `capacidade_semanal_horas` das pessoas ativas x 4), com acréscimo proporcional pelo número de tarefas abertas por pessoa acima de 8. Exibe o valor, a pessoa mais carregada e o texto da fórmula ao passar o mouse. Visão geral da equipe e, ao selecionar uma pessoa na filtragem cruzada, individual. Só diretor/consultor.
- **FR-006-14**: **Variedade de gráficos**: o painel NÃO usa só barras. Mix obrigatório: barras horizontais (carga por pessoa), rosca (segmentos, categorias de contratação), mapa (clientes), medidor (estresse), linha/área (concluídas por semana), barras empilhadas (tarefas por status por projeto), funil ou barras de progresso (contratos por situação) e mosaico/treemap opcional (horas por cliente).
- **FR-006-15**: **Sem espaço vazio**: a grade de 12 colunas é composta para ocupar 100% da área (sem lacunas), blocos com alturas diferentes se encaixam como mosaico (ex.: mapa alto à esquerda, medidor e roscas empilhados ao centro, barras e linha à direita), cada visual preenche o seu bloco (gráfico cresce até as bordas, tipografia proporcional). Conteúdo curto não deixa bloco com sobra grande; blocos sem dados mostram estado vazio compacto e liberam espaço.
- **FR-006-16**: **Tamanho proporcional à informação**: o tamanho do bloco segue a densidade de dados do visual, não é uniforme. Visuais pequenos e compactos (medidor de estresse, roscas de segmentos e de categorias, KPIs, indicadores) ocupam blocos pequenos (ex.: 2 a 3 colunas por 1 a 2 linhas da grade), podendo ficar lado a lado ou empilhados em uma coluna estreita; o espaço liberado vai para os visuais que precisam de área (mapa, carga por pessoa, série temporal, barras empilhadas). Rosca e medidor têm tamanho máximo (não crescem além do necessário; legenda ao lado, valor no centro) e são centralizados no bloco. Composição de referência para 1366x768: faixa de KPIs no topo; coluna esquerda com mapa alto; centro com carga por pessoa e barras empilhadas; coluna direita estreita com medidor, duas roscas e funil/progresso de contratos empilhados; série temporal larga embaixo. Ainda sem lacunas (FR-006-15).

## Critérios de aceite

1. Painel mostra os 6 gráficos com dados do seed.
2. Clicar na barra "em_andamento" de tarefas por status filtra todos os outros gráficos e KPIs para essas tarefas; clicar de novo restaura.
3. Alternar para tabela exibe os mesmos números do gráfico.
4. Analista não vê gráfico de carga da equipe nem valores de contrato.
5. Com clientes só em São Paulo e Campinas, o mapa enquadra apenas essa região; ao filtrar um cliente de Cuiabá, o mapa reenquadra em Cuiabá.
6. O medidor sobe de faixa quando se adicionam tarefas abertas com horas estimadas acima da capacidade.
7. Em 1366x768 e 1920x1080 o mosaico preenche a tela inteira sem lacunas visíveis.
