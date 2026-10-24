# Spec 009 — Correções (bateria de testes)

Documento vivo. Cada item tem estado: **FEITO**, **EM ANDAMENTO** (agente trabalhando) ou **FALTA**. Atualizar a cada rodada.

Bateria 1 (2026-10-24, sem sessão logada): `tsc`, `vitest`, `biome`, fumaça de rotas (`curl`), revisão automática de segurança dos commits e relatórios dos agentes. **Limite**: nenhuma tela foi aberta logada, então nada visual ou de fluxo foi validado em execução. Bateria 2 (a fazer) exige sessão logada (Playwright com login por e-mail e senha).

## 1. Defeitos encontrados na bateria 1

| ID | Defeito | Evidência | Estado |
|---|---|---|---|
| C-01 | `src/shared/types/supabase.ts` com sintaxe inválida (linha ~613 em diante) após regeneração concorrente | `tsc`: TS1131/TS1128 em cascata; `/login` responde 500 | FALTA (regenerar com `supabase gen types` e formatar com biome; nenhum agente deve editar o arquivo em paralelo) |
| C-02 | Build quebrado: `ChecklistTab` não existe mais em `checklist-tab.tsx` (renomeado para `ChecklistsSec`) | Erro do Turbopack em `tarefa-sheet.tsx:18` | EM ANDAMENTO (agente do modal Trello) |
| C-03 | Nenhum teste automatizado: `vitest` sem arquivos de teste (`No test files found`) | `pnpm test` sai com erro | FALTA (ver seção 4) |
| C-04 | `biome` cai por falta de memória rodando em `src` inteiro; ~97 erros de lint antigos fora dos arquivos recentes | relatórios dos agentes | FALTA (rodar por pasta; corrigir erros; limitar memória do biome) |
| C-05 | Migration `20261024000012_modal_tarefa.sql` foi aplicada no remoto antes de o agente do modal concluí-la | `db push` do orquestrador | EM ANDAMENTO (agente confere se o SQL aplicado cobre a UI; mudanças futuras só em migration nova) |
| C-06 | Commits de agentes diferentes misturaram arquivos (index compartilhado); `.git/index.lock` colide | histórico `4c51fde`, `c52899c` | FEITO (processo: `git commit -- <caminhos>`); resíduo: conferir commits órfãos |
| C-07 | `.env.example` com alteração local do usuário nunca commitada; `next-env.d.ts` não ignorado | `git status` | FALTA (decisão do usuário; sugerir `next-env.d.ts` no `.gitignore`) |

## 2. Segurança

