// Spec 004 FR-004-11: nada financeiro/sensivel sai pelo MCP.
const CHAVES_PROIBIDAS = new Set([
  "valor", "forma_pagamento", "impacto_valor", "preco", "honorario", "honorarios",
  "cpf", "cnpj", "telefone", "email", "arquivo_url", "token_hash", "auth_user_id", "ciphertext",
]);

export const mascarar = (s: string) =>
  s
    .replace(/R\$\s*[\d.,]+/gi, "[valor oculto]")
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "[cpf oculto]")
    .replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, "[cnpj oculto]")
    .replace(/\b\d{11}\b/g, "[numero oculto]")
    .replace(/\b\d{14}\b/g, "[numero oculto]");

export function limpar<T>(v: T): T {
  if (typeof v === "string") return mascarar(v) as T;
  if (Array.isArray(v)) return v.map(limpar) as T;
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) {
      if (!CHAVES_PROIBIDAS.has(k.toLowerCase())) out[k] = limpar(x);
    }
    return out as T;
  }
  return v;
}
