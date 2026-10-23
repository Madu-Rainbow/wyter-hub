# Wyter Hub — Sistema de Gestão da Wyter Consultoria

## Visão
Sistema interno que substitui Trello + Drive + Gmail + Claude na gestão da Wyter Consultoria (Cuiabá-MT).
Convive com ferramentas atuais até corte gradual por cliente.

## Stack
- **Front:** Next.js (App Router, RSC), TypeScript estrito, Tailwind CSS, shadcn/ui, TanStack Table/Virtual, React Hook Form + Zod, date-fns pt-BR, cmdk, Recharts
- **Back:** PostgreSQL (Docker), Drizzle ORM, Better Auth (Google OAuth), pg-boss (filas)
- **Shared:** Schemas Zod compartilhados front/back/MCP em `src/shared/schemas/`
- **Testes:** Vitest (unit), Playwright (E2E)
- **Lint/Format:** Biome

## Estrutura
```
src/
  app/          → Rotas Next.js (App Router) — onde o Next.js procura
  front/        → UI: components/, hooks/, lib/, styles/
  back/         → Servidor: db/, services/, auth/, jobs/, mcp/, importadores/, api/
  shared/       → Schemas Zod, types, utils, constantes
docs/           → Documentação (ferramentas, design, IHC, migração, roadmap)
specs/          → Especificações do Spec Kit
scripts/        → Automação (git-auto.mjs, seeds, etc.)
tests/          → unit/ e e2e/
```

## Comandos
```bash
pnpm dev          # servidor de desenvolvimento
pnpm build        # build de produção
pnpm test         # vitest
pnpm test:e2e     # playwright
pnpm lint         # biome check
pnpm db:migrate   # drizzle migrations
pnpm db:seed      # dados fictícios
pnpm db:studio    # drizzle studio
```

## Convenções
- Idioma: PT-BR na interface. Commits em inglês (Conventional Commits), descrição PT-BR.
- Fuso: America/Cuiaba. Moeda: BRL. Datas: DD/MM/AAAA na UI, ISO no banco.
- Escopos de commit: `feat(tarefas)`, `fix(relatorio)`, `chore(deps)`, etc.
- Rodapé do commit: `Refs: T0xx` (ID da tarefa Spec Kit).
- Schemas Zod em `src/shared/schemas/` — mesmos no front, back e MCP.
- Server Components por padrão; Client Components só com interação.
- Listas virtualizadas para >50 itens.
- Nunca subir segredos no git. `.env` no `.gitignore`.
- Nunca enviar e-mail automaticamente — só criar rascunhos.

## Specs (Spec Kit)
```
001-nucleo       → modelo de dados, auth, permissões
002-visoes       → árvore, lista, kanban, gantt, minhas tarefas
003-registro     → logs diários, fechar o dia, rascunho e-mail
004-ponte-claude → servidor MCP
005-importadores → Trello, Drive, Gmail
006-painel       → dashboards diretoria, carga, aprovações
007-contratos    → contratos, aditivos, escopos extras
```

## Design
Sóbrio: fundo off-white `#F7F7F5`, texto `#0E1726`, acento azul-marinho.
Sem gradientes, glassmorphism, emojis na UI, ícones de IA.
Tipografia: serifada nos títulos, sans nos dados. Algarismos tabulares.
Detalhes em `docs/design.md`.

## Segurança
- LGPD: campos sensíveis (CPF, endereço, dados processuais) criptografados.
- Mascarar dados antes de enviar para IA.
- OAuth com escopos mínimos.
- Backups diários do Postgres.

## Economia de tokens
- Ler arquivos por trecho, não inteiros.
- Explorações amplas → subagentes.
- Uma tarefa por vez no Spec Kit.
- `rtk gain` e Caveman stats ao fim de cada fase → `docs/economia-tokens.md`.
