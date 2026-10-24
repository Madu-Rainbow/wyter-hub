import { ipCliente, normalizarEmail } from "../../src/shared/utils/login-ip";
import { describe, expect, it } from "vitest";

describe("login-ip", () => {
  it("normaliza e-mail", () => expect(normalizarEmail("  A@B.com ")).toBe("a@b.com"));
  it("sem proxy confiável ignora headers", () =>
    expect(ipCliente("1.1.1.1", "2.2.2.2", 0)).toBe(""));
  it("1 salto: último do XFF (anexado pelo proxy), ignora forjado à esquerda", () =>
    expect(ipCliente("9.9.9.9, 203.0.113.5", null, 1)).toBe("203.0.113.5"));
  it("2 saltos", () => expect(ipCliente("9.9.9.9, 203.0.113.5, 10.0.0.1", null, 2)).toBe("203.0.113.5"));
  it("XFF curto cai para x-real-ip", () => expect(ipCliente(null, "203.0.113.7", 1)).toBe("203.0.113.7"));
  it("lixo vira vazio", () => expect(ipCliente("abc'; drop", null, 1)).toBe(""));
});
