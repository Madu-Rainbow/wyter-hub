# Implementation Plan: 001-nucleo

**Branch**: `001-nucleo` | **Date**: 2026-10-23 | **Spec**: [spec.md](./spec.md)

## Summary

Implementar o modelo de dados completo do Wyter Hub com Drizzle ORM + PostgreSQL, autenticação Google OAuth via Better Auth com lista de e-mails autorizados, sistema de papéis (diretor/consultor/analista/convidado), log de eventos append-only, dossiê do cliente, e seed de dados fictícios. Tudo com schemas Zod compartilhados.

## Technical Context

**Language/Version**: TypeScript 7 (strict) + Node.js 22 LTS

**Primary Dependencies**: Next.js 15 (App Router), Drizzle ORM, Better Auth, Zod, pg-boss

**Storage**: PostgreSQL 16 local (dev) → Supabase (prod)

**Testing**: Vitest (unit), Playwright (E2E futuro)

**Target Platform**: Web (servidor Linux, browser desktop)

**Project Type**: Web application full-stack

**Performance Goals**: Queries < 200ms, eventos < 50ms overhead, seed < 10s

**Constraints**: Compatível Postgres local e Supabase, criptografia de campos sensíveis portável

**Scale/Scope**: MVP — 5 usuários, ~3 clientes, ~150 tarefas, ~10k eventos

## Constitution Check

| Princípio | Status | Como atende |
|---|---|---|
| I. Visão única | ✅ | org_id em todas as tabelas, queries por papel |
| II. Registro imutável | ✅ | Tabela evento append-only, sem DELETE/UPDATE |
| III. Pronto para IA | ✅ | Schemas Zod compartilhados, dossiê estruturado |
| IV. Sem ruptura | ✅ | Tabelas de integração/sincronização preparadas |
| V. Aprovação explícita | ✅ | Tabela aprovação com 3 campos obrigatórios |
| VI. LGPD | ✅ | Criptografia por coluna, trilha de auditoria |
| VII. Leve e rápido | ✅ | Drizzle (leve), índices otimizados |
| VIII. Parecer de banco | N/A | Sem UI nesta spec (só modelo + auth + API básica) |

## Project Structure

### Documentation (this feature)

```text
specs/001-nucleo/
├── spec.md
├── plan.md              # este arquivo
├── data-model.md        # modelo ER detalhado
└── tasks.md             # gerado por /speckit-tasks
```

### Source Code

```text
src/
├── back/
│   ├── db/
│   │   ├── schema/
│   │   │   ├── organizacao.ts
│   │   │   ├── pessoa.ts
│   │   │   ├── cliente.ts
│   │   │   ├── contato-cliente.ts
│   │   │   ├── projeto.ts
│   │   │   ├── tarefa.ts
│   │   │   ├── aprovacao.ts
│   │   │   ├── comentario.ts
│   │   │   ├── anexo.ts
│   │   │   ├── evento.ts
│   │   │   ├── registro-diario.ts
│   │   │   ├── dossie-cliente.ts
│   │   │   ├── contrato.ts
│   │   │   ├── aditivo.ts
│   │   │   ├── escopo.ts
│   │   │   ├── escopo-extra.ts
│   │   │   ├── integracao.ts
│   │   │   ├── email-autorizado.ts
│   │   │   └── index.ts          # re-exporta tudo
│   │   ├── migrations/           # geradas por drizzle-kit
│   │   ├── seeds/
│   │   │   ├── index.ts          # orquestra os seeds
│   │   │   ├── organizacao.ts
│   │   │   ├── pessoas.ts
│   │   │   ├── clientes.ts
│   │   │   ├── projetos.ts
│   │   │   ├── tarefas.ts
│   │   │   ├── contratos.ts
│   │   │   ├── aprovacoes.ts
│   │   │   ├── registros.ts
│   │   │   └── dossie.ts
│   │   ├── drizzle.ts            # conexão + client
│   │   └── crypto.ts             # encrypt/decrypt de campos sensíveis
│   ├── auth/
│   │   ├── config.ts             # Better Auth config
│   │   ├── middleware.ts         # middleware de sessão + papel
│   │   └── permissions.ts        # matriz de permissões por papel
│   └── services/
│       └── evento.ts             # criar evento (usado por todos os CRUDs)
├── front/
│   └── app/
│       ├── layout.tsx            # layout raiz
│       ├── page.tsx              # redirect para /minhas-tarefas ou /login
│       ├── login/
│       │   └── page.tsx          # tela de login
│       ├── api/
│       │   └── auth/
│       │       └── [...all]/
│       │           └── route.ts  # Better Auth handler
│       └── (app)/
│           ├── layout.tsx        # layout autenticado (sidebar, header)
│           └── admin/
│               └── emails/
│                   └── page.tsx  # gerenciar e-mails autorizados
├── shared/
│   ├── schemas/
│   │   ├── cliente.ts
│   │   ├── projeto.ts
│   │   ├── tarefa.ts
│   │   ├── aprovacao.ts
│   │   ├── evento.ts
│   │   ├── registro-diario.ts
│   │   ├── dossie.ts
│   │   └── index.ts
│   ├── types/
│   │   └── index.ts              # AppRole, enums compartilhados
│   ├── utils/
│   │   └── date.ts               # formatação BR, fuso Cuiabá
│   └── constants/
│       └── index.ts              # status, prioridades, origens
```

