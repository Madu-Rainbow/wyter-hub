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

- **FR-002-00b**: Todo campo de seleção (combobox/select) DEVE permitir pesquisa dentro dele: campo de busca no topo da lista, filtragem enquanto digita sem diferenciar acentos nem caixa, navegação por teclado (setas, Enter, Esc, Home/End), opção "limpar" quando o campo é opcional, rolagem interna da lista, estado vazio "Nenhum resultado" e rótulos acessíveis (padrão ARIA combobox). Um único componente compartilhado (`Combobox`) substitui todos os `<select>` nativos, inclusive em formulários de server action (envia o valor por campo oculto com o `name`) e nos filtros de listas, toolbar e painel. Seleção múltipla onde houver vários valores (membros, etiquetas), com chips.

- **FR-002-00c**: **Botões padronizados**: um único componente `Button` (`src/front/components/ui/button.tsx`) é usado em todo o sistema; proibido `<button>`/`<a>` estilizado à mão para ação. Variantes fixas: `primary` (ação principal, uma por tela/formulário), `secondary` (ação comum), `ghost` (ação discreta, ícone), `destructive` (excluir/desativar, sempre com confirmação) e `link`. Tamanhos fixos: `sm`, `md` (padrão), `icon`. Altura, raio, padding, tipografia, ícone (16 px à esquerda do texto) e espaçamento entre botões iguais em todas as telas; estados hover, foco visível, desabilitado e carregando (spinner, bloqueia duplo clique) padronizados. Ordem em formulários e modais: cancelar/secundário à esquerda, principal à direita; rótulos em PT-BR com verbo no infinitivo ("Salvar", "Criar cliente", "Convidar usuário"). Botões só-ícone têm `aria-label` e tooltip. Links de navegação com aparência de botão usam `Button asChild`.

- **FR-002-00d**: **Diálogos da plataforma**: o sistema NÃO usa diálogos nativos do navegador (`window.confirm`, `window.alert`, `window.prompt`, `beforeunload` customizado). Toda confirmação, aviso e entrada rápida usa componentes próprios (`ConfirmDialog`/`AlertDialog`, `Toast`, `PromptDialog` em `src/front/components/ui/`) com o mesmo visual, foco preso dentro do diálogo, Esc para cancelar, Enter para confirmar, rótulos em PT-BR e botões padronizados (FR-002-00c). Ações destrutivas usam a variante `destructive` e descrevem o que será afetado. Feedback de sucesso e erro usa toasts não bloqueantes. Um hook `useConfirm()` devolve uma Promise para substituir o `confirm()` com mudança mínima nos chamadores.

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

## Gantt e ajustes da árvore

- **FR-002-30**: Visão **Gantt** nas Tarefas (ao lado de Kanban, Lista e Tabela, `?visao=gantt`), no escopo escolhido (projeto, contrato, cliente ou tudo). Barras de `data_inicio` a `data_prazo` por tarefa, agrupadas por projeto (linhas colapsáveis), com subtarefas aninhadas. Escalas Dia / Semana / Mês / Trimestre com zoom, linha de "hoje", fim de semana sombreado, barra colorida pelo status e com preenchimento de progresso (checklist ou subtarefas entregues), marca de atraso. Tarefa sem datas aparece numa lista "Sem datas" a ser agendada. Arrastar a barra move as datas; arrastar as bordas redimensiona (grava no banco, com evento e erro visível); convidado só lê. Setas de dependência para `bloqueada_por_id`. Clicar na barra abre o painel da tarefa. Respeita FR-002-00 (cabe na viewport; rolagem só na grade e na escala).
- **FR-002-31**: O item "Tudo" da árvore (nível raiz) DEVE ser compacto, do mesmo tamanho e estilo dos demais nós (linha única, ícone pequeno, contador), nunca um botão grande ou destacado.

## Modal da tarefa estilo Trello

- **FR-002-32**: O modal da tarefa tem duas colunas: à esquerda o conteúdo (título editável no lugar, descrição, checklists, anexos, comentários e atividade); à direita a barra de ações "Adicionar" e "Ações", como no Trello. Cabe na viewport (FR-002-00), com rolagem só na coluna de conteúdo.
- **FR-002-33**: **Membros**: mais de um responsável por tarefa (tabela `tarefa_membro`), avatares no cartão e no modal, adicionar e remover por busca; `responsavel_id` continua como responsável principal.
- **FR-002-34**: **Etiquetas**: etiquetas coloridas com nome por projeto ou organização (`etiqueta`, `tarefa_etiqueta`), criar, editar, aplicar e remover; aparecem no cartão e servem de filtro e de agrupamento. Cor nunca é o único sinal (nome visível ou título acessível).
- **FR-002-35**: **Datas**: início, entrega com hora opcional, lembrete, e marcar como entregue; estado visual (atrasada, vence em breve, entregue) no cartão e no modal.
- **FR-002-36**: **Checklists múltiplas** com título, itens com responsável e prazo opcionais, converter item em tarefa (subtarefa), ocultar itens marcados, barra de progresso por checklist.
- **FR-002-37**: **Anexos**: enviar arquivo (Supabase Storage, bucket privado com RLS por org) ou colar link; miniaturas para imagens; definir imagem como **capa** do cartão; excluir. Só `https://` em links.
- **FR-002-38**: **Comentários**: editor com formatação básica (negrito, itálico, listas, código, links), **menção `@pessoa`** que notifica, responder, editar e excluir o próprio comentário (com marca "editado"), reações com emoji, colar imagem. Comentários e atividade na mesma linha do tempo, com alternância Comentários / Atividade / Tudo.
- **FR-002-39**: **Ações**: copiar tarefa (com checklists e etiquetas), mover para outro projeto ou outra coluna, arquivar/restaurar (soft delete), excluir, copiar link da tarefa, **seguir** a tarefa (notificações de comentário e mudança) e votar.
- **FR-002-40**: **Descrição** em Markdown com pré-visualização; edição inline com salvar/cancelar; histórico via eventos.
- **FR-002-41**: **Campos personalizados** básicos por projeto (texto, número, data, lista) exibidos no modal; opcional nesta versão.
- **FR-002-42**: Toda alteração do modal gera evento (spec 003, trigger no banco) e respeita papel: convidado somente leitura; sem valores financeiros no log.

## Critérios de aceite

1. Arrastar um card muda o status e persiste após recarregar.
2. Clicar no card abre o formulário; salvar atualiza o card sem recarregar a página.
3. Recolher a barra lateral e recarregar mantém a escolha.
4. Em Projetos, trocar de Cards para Kanban e arrastar um projeto muda seu status.
5. Na árvore, escolher um contrato mostra no kanban as tarefas de todos os projetos desse contrato.
6. Toda tarefa exibe Cliente / Contrato / Projeto; criar subtarefa a vincula à mãe.
7. A barra lateral não tem mais Projetos, Contratos e Tarefas separados; "Trabalho" abre a árvore e cada nó mostra suas abas.
8. Abrir `/contratos/ID` redireciona para `/trabalho?contrato=ID`.
9. Na visão Gantt, arrastar uma barra para a direita muda `data_inicio` e `data_prazo` e persiste após recarregar.
10. O nó "Tudo" da árvore tem a mesma altura dos demais nós.
11. No modal, adicionar um segundo membro, uma etiqueta e um anexo atualiza o cartão no kanban sem recarregar a página.
12. Comentário com `@pessoa` registra a menção e aparece na linha do tempo; editar mostra "editado".
