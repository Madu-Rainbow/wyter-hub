# Wyter Hub — Sistema de Gestão da Wyter Consultoria

## Visão
Sistema interno que substitui Trello + Drive + Gmail + Claude na gestão da Wyter Consultoria (Cuiabá-MT).
Convive com ferramentas atuais até corte gradual por cliente.

## Arquitetura
**Front → Supabase → Edge Functions** (sem backend Node direto).
O front faz queries direto no Supabase via anon key; RLS protege os dados por org e papel.
Edge Functions para lógica complexa. MCP no Supabase para integração com Claude dos consultores.

## Stack
- **Front:** Next.js 16 (App Router, RSC), TypeScript estrito, Tailwind CSS 4, shadcn/ui, Zod, date-fns pt-BR
- **Backend:** Supabase (PostgreSQL + Auth + RLS + Edge Functions + Storage)
- **Auth:** Supabase Auth com Google OAuth, emails autorizados, papéis via tabela `pessoa`
- **Shared:** Schemas Zod em `src/shared/schemas/`, tipos gerados por `supabase gen types`
- **Testes:** Vitest (unit), Playwright (E2E)
- **Lint/Format:** Biome

## Estrutura
```
src/
  app/          → Rotas Next.js (App Router)
  front/        → UI: components/, hooks/, lib/ (supabase client), styles/
  shared/       → Schemas Zod, types (incl. supabase.ts gerado), utils, constantes
supabase/
  migrations/   → SQL migrations (schema + RLS)
  functions/    → Edge Functions (Deno)
  config.toml   → Config do Supabase CLI
docs/           → Documentação
specs/          → Especificações
scripts/        → Automação
tests/          → unit/ e e2e/
```

## Comandos
```bash
pnpm dev                  # servidor de desenvolvimento
pnpm build                # build de produção
pnpm test                 # vitest
pnpm lint                 # biome check
supabase db push          # push migrations para remoto
supabase db reset         # reset local
supabase gen types typescript --project-id rnfgzsdsetitvwbvrafz > src/shared/types/supabase.ts
supabase functions serve   # edge functions local
```

## Convenções
- Idioma: PT-BR na interface. Commits em inglês (Conventional Commits), descrição PT-BR.
- Fuso: America/Cuiaba. Moeda: BRL. Datas: DD/MM/AAAA na UI, ISO no banco.
- Escopos de commit: `feat(tarefas)`, `fix(relatorio)`, `chore(deps)`, etc.
- Schemas Zod em `src/shared/schemas/` — mesmos no front e edge functions.
- Server Components por padrão; Client Components só com interação.
- Nunca subir segredos no git. `.env` no `.gitignore`.
- Nunca enviar e-mail automaticamente — só criar rascunhos.
- RLS habilitado em TODAS as tabelas. Usar `my_org_id()` e `my_papel()` nas policies.
- Supabase client: `getUser()` (valida no servidor) em vez de `getSession()` para auth checks.

## Specs (Spec Kit)
```
001-nucleo       → modelo de dados, auth, permissões, RLS
002-visoes       → árvore, lista, kanban, gantt, minhas tarefas
003-registro     → logs diários, fechar o dia, rascunho e-mail
004-ponte-claude → MCP no Supabase para Claude dos consultores
005-importadores → Trello, Drive, Gmail
006-painel       → dashboards diretoria, carga, aprovações
007-contratos    → contratos, aditivos, escopos extras
```

## Design
Sóbrio: fundo off-white `#F7F7F5`, texto `#0E1726`, acento azul-marinho.
Sem gradientes, glassmorphism, emojis na UI, ícones de IA.
Tipografia: serifada nos títulos, sans nos dados. Algarismos tabulares.

## Segurança
- LGPD: campos sensíveis criptografados via Supabase Vault ou column encryption.
- Mascarar dados antes de enviar para IA.
- RLS em todas as tabelas. service_role NUNCA no cliente.
- Supabase Auth com emails autorizados.

## Eventos/Logs
- Tabela `evento` é append-only (sem UPDATE/DELETE).
- Logs contextuais: `cliente_id` e `projeto_id` no evento.
- Cada cliente e projeto tem seu contexto de logs.

## Economia de tokens
- Ler arquivos por trecho, não inteiros.
- Explorações amplas → subagentes.
- `rtk gain` e Caveman stats ao fim de cada fase.
