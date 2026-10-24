#!/usr/bin/env bash
# Aplica no Supabase remoto o que ficou pendente: segredo do login, migrations e Edge Function do MCP.
# Uso: bash scripts/deploy-supabase.sh
# O valor do segredo nunca é impresso. Ele fica só em .env.local (e você copia para o painel da Hostinger).
set -euo pipefail

REF="rnfgzsdsetitvwbvrafz"
cd "$(dirname "$0")/.."

passo() { printf '\n== %s\n' "$1"; }
confirmar() { read -r -p "$1 [s/N] " r; [[ "$r" =~ ^[sS]$ ]]; }

command -v supabase >/dev/null || { echo "supabase CLI não encontrada"; exit 1; }
command -v openssl >/dev/null || { echo "openssl não encontrado"; exit 1; }

passo "1/5 Segredo do limitador de login (LOGIN_RL_SECRET)"
touch .env.local && chmod 600 .env.local
if grep -q '^LOGIN_RL_SECRET=' .env.local; then
  echo "LOGIN_RL_SECRET já existe em .env.local (mantido)."
else
  printf 'LOGIN_RL_SECRET=%s\n' "$(openssl rand -hex 32)" >> .env.local
  echo "LOGIN_RL_SECRET gerado e gravado em .env.local."
fi
SEGREDO="$(grep '^LOGIN_RL_SECRET=' .env.local | head -1 | cut -d= -f2-)"
[ -n "$SEGREDO" ] || { echo "segredo vazio em .env.local"; exit 1; }

passo "2/5 Migration local com o hash do segredo (não vai para o git)"
HASH="$(printf '%s' "$SEGREDO" | sha256sum | cut -d' ' -f1)"
ARQ="supabase/migrations/20261024000051_login_segredo_local.sql"
cat > "$ARQ" <<SQL
-- Gerado por scripts/deploy-supabase.sh. Guarda só o SHA-256 do segredo; ignorado pelo git.
insert into public.login_segredo (hash) values (decode('${HASH}', 'hex')) on conflict do nothing;
SQL
echo "Gerado $ARQ"

passo "3/5 Migrations pendentes no remoto"
supabase migration list || true
confirmar "Aplicar as migrations pendentes agora (supabase db push)?" || { echo "Cancelado."; exit 1; }
supabase db push

passo "4/5 Edge Function do MCP"
supabase functions deploy mcp --project-ref "$REF" --use-api

passo "5/5 Tipos do banco"
supabase gen types typescript --project-id "$REF" > src/shared/types/supabase.ts
pnpm exec biome format --write src/shared/types/supabase.ts >/dev/null 2>&1 || true

cat <<'MSG'

Pronto. Falta só você, nesta ordem:
  a) Hostinger (painel do app Node): criar as variáveis de ambiente do front
       NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY  (já existem no .env.local)
       LOGIN_RL_SECRET  (copie a linha de .env.local: grep '^LOGIN_RL_SECRET=' .env.local)
       LOGIN_TRUSTED_PROXY_HOPS=0  (use 1 só se a Hostinger confirmar 1 proxy confiável na frente)
  b) Supabase (painel): Authentication > Providers > Email: manter ligado, desligar "Allow new users to sign up".
  c) Rodar `pnpm exec tsc --noEmit` e avisar o Claude para remover o cast do rpc em src/app/login/actions.ts.
MSG
