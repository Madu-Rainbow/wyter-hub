# Lint pendente (biome check)

Gerado em 2026-10-24 com `./node_modules/.bin/biome check src/app src/front`.
Pastas `src/shared`, `src/back`, `src/middleware.ts`, `tests` e `scripts` estão limpas.

## src/app
Nenhum erro.

## src/front

| Arquivo | Linha | Regra | Correção |
|---|---|---|---|
| src/front/components/ui/confirm-dialog.tsx | 5 | assist/source/organizeImports | `biome check --write` (imports fora de ordem) |
| src/front/components/ui/prompt-dialog.tsx | 6 | assist/source/organizeImports | `biome check --write` (imports fora de ordem) |
| src/front/components/ui/toast.tsx | 6 | assist/source/organizeImports | `biome check --write` (imports fora de ordem) |

Os três arquivos são novos e ainda não estão no git. Dono: quem os criou.