| ID | Item | Estado |
|---|---|---|
| S-01 | XSS: `link_externo` renderizado como `href` | FEITO (validação no front + CHECK `^https?://` na migration 000002) |
| S-02 | Cadastro aberto a qualquer conta com e-mail | FEITO (trigger em `auth.users`, middleware e layout exigem `pessoa` ativa, `enable_signup=false` no `config.toml`); FALTA conferir no painel do Supabase que o trigger existe e o cadastro público está desligado |
| S-03 | Aprovação imutável após decisão; checagem de `org_id` entre referências; `tarefa_numero_seq` com `org_id` | FEITO (migration 000003) |
| S-04 | Valores de contrato só para diretor/consultor (views `contrato_financeiro`, `aditivo_financeiro`, REVOKE de coluna) | FEITO; valores removidos também do log `evento` |
| S-05 | E-mail autorizado único entre organizações | FEITO (migration 000005) |
| S-06 | `evento` valida `org_id` de cliente/projeto/contrato; DELETE físico de contrato/aditivo/escopo só diretor | FEITO (migrations 000011 e 000020) |
| S-07 | XSS no tooltip do grafo DataWare (`nodeLabel`) | FEITO (escape de HTML) |
| S-08 | Dados sensíveis cifrados (Vault + `pgp_sym_encrypt`), auditoria `acessou_sensivel`, trigger `evento_imutavel` | FEITO no código; FALTA testar revelar/gravar e bloqueio de UPDATE/DELETE em `evento` com sessão real |
| S-09 | Sequestro de convite por e-mail editável em `pessoa` (alto) e corrida na regra do último diretor (médio) | EM ANDAMENTO (migration 000021: vínculo por `email_autorizado.pessoa_id`, bloqueio de edição de e-mail, advisory lock) |
| S-10 | Senhas do PC e do Supabase foram coladas no chat | FALTA (usuário deve trocar as duas; Project Settings > Database > Reset password) |
| S-11 | Auth por e-mail e senha | FEITO no código, no `config.toml` e no remoto (login ponta a ponta validado via API); FALTA no painel do Supabase (Auth > Providers): desligar Google e "Allow new users to sign up", manter Email ligado, senha mínima 8 |
| S-13 | Conta admin de desenvolvimento com senha fraca (migration 000030) | FALTA (trocar a senha ou remover a conta antes de uso real) |
| S-14 | Backfill da migration 000021 vinculou convites a `pessoa` pelo e-mail (campo que era editável antes da correção). Risco prático baixo (cadastro público fechado, equipe pequena), mas o vínculo não é provado | FALTA (revisar na tela Usuários os convites pendentes e as pessoas sem login: confirmar que cada par e-mail/pessoa é legítimo; revogar e reconvidar os duvidosos) |
| S-15 | Comentário/anexo: autoria forjável e edição de campos de vínculo (modal Trello, migration 000012) | EM ANDAMENTO (migration 000022 escrita; aplicar quando a CLI voltar a funcionar) |
| S-16 | Login por Server Action: GoTrue vê um só IP (servidor), então `sign_in_sign_ups` global virava DoS e não havia limite por e-mail | EM ANDAMENTO: código, `config.toml` (300/5min) e migration 000050 (`login_tentativa`, `login_tentar`, `login_sucesso` com segredo `LOGIN_RL_SECRET`; e-mail+IP 5/15min, e-mail 15/15min, IP/64 20/15min, bloqueio progressivo 5 a 60 min) escritos; FALTA `supabase db push` da 000050 (bloqueado pelo classificador) e `supabase gen types`. IP só vale com `LOGIN_TRUSTED_PROXY_HOPS`>0; senão a chave é só o e-mail. Residual: o anon key é público, quem chamar o GoTrue direto contorna o limite da aplicação (só o limite global de 300/5min por IP vale) |
| S-17 | Limite global do GoTrue (`sign_in_sign_ups = 300`) é frouxo e o anon key é público: quem chamar `/auth/v1/token` direto contorna o limite por e-mail/IP da aplicação (S-16). Aceito como compromisso, porque limite baixo no GoTrue vira DoS de todos os logins (o servidor Next aparece como IP único) | FALTA (usar o Password Verification Hook do Supabase Auth quando o plano permitir, ou encaminhar o IP real ao GoTrue; monitorar tentativas em `login_tentativa`) |
| S-18 | Limite do MCP checado só antes do lote JSON-RPC (lote grande e concorrência furam o teto) | EM ANDAMENTO (migration 000060 `mcp_reservar_taxa` atômica + limite de tamanho do lote) |
| S-19 | Migration 000050 (rate limit do login) escrita e commitada, mas NÃO aplicada no remoto; o login falha fechado até o push | FALTA (usuário roda `! supabase db push`) |
| S-12 | Chave do Vault legível por `postgres` e `service_role`; sem KMS externo | ACEITO (manter `service_role` fora do cliente); revisar antes de produção |

## 3. Funcional pendente (encontrado nos relatórios)