**Structure Decision**: Estrutura front/back/shared já criada na Etapa 0. Um arquivo de schema Drizzle por entidade em `src/back/db/schema/`. Schemas Zod espelham em `src/shared/schemas/`. Cada entidade tem org_id.

## Implementation Phases

### Fase 1 — Schema Drizzle + Migração (estimativa: 2h)

1. Instalar dependências: `drizzle-orm`, `drizzle-kit`, `postgres` (driver), `better-auth`, `zod`, `pg-boss`
2. Configurar `drizzle.config.ts` na raiz
3. Criar `src/back/db/drizzle.ts` (conexão via DATABASE_URL)
4. Criar todos os schemas em `src/back/db/schema/` — um arquivo por tabela
5. Criar `src/back/db/crypto.ts` para encrypt/decrypt de campos sensíveis
6. Rodar `pnpm db:generate` para gerar migrations
7. Rodar `pnpm db:migrate` para aplicar no banco local
8. Verificar com `pnpm db:studio`

### Fase 2 — Schemas Zod compartilhados (estimativa: 1h)

1. Criar schemas Zod em `src/shared/schemas/` espelhando as tabelas
2. Schemas de criação (insert) e de resposta (select) para cada entidade
3. Schema da aprovação com validação dos 3 campos obrigatórios
4. Schemas de enum (status, prioridade, origem, papel, confiança do dossiê)
5. Testes unitários: validar schemas com dados válidos e inválidos

### Fase 3 — Auth (estimativa: 1.5h)

1. Configurar Better Auth em `src/back/auth/config.ts`
2. Configurar plugin de papéis do Better Auth
3. Criar handler em `src/front/app/api/auth/[...all]/route.ts`
4. Criar tabela `email_autorizado` com seed dos e-mails da Wyter
5. Implementar middleware que verifica sessão + papel + restringe por org_id
6. Criar `src/back/auth/permissions.ts` com a matriz: quem pode o quê
7. Criar tela de login (`/login`) — botão "Entrar com Google", mensagem de erro para não autorizados
8. Criar tela de admin de e-mails (`/admin/emails`) — só diretor

### Fase 4 — Serviço de eventos (estimativa: 0.5h)

1. Criar `src/back/services/evento.ts` com função `registrarEvento()`
2. Parâmetros: quem, entidade, id, verbo, antes/depois, origem, cliente_id
3. INSERT apenas (sem UPDATE/DELETE)
4. Testes unitários

### Fase 5 — Seed de dados fictícios (estimativa: 1.5h)

1. Seed da organização Wyter
2. Seed de 5 pessoas com papéis diferentes (1 diretor, 1 consultor, 3 analistas)
3. Seed de 3 clientes (farmácia, escritório de advocacia, indústria)
4. Seed de 8 projetos distribuídos com sub-projetos
5. Seed de ~150 tarefas (1 analista sobrecarregado)
6. Seed de 2 contratos com aditivos e 3 escopos extras
7. Seed de 10 registros diários
8. Seed de 4 aprovações pendentes
9. Seed de dossiê com fatos para cada cliente
10. Script idempotente (limpa e recria)

### Fase 6 — Layout autenticado base (estimativa: 1h)

1. Instalar Tailwind CSS + shadcn/ui
2. Criar layout raiz com os tokens de design (cores, tipografia)
3. Layout autenticado com sidebar vazia (estrutura para spec 002)
4. Página raiz que redireciona para /login ou /minhas-tarefas
5. Verificar que login funciona end-to-end

## Risks and Mitigations

| Risco | Impacto | Mitigação |
|---|---|---|
| Better Auth não suporta lista de e-mails autorizados nativamente | Médio | Implementar como callback/hook no fluxo de auth |
| Criptografia de coluna adiciona complexidade nas queries | Baixo | Criptografar só os campos realmente sensíveis (CPF, endereço) |
| Modelo muito grande para uma spec | Médio | Criar schemas Drizzle incrementalmente, testar cada grupo |
| Supabase pode ter diferenças de comportamento | Baixo | Usar apenas SQL standard, testar com Postgres local |

## Complexity Tracking

Sem violações da constituição.
