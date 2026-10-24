/** Leitura das views financeiras (somente diretor/consultor; vazias para os demais). Tipos gerados ainda não as incluem. */
type Linhas = PromiseLike<{ data: unknown[] | null }>;
type Untyped = {
  from(t: string): { select(c: string): Linhas & { in(c: string, v: string[]): Linhas } };
};

export type FinContrato = { valor: number | null; forma_pagamento: string | null };

export async function financeiroContratos(sb: unknown, ids?: string[]) {
  const q = (sb as Untyped)
    .from("contrato_financeiro")
    .select("contrato_id, valor, forma_pagamento");
  const { data } = await (ids ? q.in("contrato_id", ids) : q);
  return new Map(
    ((data ?? []) as (FinContrato & { contrato_id: string })[]).map((r) => [r.contrato_id, r]),
  );
}

export async function impactoAditivos(sb: unknown, contratoId: string) {
  const { data } = await (sb as Untyped)
    .from("aditivo_financeiro")
    .select("aditivo_id, impacto_valor")
    .in("contrato_id", [contratoId]);
  return new Map(
    ((data ?? []) as { aditivo_id: string; impacto_valor: number | null }[]).map((r) => [
      r.aditivo_id,
      r.impacto_valor,
    ]),
  );
}