| ID | Item | Estado |
|---|---|---|
| F-01 | Rotas ignoram filtros que o painel envia: `/minhas-tarefas` (status, prioridade, resp, cliente, projeto, de, ate, atrasadas, aprovacao); `/trabalho` aceita só escopo | FALTA |
| F-02 | KPI "Aprovações pendentes" aponta para `/minhas-tarefas?aprovacao=pendente`; não existe tela de aprovações | FALTA (criar `/aprovacoes`, spec 001 US de aprovação) |
| F-03 | `rotaDoNo` do DataWare aponta para rotas antigas (funcionam por redirecionamento) | FALTA (apontar para `/trabalho?...`) |
| F-04 | Criação rápida de tarefa em escopo amplo (sem projeto) mostra erro | FALTA (pedir projeto no cartão de criação) |
| F-05 | Gantt: altura `calc(100dvh-17rem)` aproximada; clique não grava `?tarefa=` na URL; tarefa com uma só data vira 1 dia | FALTA |
| F-06 | Tipos de `supabase.ts` não incluem as views financeiras (acesso por helper sem tipo em `src/front/lib/financeiro.ts`) | FALTA (regenerar após C-01 e tipar) |
| F-07 | Perfil: sem coluna de foto; policy `pessoa_update` impede o analista de editar o próprio perfil | FALTA (decidir: permitir nome/foto próprios por função) |
| F-08 | Progresso por projeto e escopo leem no máximo 1000 tarefas; painel limita 5000 | FALTA (agregar no banco com view/RPC) |
| F-09 | Evento `reagendou` com `antes = {}` quando o prazo anterior era nulo | FALTA (gravar `antes: {data_prazo: null}`) |
| F-10 | Medidor de estresse: acréscimo "+0,02 por tarefa acima de 8" é interpretação do agente | FALTA (validar a fórmula com o usuário) |
| F-11 | Tipos de contrato (Auditoria, Consultoria, Projeto de inovação) padronizados só no `seed.sql`; remoto tem contratos reais sem padronização | FALTA (campo com lista controlada no formulário e migração dos dados reais com aprovação) |
| F-12 | Retificação do dossiê, dados sensíveis e Meu dia não foram usados pela UI em execução | FALTA (bateria 2) |

## 4. Testes automatizados a criar

| ID | Teste | Estado |
|---|---|---|
| T-01 | Unitários (vitest) dos schemas Zod de `src/shared/schemas` (válido/inválido), `formataBR`/`parseBR`, `semFinanceiro`, `ehGestor`, regras do índice de estresse, agregação do painel e geração do relatório narrativo | FALTA |
| T-02 | Testes de banco (SQL/pgTAP ou scripts com `supabase db` em transação com rollback): RLS por papel (diretor/consultor/analista/convidado), `evento` imutável, trigger de log de tarefa, `contrato_andamento`, `dw_vizinhanca`, trigger de signup, guardas do último diretor | FALTA |
| T-03 | E2E (Playwright) com sessão logada: login restrito, criar cliente > contrato > projeto > tarefa, arrastar no kanban (persistir), modal da tarefa (comentar, checklist, anexo), Gantt (mover barra), painel (filtragem cruzada, mapa reenquadra), DataWare (busca, filtro, clique no nó), Usuários (convidar, desativar), Meu dia (gera relatório) | FALTA |
| T-04 | Responsividade: 1280x720, 1366x768, 1536x864, 1920x1080 e 390x844 sem rolagem da página (FR-002-00) nas telas principais | FALTA |
| T-05 | Acessibilidade: foco por teclado em combobox, kanban, gráficos e modal; `axe` nas telas principais | FALTA |
| T-06 | Hook de pré-commit também roda `vitest` quando existir teste | FALTA |

## 5. Specs ainda sem implementação completa

| Spec | Item | Estado |
|---|---|---|
| 002 | Modal da tarefa estilo Trello (FR-002-32 a 42) | EM ANDAMENTO (campos personalizados FR-002-41 fora desta rodada) |
| 002 | Combobox pesquisável e botões padronizados (FR-002-00b/00c) | EM ANDAMENTO fase 1; FALTA fase 2 (tarefas, modal, clientes, dossiê, meu dia, relatórios) |
| 003 | Meu dia visual e relatório narrativo (FR-003-09 a 14) | EM ANDAMENTO (primeira versão reprovada pelo usuário, em refação) |
| 004 | Ponte Claude (MCP) | EM ANDAMENTO: spec, migration, Edge Function `mcp` (15 ferramentas, resources, prompts) e tela /perfil/claude entregues e implantadas; FALTA teste ponta a ponta com token real (criar na UI), OAuth para Claude.ai web |
| 005 | Importadores Trello, Drive, Gmail | FALTA (spec não escrita) |
| ROADMAP | Horas, rentabilidade, faturamento, relatório ao cliente, capacidade (specs 009+ sugeridas, renumerar para 010+) | FALTA (planejamento) |

