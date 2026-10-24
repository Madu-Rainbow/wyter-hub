# Spec 002 — Visões, Navegação e Tarefas

Referência de funcionamento: Trello (kanban), Jira (tabela, filtros, atividade), ClickUp (lista agrupada, visões alternáveis).

## Navegação e perfil

- **FR-002-01**: Barra lateral DEVE ser recolhível (expandida / só ícones com tooltip); a escolha é lembrada. No mobile usa painel deslizante.
- **FR-002-02**: Item ativo da navegação DEVE ser destacado.
- **FR-002-03**: Página `/perfil`: editar nome de exibição e cargo; e-mail e papel somente leitura; sair. Acessível pelo rodapé da barra lateral. Usuário NÃO altera papel, ativo nem capacidade.
- **FR-002-04**: Todo elemento com aparência clicável DEVE ter ação: linha de tabela inteira, card, contador, avatar. Proibido elemento clicável sem efeito.

## Listas e busca

- **FR-002-05**: Clientes, Projetos e Equipe DEVEM ter busca por texto e filtros (status, responsável) via URL.
- **FR-002-06**: Projetos DEVE ter visões alternáveis, lembradas por usuário: Cards, Lista (ordenável por nome, cliente, status, prazo) e Kanban por status do projeto (arrastar altera o status). Cada projeto mostra progresso de tarefas (entregues/total).
- **FR-002-07**: Equipe: cada pessoa abre `/equipe/[id]` com clientes, tarefas abertas e carga (horas estimadas vs capacidade).
- **FR-002-08**: `/minhas-tarefas`: tarefas abertas do usuário agrupadas em Atrasadas, Hoje, Esta semana, Depois, Sem prazo.

## Tarefas (kanban, lista, tabela)

- **FR-002-09**: Cards do kanban DEVEM ser arrastáveis entre colunas (muda o status, com erro visível se falhar) e, ao clicar, abrir painel lateral de edição.
- **FR-002-10**: Painel da tarefa: título, descrição, status, prioridade, responsável, urgência, esforço, prazo, estimativa, link externo, bloqueada por; checklist com progresso; comentários; atividade (eventos); excluir (soft delete).
- **FR-002-11**: Criar tarefa pelo botão "+" da coluna e por adição rápida (título + Enter). Atalhos: `n` nova tarefa, `Esc` fecha o painel.
- **FR-002-12**: Card mostra responsável, badge de prazo (atrasada em vermelho, vence em até 2 dias em âmbar), contador do checklist, comentários, categoria e bloqueio.
- **FR-002-13**: Barra do projeto: busca, filtros (responsável, prioridade, categoria, só atrasadas, só minhas), agrupar por status / responsável / prioridade, e visões Kanban | Lista (seções colapsáveis, edição rápida inline) | Tabela (colunas ordenáveis). Visão na URL.
- **FR-002-14**: Toda criação, edição, movimento e comentário gera evento (append-only).
- **FR-002-15**: Convidado é somente leitura (sem edição, sem arrastar).
- **Fora desta versão**: ordem manual dos cards dentro da coluna (exige coluna de posição no banco).

## Regra global de layout

- **FR-002-00**: Toda tela DEVE caber na viewport do usuário: se a tela tem altura X e largura Y, o conteúdo nunca excede X por Y. A página não rola; apenas regiões internas (listas, tabelas, painéis laterais, colunas do kanban) rolam. Espaçamentos, tamanhos de fonte e dimensões de componentes são fluidos (`clamp`, `fr`, `minmax`, `h-dvh`, `min-h-0`/`min-w-0`) e se adaptam a qualquer resolução, de 1280x720 a telas grandes. Vale para todas as telas novas e existentes, incluindo `/dataware`.

## Hierarquia e árvore (Cliente > Contrato > Projeto > Tarefa > Subtarefa)

