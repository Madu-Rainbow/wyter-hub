#!/usr/bin/env bash
# Teste ponta a ponta do servidor MCP (spec 004). Imprime so status, contagens e nomes.
# Uso: WYTER_MCP_TOKEN=wyh_... bash scripts/test-mcp.sh
# O token vem so da variavel de ambiente: nunca e gravado no repo nem impresso.
# WYTER_MCP_URL opcional (padrao: endpoint do projeto remoto).
set -uo pipefail

cd "$(dirname "$0")/.."
: "${WYTER_MCP_TOKEN:?Defina WYTER_MCP_TOKEN com o token wyh_ criado em /perfil/claude}"
URL="${WYTER_MCP_URL:-https://rnfgzsdsetitvwbvrafz.supabase.co/functions/v1/mcp}"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
umask 077
CFG="$TMP/auth.cfg"
RESP="$TMP/resp.json"
printf 'header = "Authorization: Bearer %s"\n' "$WYTER_MCP_TOKEN" > "$CFG"
printf 'header = "Authorization: Bearer wyh_token_invalido_para_teste"\n' > "$TMP/invalido.cfg"

FALHAS=0
ok() { printf 'PASSA  %s\n' "$1"; }
falha() { printf 'FALHA  %s\n' "$1"; FALHAS=$((FALHAS + 1)); }

# rpc <corpo-json> [cfg] -> HTTP (status) e RESP (corpo, so em arquivo temporario)
rpc() {
  HTTP=$(curl -sS -o "$RESP" -w '%{http_code}' -K "${2:-$CFG}" \
    -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
    -X POST "$URL" --data "$1") || HTTP=000
}

# json <expressao-python> -> imprime campo do RESP (sem corpo completo)
json() {
  python3 -c 'import json,sys
d = json.load(open(sys.argv[1]))
exec(sys.argv[2])' "$RESP" "$1" 2>/dev/null
}

call() { # call <id> <ferramenta> <argumentos-json>
  rpc "{\"jsonrpc\":\"2.0\",\"id\":$1,\"method\":\"tools/call\",\"params\":{\"name\":\"$2\",\"arguments\":$3}}"
}

# 1. initialize
rpc '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test-mcp","version":"1.0.0"}}}'
NOME=$(json 'print(d["result"]["serverInfo"]["name"])')
if [[ "$HTTP" == 200 && "$NOME" == wyter-hub ]]; then ok "initialize: HTTP $HTTP, servidor $NOME"; else falha "initialize: HTTP $HTTP"; fi

# 2. tools/list (espera 15 para diretor ou consultor)
rpc '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
QTD=$(json 'print(len(d["result"]["tools"]))')
if [[ "$HTTP" == 200 && "$QTD" == 15 ]]; then ok "tools/list: 15 ferramentas"; else falha "tools/list: HTTP $HTTP, $QTD ferramentas (esperado 15)"; fi
[[ "$HTTP" == 200 ]] && json 'print("  nomes: " + ", ".join(t["name"] for t in d["result"]["tools"]))'

# 3. buscar com o nome canonico e com o alias query
call 3 buscar '{"consulta":"Pao"}'
R=$(json 'print("isError=%s" % d["result"]["isError"])')
if [[ "$HTTP" == 200 && "$R" == "isError=False" ]]; then ok "buscar com consulta: HTTP $HTTP, $R"; else falha "buscar com consulta: HTTP $HTTP, $R"; fi

call 4 buscar '{"query":"Pao"}'
R=$(json 'print("isError=%s" % d["result"]["isError"])')
if [[ "$HTTP" == 200 && "$R" == "isError=False" ]]; then ok "buscar com query (alias): HTTP $HTTP, $R"; else falha "buscar com query (alias): HTTP $HTTP, $R"; fi

# 4. listar_clientes e resumo_painel
call 5 listar_clientes '{}'
R=$(json 'print("isError=%s" % d["result"]["isError"])')
if [[ "$HTTP" == 200 && "$R" == "isError=False" ]]; then ok "listar_clientes: HTTP $HTTP, $R"; else falha "listar_clientes: HTTP $HTTP, $R"; fi

call 6 resumo_painel '{}'
R=$(json 'print("isError=%s" % d["result"]["isError"])')
if [[ "$HTTP" == 200 && "$R" == "isError=False" ]]; then ok "resumo_painel: HTTP $HTTP, $R"; else falha "resumo_painel: HTTP $HTTP, $R (so diretor/consultor)"; fi

# 5. obter_tarefa sem id: erro de validacao esperado (isError true)
call 7 obter_tarefa '{}'
R=$(json 'print("isError=%s" % d["result"]["isError"])')
if [[ "$HTTP" == 200 && "$R" == "isError=True" ]]; then ok "obter_tarefa sem id: erro esperado, HTTP $HTTP, $R"; else falha "obter_tarefa sem id: HTTP $HTTP, $R (esperado isError=True)"; fi

# 6. token invalido -> 401
rpc '{"jsonrpc":"2.0","id":8,"method":"tools/list"}' "$TMP/invalido.cfg"
if [[ "$HTTP" == 401 ]]; then ok "token invalido: HTTP $HTTP"; else falha "token invalido: HTTP $HTTP (esperado 401)"; fi

# 7. limite de taxa: 70 chamadas individuais (60 por minuto). Espera ao menos um 429.
# Lote e limitado a 10 itens pelo servidor (400 antes do limite), por isso o teste usa chamadas individuais.
CODIGOS="$TMP/codigos.txt"
: > "$CODIGOS"
for i in $(seq 1 70); do
  call $((100 + i)) listar_clientes '{"limite":1}'
  echo "$HTTP" >> "$CODIGOS"
done
N429=$(grep -c '^429$' "$CODIGOS")
PRIMEIRO=$(grep -n '^429$' "$CODIGOS" | head -1 | cut -d: -f1)
if [[ "$N429" -ge 1 ]]; then ok "limite de taxa: 70 chamadas, $N429 com 429 (primeira na chamada ${PRIMEIRO:-?})"; else falha "limite de taxa: nenhuma resposta 429 em 70 chamadas"; fi

echo
if [[ "$FALHAS" -eq 0 ]]; then echo "Resultado: todos os testes passaram."; else echo "Resultado: $FALHAS falha(s)."; fi
exit $((FALHAS > 0))