## 6. Ordem de execução sugerida

1. C-01 e C-02 (destravar build e tipos), depois sinal de teste.
2. Bateria 2 logada (T-03/T-04) e correção do que aparecer.
3. S-02, S-10, S-11 (ações do usuário no painel do Supabase).
4. F-01 a F-04 (filtros e rotas), T-01/T-02 (testes automatizados).
5. Fase 2 de combobox/botões, F-05 a F-12.

## 7. Bateria 2 (Playwright logado)

Parcial 2026-10-24 10:20 (interrompida pelo usuário). Conta admin de desenvolvimento, dev server local, banco remoto. Capturas em `.playwright-mcp/qa-*.png` (dentro do repo, ignoradas pelo Playwright MCP; não commitar). Contagem: 14 PASSA, 9 FALHA, 4 BLOQUEADO, 8 NÃO TESTADO.

### 7.1 Resultados

| ID | Tela/Fluxo | Resultado | Evidência | Estado |
|---|---|---|---|---|
| B2-01 | Login com senha errada | PASSA | Mostra "E-mail ou senha inválidos" | FEITO |
| B2-02 | Login correto e redirecionamento a /painel | PASSA | `/` redireciona para `/painel` | FEITO |
| B2-03 | Sair e rota protegida sem sessão | NÃO TESTADO | Interrompido | FALTA testar |
| B2-04 | Navegação: Painel, Minhas tarefas, Clientes, Equipe, DataWare, Usuários, Perfil, Trabalho | PASSA | Sem erro de console exceto os itens abaixo | FEITO |
| B2-05 | Navegação: Meu dia e Relatórios | FALHA | HTTP 500, "This page couldn't load" (C-09) | FALTA corrigir |
| B2-06 | /contratos | PASSA | Redireciona para `/trabalho?aba=geral` (esperado, F-03 relacionado) | FEITO |
| B2-07 | Sidebar recolhe e lembra | PASSA (parcial) | Aparece recolhida/expandida entre cargas; persistência não validada após logout | FALTA validar |
| B2-08 | Layout sem rolagem da página em 1280x720, 1366x768, 1536x864, 1920x1080, 390x844 | FALHA só no Painel | `documentElement` nunca estoura; mas o Painel rola num contêiner interno: 1125/720, 1147/768, 1191/864, 1273/1080, 2393/844. Demais telas (minhas-tarefas, trabalho, clientes, equipe, dataware, usuarios, perfil, trabalho com cliente) sem estouro (F-13) | FALTA corrigir |
| B2-09 | Trabalho: árvore Cliente > Contrato > Projeto, nó "Tudo" compacto | PASSA | Árvore com contadores, "Tudo 22" compacto, abas por nível (Visão geral, Tarefas, Projetos, Contratos, Dossiê e registros) | FEITO |
| B2-10 | Criar tarefa (modal Nova tarefa) | FALHA | 400 em `POST /rest/v1/tarefa`; mensagem na tela: `record "new" has no field "entidade_tipo"` (C-08) | FALTA corrigir |
| B2-11 | Arrastar no kanban e persistir | FALHA | `PATCH tarefa` 400, mesmo erro (C-08) | FALTA corrigir |
| B2-12 | Modal: comentar, checklist | FALHA | `POST comentario` 400 e checklist com o mesmo erro (C-08). Etiqueta, membro, anexo, copiar, arquivar: BLOQUEADO (mesma causa, tabelas cobertas pelo trigger `trg_org_modal`) | FALTA corrigir |
| B2-13 | Lista, Tabela, Gantt (renderizam) | PASSA (parcial) | Alternância funciona; Gantt sem tarefas com datas, então "mover barra" BLOQUEADO (sem dados e escrita quebrada) | FALTA testar |
| B2-14 | Atalhos n / Esc | NÃO TESTADO | Interrompido (Esc fecha o modal: PASSA) | FALTA testar |
| B2-15 | Painel: gráficos, medidor, mapa | PASSA (parcial) | Todos renderizam; mapa enquadra Cuiabá/Várzea Grande; ver F-14 a F-17 para falhas visuais | FALTA corrigir |
| B2-16 | Painel: filtragem cruzada | PASSA | Clique em "Crítica" gera `?f_prio=critica`, KPI "Tarefas abertas" 22 para 7, demais gráficos mudam; "Limpar tudo" restaura | FEITO |
| B2-17 | Painel: console limpo | FALHA | React: "Cannot update a component (Router) while rendering PainelInterativo" (C-10) | FALTA corrigir |
| B2-18 | Contratos/Painel: valores visíveis ao diretor (situação, valor) | FALHA | Valor "—" e "Total: R$ 0,00"; Painel "R$ 0,00" nos contratos e segmentos. `financeiroContratos` ignora `error` e devolve mapa vazio, então falha de view/REVOKE fica invisível (C-11). Situação de andamento aparece (Encerrado, Sem projeto) | FALTA corrigir |
| B2-19 | DataWare: grafo, busca, filtros, clique no nó, painel de dados | PASSA | Busca "Pão" destaca o nó e lista resultado; clique mostra dados e 7 conexões; painel Filtros com Cliente/Contrato/Projeto/Pessoa/Status, Carregar logs, Só vizinhança, Nível | FEITO (ajuste ao tamanho da tela: grafo ocupa parte central com 2 nós soltos nas bordas, F-18) |
| B2-20 | Meu dia (painel visual, relatório narrativo, salvar) | BLOQUEADO | Página 500 (C-09) | FALTA testar |
| B2-21 | Usuários: lista, convidar `qa+teste@example.com` (analista), revogar | PASSA | Convite aparece e some após revogar; 1 ativo, 4 convidados | FEITO (layout das colunas desalinhado entre linhas, F-19) |
| B2-22 | Comboboxes com pesquisa (projeto na tarefa, UF e responsável no cliente) | PASSA | Filtram ao digitar. Observação: projeto na nova tarefa lista projetos de todos os clientes mesmo no escopo de um cliente (F-20) | FEITO |
| B2-23 | Cadastrar cliente, contato, dado sensível (CPF), revelar | PASSA | Cliente criado, contato listado, CPF cifrado, "Revelar" pede confirmação e mostra o valor; evento de auditoria "gravou_sensivel" aparece (S-08 validado em execução, UPDATE/DELETE em `evento` não testados) | FEITO |
| B2-24 | Botões: consistência visual | NÃO TESTADO a fundo | Observados botões com contorno (modal) e preenchidos (ações) coerentes; Gantt tem rolagem dupla (F-21) | FALTA testar |
| B2-25 | Segurança por papel | BLOQUEADO | Só há conta diretor. Sugestão: criar contas de teste por papel (consultor, analista, convidado) e repetir RLS, valores financeiros e dados sensíveis | FALTA |
| B2-26 | MCP: token inválido | PASSA | 401 | FEITO |
| B2-27 | MCP: initialize e tools/list | PASSA | 200, `serverInfo wyter-hub`; 15 ferramentas | FEITO |
| B2-28 | MCP: listar_clientes, listar_contratos, listar_projetos, listar_tarefas, resumo_painel, meu_dia, relatorio_diario | PASSA | Sem R$, CPF/CNPJ, telefone ou e-mail nas respostas (regex) | FEITO |
| B2-29 | MCP: buscar | FALHA | Argumento `{"query":...}` rejeitado: "consulta: Invalid input: expected string, received undefined" (nome do parâmetro é `consulta`, mas a documentação do usuário/spec pode usar `query`; conferir) | FALTA verificar |
| B2-30 | MCP: obter_tarefa, criar_tarefa, comentar_tarefa, atualizar/mover | NÃO TESTADO | Interrompido; esperar correção de C-08, pois escrita em tarefa usa o mesmo trigger | FALTA testar |
| B2-31 | MCP: revogar token | PASSA | Token "[QA]" revogado; `tools/list` com ele retorna 401 | FEITO |
| B2-32 | Console/rede por tela | PASSA (parcial) | Único 4xx recorrente: `/favicon.ico` 404 (F-22); 400 do C-08 nas escritas de tarefa; hidratação divergente em /trabalho?aba=contratos (provável efeito de recarga a quente) | FALTA corrigir |
| B2-33 | F-12 (Dossiê, dados sensíveis na UI) | PASSA | Ver B2-23 | FEITO |
| B2-34 | Fase 2 combobox/botões (tarefas, modal, clientes, dossiê) | PASSA (parcial) | Formulário de cliente, contato, dossiê e modal renderizam e usam combobox | FALTA testar (Gantt e Lista com combobox) |