- **FR-002-16**: Hierarquia obrigatória, no modelo Jira/ClickUp: Cliente contém Contratos; Contrato contém Projetos; Projeto contém Tarefas; Tarefa contém Subtarefas. Toda tarefa pertence a um projeto, e portanto tem cliente e contrato derivados do projeto. Projeto novo exige cliente e contrato (contrato do mesmo cliente).
- **FR-002-17**: Subtarefas: `tarefa.parent_id` (nullable, mesma tabela, profundidade máxima 1). Concluir a tarefa-mãe não conclui subtarefas automaticamente; a mãe mostra progresso das filhas.
- **FR-002-18**: Barra lateral de árvore (estilo ClickUp): Cliente > Contrato > Projeto, expansível, com contador de tarefas abertas por nó e busca. Clicar em qualquer nó abre a visão de tarefas daquele escopo.
- **FR-002-19**: Página `/tarefas`: kanban, lista e tabela de TODAS as tarefas do escopo escolhido (tudo, cliente, contrato ou projeto) pela árvore ou por filtros na URL (`?cliente=&contrato=&projeto=`). Breadcrumb Cliente / Contrato / Projeto sempre visível.
- **FR-002-20**: Cartão e painel da tarefa mostram o caminho Cliente / Contrato / Projeto e permitem trocar de projeto (mover tarefa). Agrupar por Cliente, Contrato ou Projeto disponível além de status/responsável/prioridade.
- **FR-002-21**: Chave legível por tarefa (ex.: `FARM-12`, prefixo do projeto + sequência), estilo Jira, exibida no cartão e usada em busca e URL (`/tarefas/FARM-12`).
- **FR-002-22**: Criar tarefa em qualquer escopo exige escolher projeto (pré-selecionado quando o escopo já define um).

## Área de Trabalho unificada (Projetos + Contratos + Tarefas)

Projetos, Contratos e Tarefas hoje são três áreas soltas com o mesmo dado. Passam a ser UMA área, "Trabalho", organizada pela hierarquia.

- **FR-002-23**: Um único item "Trabalho" na barra lateral (rota `/trabalho`) substitui Projetos, Contratos e Tarefas. Permanecem separados apenas Painel, Minhas tarefas, Clientes, Equipe, DataWare e Admin.
- **FR-002-24**: `/trabalho` tem a árvore Cliente > Contrato > Projeto à esquerda (FR-002-18) e, à direita, o conteúdo do nó escolhido, sempre com breadcrumb e cabeçalho do escopo (nome, status, responsável, vigência/prazo, progresso).
- **FR-002-25**: Abas do escopo, que mudam conforme o nível: Visão geral | Tarefas (Kanban / Lista / Tabela) | Projetos (no nível Cliente ou Contrato) | Contratos (no nível Cliente) | Dossiê e registros (no nível Cliente). Nível "Tudo" mostra Visão geral e Tarefas.
- **FR-002-26**: Visão geral por nível: Cliente = contratos com situação de andamento + projetos + últimas atividades; Contrato = situação, valor, vigência, aditivos, escopos, projetos e progresso; Projeto = prazo, responsável, progresso e tarefas por status.
- **FR-002-27**: Escopo e aba na URL (`/trabalho?cliente=&contrato=&projeto=&aba=&visao=`). Rotas antigas `/projetos`, `/projetos/[id]`, `/contratos`, `/contratos/[id]`, `/tarefas`, `/tarefas/[chave]` redirecionam para o equivalente em `/trabalho`.
- **FR-002-28**: Criação no contexto: "Novo" no cabeçalho oferece o que cabe no nível (no Cliente: contrato ou projeto; no Contrato: projeto; no Projeto: tarefa), já com o pai preenchido.
- **FR-002-29**: Kanban de projetos por status (FR-002-06) e kanban de contratos por situação (FR-007-03) viram visões da aba Projetos/Contratos dentro de `/trabalho`.

## Critérios de aceite

1. Arrastar um card muda o status e persiste após recarregar.
2. Clicar no card abre o formulário; salvar atualiza o card sem recarregar a página.
3. Recolher a barra lateral e recarregar mantém a escolha.
4. Em Projetos, trocar de Cards para Kanban e arrastar um projeto muda seu status.
5. Na árvore, escolher um contrato mostra no kanban as tarefas de todos os projetos desse contrato.
6. Toda tarefa exibe Cliente / Contrato / Projeto; criar subtarefa a vincula à mãe.
7. A barra lateral não tem mais Projetos, Contratos e Tarefas separados; "Trabalho" abre a árvore e cada nó mostra suas abas.
8. Abrir `/contratos/ID` redireciona para `/trabalho?contrato=ID`.
