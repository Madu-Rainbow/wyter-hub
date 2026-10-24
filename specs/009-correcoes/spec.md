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