### 7.2 Novos defeitos

| ID | Defeito | Evidência | Estado |
|---|---|---|---|
| C-08 | Trigger `checar_mesmo_org_modal` (migration `20261024000012_modal_tarefa.sql`, ~linhas 164 e 168) avalia `NEW.entidade_tipo` em tabelas que não têm a coluna (`tarefa`, `comentario`, `checklist`...). PL/pgSQL não faz curto-circuito. Quebra TODA escrita em `tarefa`, `comentario`, `checklist` e demais tabelas do modal. Gravidade: bloqueante | `record "new" has no field "entidade_tipo"` na UI; 400 em POST/PATCH `tarefa` e POST `comentario` | FALTA (migration nova: testar `TG_TABLE_NAME` em `IF` separado, com `CASE` ou blocos aninhados, antes de tocar em `NEW.<campo>`) |
| C-09 | `/meu-dia` e `/relatorios` respondem 500: "Refs cannot be used in Server Components, nor passed to Client Components". Causa: `<VisaoRegistro ref={ref} ...>` em `src/app/(app)/meu-dia/page.tsx:53` e `src/app/(app)/relatorios/page.tsx:62`; `ref` é prop reservada do React. Renomear a prop (ex.: `dataRef`) em `VisaoRegistro` (`src/front/components/registro/visao.tsx`) e nos dois usos | Log do dev server (digest 1945451948) e HTTP 500 | FALTA |
| C-10 | `PainelInterativo` chama atualização do roteador durante a renderização (setState em render) | Erro de console ao filtrar no Painel; indicador "1 Issue" do Next | FALTA |
| C-11 | Valores financeiros vazios para o diretor (R$ 0,00 / "—") e `financeiroContratos`/`impactoAditivos` em `src/front/lib/financeiro.ts` descartam `error` da consulta, escondendo a falha | Aba Contratos do cliente Pão Dourado; Painel | FALTA (conferir se há valor nos dados remotos; se houver, a view/REVOKE falha para o diretor; tratar e registrar `error`) |
| C-12 | Diálogos nativos do navegador (`window.confirm`/`prompt`) em vez de diálogos da plataforma, contra o requisito do usuário. Ocorrências: `src/front/components/tarefa-sheet.tsx:148`, `usuarios/usuario-linha.tsx:121`, `clientes/sensiveis-lista.tsx:29`, `tarefas/barra-lateral.tsx:143` (prompt) e `:160`, `tarefas/comentarios-tab.tsx:367`, `tarefas/checklist-tab.tsx:121` (prompt) e `:132`, `tarefas/anexos-sec.tsx:87`, `mcp/tokens-mcp.tsx:79`. Nenhum `alert` encontrado | `grep` em `src` | FALTA (usar `AlertDialog`/diálogo do shadcn; prompt vira input em popover) |
| F-13 | Painel rola dentro do contêiner (1125 a 2393 px de altura útil) e não cabe em nenhuma das 5 resoluções, contra FR-002-00/006 | Seção 7.1, B2-08 | FALTA (compactar mosaico ou aceitar rolagem interna e registrar na spec) |
| F-14 | Painel: dois cartões pequenos (prioridade e status) sem título visível; medidor com rótulos de eixo cortados ("%" e "15"); agulha em 0,4% desenhada na horizontal; "Carga por pessoa" com 0 h para todos (tarefas sem estimativa) e barras ausentes | `.playwright-mcp/qa-painel*.png` | FALTA |
| F-15 | Painel: donut "Contratos" minúsculo com texto estourando; contratos "Em andamento 0" apesar de 4 contratos | idem | FALTA |
| F-16 | Dados: projetos do cliente aparecem "Sem contrato" e contrato CT-2026-002 mostra "Sem projeto", "0/0 tarefas"; árvore mostra Bem Viver com 2 contratos na visão geral e 1 na árvore | `/trabalho?cliente=...` | FALTA (conferir vínculo projeto-contrato nos dados e na árvore) |
| F-17 | Tarefa criada em escopo de cliente oferece projetos de todos os clientes; mensagem de erro do servidor fica "grudada" no modal (aparece 5 vezes) | B2-22 | FALTA |
| F-18 | DataWare: grafo centralizado ocupa pouco da área, com nós isolados nas bordas | `qa-dw2.png` | FALTA (ajustar zoom ao conteúdo) |
| F-19 | Usuários: colunas desalinhadas entre a linha do diretor e as demais | `qa-usr.png` | FALTA |
| F-20 | Login limpa o campo e-mail após erro (só a senha deveria ser limpa) | B2-01 | FALTA |
| F-21 | Gantt: rolagem vertical dupla, texto "Nenhuma tarefa com datas" cortado, lista "Sem datas" cortada no rodapé | `qa-v-Gantt.png` | FALTA |
| F-22 | `/favicon.ico` retorna 404 em todas as telas | console | FALTA |
| F-23 | Eventos recentes exibem códigos crus ("gravou_sensivel dado_sensivel") | `qa-contato2.png` | FALTA (rótulos em PT-BR) |

