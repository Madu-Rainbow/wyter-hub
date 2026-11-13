// Parte pura (sem import Deno/npm) dos argumentos MCP: aliases de nomes que o cliente costuma chutar.
// Os schemas zod ficam em tools.ts; este modulo e testavel pelo vitest (tests/unit/mcp-tools.test.ts).

// Nome canonico = o que o schema zod de tools.ts aceita. Alias = nome que chega e e reescrito antes da validacao.
export const ALIAS_ARGUMENTOS: Record<string, Record<string, string>> = {
  buscar: { query: "consulta", q: "consulta", texto: "consulta" },
  listar_clientes: { query: "texto", q: "texto" },
  obter_cliente: { id: "cliente_id" },
  obter_tarefa: { id: "tarefa", tarefa_id: "tarefa" },
  atualizar_tarefa: { id: "tarefa", tarefa_id: "tarefa", data_prazo: "prazo" },
  mover_tarefa: { id: "tarefa", tarefa_id: "tarefa", novo_status: "status" },
  comentar_tarefa: { id: "tarefa", tarefa_id: "tarefa", comentario: "texto" },
  criar_tarefa: { data_prazo: "prazo" },
  grafo_vizinhanca: { id: "no_id" },
};

// Reescreve aliases para o nome canonico. Se o canonico ja veio, ele prevalece e o alias e descartado.
export function normalizarArgumentos(ferramenta: string, args: unknown): unknown {
  if (!args || typeof args !== "object" || Array.isArray(args)) return args;
  const mapa = ALIAS_ARGUMENTOS[ferramenta] ?? {};
  const out: Record<string, unknown> = { ...(args as Record<string, unknown>) };
  for (const [alias, canonico] of Object.entries(mapa)) {
    if (!(alias in out)) continue;
    if (!(canonico in out)) out[canonico] = out[alias];
    delete out[alias];
  }
  return out;
}
