/** Valores de contrato (valor, forma de pagamento, impacto_valor) só para diretor/consultor (FR-006-05). */
export const ehGestor = (papel?: string | null) => papel === "diretor" || papel === "consultor";

/** Remove campos financeiros antes de gravar em `evento`, que é legível por toda a org. */
export function semFinanceiro<T extends Record<string, unknown> | null | undefined>(obj: T) {
  if (!obj) return obj;
  const { valor: _v, forma_pagamento: _f, impacto_valor: _i, ...resto } = obj;
  return resto;
}