### 7.3 Itens existentes verificados

S-08 (revelar e gravar sensível: FEITO em execução; bloqueio UPDATE/DELETE em `evento` e RLS por papel ainda não testados), S-09/S-14 (Usuários: 4 convites pendentes `@ficticio.com` listados, vínculo ainda a revisar pelo usuário), F-12 (dossiê e sensíveis: FEITO; Meu dia: BLOQUEADO por C-09), C-02 (build compila e as telas abrem: FEITO), C-01 (tipos: telas abrem, `tsc` não reexecutado).

### 7.4 Não testado (interrompido)

Logout e rota protegida, atalhos n/Esc, Gantt (mover barra), modal (etiqueta, membro, anexo, copiar, arquivar, após C-08), Meu dia, Relatórios, Equipe e Perfil em profundidade, formulários de projeto/contrato, fase 2 de combobox na Lista/Tabela, comboboxes dos filtros, botões, MCP `obter_tarefa/criar_tarefa/comentar_tarefa`, `evento` imutável, papéis menores.

### 7.5 Dados de teste criados e limpeza

- Convite `qa+teste@example.com`: revogado.
- Token MCP "[QA]": revogado (401 confirmado).
- **Não limpo**: cliente "[QA] Cliente Teste" (id `8ebbe493-22bd-49bb-bf75-5f5f7b9b4431`) com contato "[QA] Contato" e um dado sensível CPF (cifrado); eventos de auditoria correspondentes (append-only, ficam). A UI não oferece arquivar/excluir cliente. Pedir ao usuário para remover pelo SQL do painel Supabase (soft delete ou DELETE como diretor).
- Nenhuma tarefa [QA] criada (C-08 impediu).

Parcial 2026-10-24 10:20 (interrompida pelo usuário)
