import { ipCliente, normalizarIp, normalizarEmail } from "../../src/shared/utils/login-ip";
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

  it("IPv6: /64, zero-compressão e caixa equivalem", () => {
    const a = "2001:DB8:0:0:1:2:3:4";
    expect(normalizarIp(a)).toBe("2001:db8:0:0::/64");
    expect(normalizarIp("2001:db8::9")).toBe("2001:db8:0:0::/64");
    expect(normalizarIp("2001:0db8:0000:0000:ffff::1")).toBe("2001:db8:0:0::/64");
    expect(normalizarIp("[2001:db8:0:1::1]")).toBe("2001:db8:0:1::/64");
  });
  it("::ffff:IPv4 vira IPv4", () => {
    expect(normalizarIp("::ffff:203.0.113.5")).toBe("203.0.113.5");
    expect(normalizarIp("::FFFF:cb00:7105")).toBe("203.0.113.5");
  });
  it("IPv4 canônico e inválidos", () => {
    expect(normalizarIp("203.000.113.005")).toBe("203.0.113.5");
    expect(normalizarIp("300.1.1.1")).toBe("");
    expect(normalizarIp("1::2::3")).toBe("");
    expect(normalizarIp("::")).toBe("0:0:0:0::/64");
  });
});
