import { describe, expect, it } from "vitest";
import { ehGestor, semFinanceiro } from "../../src/front/lib/papel";

describe("ehGestor", () => {
  it("diretor e consultor são gestores", () => {
    expect(ehGestor("diretor")).toBe(true);
    expect(ehGestor("consultor")).toBe(true);
  });

  it("analista, convidado, nulo e indefinido não são", () => {
    expect(ehGestor("analista")).toBe(false);
    expect(ehGestor("convidado")).toBe(false);
    expect(ehGestor(null)).toBe(false);
    expect(ehGestor(undefined)).toBe(false);
  });
});

describe("semFinanceiro", () => {
  it("remove valor, forma_pagamento e impacto_valor", () => {
    expect(
      semFinanceiro({
        titulo: "Contrato",
        valor: 5000,
        forma_pagamento: "boleto",
        impacto_valor: "alto",
      }),
    ).toEqual({ titulo: "Contrato" });
  });

  it("não altera o objeto original", () => {
    const original = { valor: 1, nome: "x" };
    semFinanceiro(original);
    expect(original).toEqual({ valor: 1, nome: "x" });
  });

  it("devolve nulo e indefinido como vieram", () => {
    expect(semFinanceiro(null)).toBeNull();
    expect(semFinanceiro(undefined)).toBeUndefined();
  });
});
