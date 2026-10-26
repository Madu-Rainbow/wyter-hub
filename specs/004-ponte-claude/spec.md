# Spec 004 — Ponte Claude (servidor MCP remoto)

## Estado atual — 2026-10-26

**Status geral:** PARCIAL — MCP remoto e tela de tokens estão implementados; integração completa com clientes Claude ainda precisa de validação.

### FEITO

- Edge Function MCP remota publicada com autenticação por token pessoal.
- `initialize`, `tools/list`, `tools/call`, resources, prompts, auditoria e filtros de privacidade implementados.
- Escopos de leitura/escrita, revogação, expiração e limite de taxa atômico.
- Tela `/perfil/claude` com criação, exibição única, cópia, comandos de conexão e revogação.
- Testes básicos de token inválido, `initialize`, `tools/list`, consultas e revogação.

### EM VALIDAÇÃO

- Teste de escrita com token real e confirmação do fluxo `generateLink`/`verifyOtp` no projeto remoto.
- Conferência ponta a ponta da mesma RLS da interface em cada papel.

### FALTA

- OAuth oficial para Claude.ai web.
- Ferramentas de escrita do dossiê, rotação automática de tokens e limite por IP.

Os consultores usam o Claude (Claude Code e Claude.ai/desktop) conectado ao Wyter Hub por um servidor MCP remoto, rodando como Edge Function do Supabase (`supabase/functions/mcp`). O Claude consulta e atualiza o Hub com as MESMAS permissões do usuário que o conectou.

## Transporte

- **FR-004-01**: MCP sobre Streamable HTTP (JSON-RPC 2.0, `POST /functions/v1/mcp`), sem sessão (stateless). Métodos: `initialize`, `notifications/*`, `ping`, `tools/list`, `tools/call`, `resources/list`, `resources/templates/list`, `resources/read`, `prompts/list`, `prompts/get`. Respostas em `application/json`; `GET` devolve 405. CORS e `OPTIONS` habilitados.
- **FR-004-02**: Sem Node: Deno puro, JSON-RPC implementado à mão (sem dependências de runtime além de `@supabase/supabase-js`).
- **FR-004-03**: `verify_jwt = false` em `supabase/config.toml`: a função faz a própria autenticação por token pessoal.

## Autenticação e autorização

- **FR-004-04**: Token pessoal (PAT, prefixo `wyh_`) emitido pelo próprio usuário logado na tela `/perfil/claude`, mapeado a uma `pessoa`. O valor aparece UMA vez.
- **FR-004-05**: Tabela `token_mcp`: guarda apenas o hash SHA-256 (hex), com nome, escopo (`leitura` | `escrita`, onde `escrita` = leitura+escrita), expiração (padrão 90 dias, máx. 365), `ultimo_uso_em`, `revogado_em`. RLS: cada usuário vê e revoga só os seus; criação e validação por funções `SECURITY DEFINER`.
- **FR-004-06**: Validação por `mcp_validar_token(hash)` (`SECURITY DEFINER`, só `service_role`): retorna pessoa/papel/org/escopo se o token existe, não expirou, não foi revogado e a pessoa está ativa; atualiza `ultimo_uso_em`.
- **FR-004-07**: **A RLS do usuário vale.** A função obtém uma sessão REAL do usuário (Auth Admin `generateLink` + `verifyOtp`, sem enviar e-mail) e executa todas as consultas com o JWT dele; a sessão fica em cache na instância até perto do vencimento. Justificativa: o projeto usa chaves legadas e o segredo JWT não é acessível por CLI, então não dá para assinar um JWT próprio; a sessão emitida pelo Auth equivale a um login. `service_role` fica restrito a: validar token, auditar e emitir a sessão. Nenhuma ferramenta consulta dados com `service_role`.
- **FR-004-08**: Escopo `leitura` bloqueia toda ferramenta de escrita. Papel `convidado` não acessa o MCP. `resumo_painel` exige papel diretor ou consultor.
- **FR-004-09**: Limite de taxa por token: 60 chamadas por minuto e 2.000 por dia (contagem em `evento` via `mcp_checar_taxa`); excedido devolve erro JSON-RPC `-32029`.

## Auditoria e privacidade

- **FR-004-10**: Toda chamada de ferramenta (ok ou erro) grava um `evento` com `origem = 'mcp'`, `entidade = 'mcp'`, `verbo = 'mcp:<ferramenta>'`, `depois = { ferramenta, escopo, ok, ms }`. Nunca grava argumentos livres, valores nem dados sensíveis. Escritas geram ainda os eventos normais da tarefa pelos triggers, agora com `origem = 'mcp'` (cabeçalho `x-wyter-origem`).
- **FR-004-11**: Dados financeiros e sensíveis NUNCA saem pelo MCP: sem `valor`, `forma_pagamento`, `impacto_valor`, aditivos financeiros, `dado_sensivel`, CPF/CNPJ/telefone/e-mail de contatos. Toda saída passa por um filtro que remove chaves financeiras e mascara padrões de R$, CPF e CNPJ em textos livres.
- **FR-004-12**: O MCP NUNCA envia e-mail. `relatorio_diario` só devolve texto de rascunho; nada é salvo nem enviado.

## Ferramentas (JSON Schema, descrições em PT-BR)

| Ferramenta | Escopo | Descrição |
|---|---|---|
| `buscar` | leitura | Texto livre em clientes, contratos, projetos, tarefas e pessoas |
| `listar_clientes` | leitura | Clientes visíveis, com filtro de status/texto |
| `obter_cliente` | leitura | Dossiê estruturado em Markdown (contatos de papel, contratos sem valores, projetos, fatos do dossiê) |
| `listar_contratos` | leitura | Contratos sem valores, com situação de andamento |
| `listar_projetos` | leitura | Projetos por cliente/contrato/status |
| `listar_tarefas` | leitura | Filtros cliente, contrato, projeto, responsável, status, atrasadas |
| `obter_tarefa` | leitura | Tarefa com comentários, checklist e atividade |
| `criar_tarefa` | escrita | Cria tarefa em um projeto (`origem = 'mcp'`) |
| `atualizar_tarefa` | escrita | Altera título, descrição, prazo, prioridade, responsável |
| `mover_tarefa` | escrita | Muda o status (kanban) |
| `comentar_tarefa` | escrita | Adiciona comentário |
| `grafo_vizinhanca` | leitura | `dw_vizinhanca` (spec 008), profundidade 1 a 3 |
| `meu_dia` | leitura | Log do dia do usuário (eventos agrupados) |
| `relatorio_diario` | leitura | Rascunho narrativo do dia, por cliente |
| `resumo_painel` | leitura | KPIs e carga da equipe (só gestor) |

- **FR-004-13**: Resources: `wyter://cliente/{id}` (dossiê em Markdown). Prompts: `fechar_o_dia` (gera o relatório do dia e orienta o fechamento, sem enviar nada) e `briefing_cliente` (resumo do cliente para reunião).
- **FR-004-14**: Entradas validadas (tipos, UUIDs, limites: `limite` ≤ 50, texto ≤ 5.000); erros de validação viram `isError` com mensagem em PT-BR.

## Interface

- **FR-004-15**: Página `/perfil/claude`: criar token (nome, escopo, validade), mostrar valor uma vez com botão copiar, listar tokens (nome, escopo, criado, último uso, expira, situação), revogar, e comandos prontos de conexão (`claude mcp add --transport http ...` e JSON para `.mcp.json`/Claude desktop). Link "Claude (MCP)" em `/perfil`.

## Critérios de aceite

1. Token criado na UI conecta no Claude Code com `claude mcp add`, e `tools/list` mostra as ferramentas.
2. Analista não vê clientes de outros analistas pelo MCP (mesma RLS da UI).
3. Token `leitura` recebe erro ao chamar `criar_tarefa`; token `escrita` cria e o evento `criou` tem origem `mcp`.
4. Token revogado ou expirado recebe 401 imediatamente.
5. Nenhuma resposta contém valores em R$, CPF/CNPJ ou campos de `dado_sensivel`.
6. Cada chamada aparece em `evento` com origem `mcp`, sem argumentos.

## Histórico de implementação e pendências específicas

- FEITO: spec, migration 000040 aplicada, função `mcp` implantada (401 e OPTIONS verificados no remoto), tela. FALTA: teste `tools/list`/`tools/call` com token real e confirmar que `generateLink`+`verifyOtp` funciona neste projeto (se falhar, fallback seria service_role com checagem por ferramenta).
- Detalhe original: spec, tabela `token_mcp`, RPCs, função `mcp`, tela `/perfil/claude`: ver commits `feat(mcp)`/`feat(db)`.
- FALTA: OAuth do Claude.ai web (conector customizado exige OAuth; hoje só Claude Code/desktop via cabeçalho Bearer), ferramentas de dossiê em escrita, rotação automática de token, limite por IP.
