import { describe, expect, it } from "vitest";
import { formataBR, formataHoraBR, parseBR } from "../../src/shared/utils/date";

describe("formataBR", () => {
  it("formata DD/MM/AAAA no fuso de Cuiabá", () => {
    expect(formataBR(new Date("2026-10-24T15:00:00Z"))).toBe("24/10/2026");
  });

  it("usa o dia de Cuiabá e não o UTC (02h UTC ainda é dia anterior)", () => {
    expect(formataBR(new Date("2026-10-24T02:00:00Z"))).toBe("23/10/2026");
  });

  it("aceita string ISO", () => {
    expect(formataBR("2026-01-05T12:00:00Z")).toBe("05/01/2026");
  });
});

describe("formataHoraBR", () => {
  it("inclui hora de Cuiabá (UTC-4)", () => {
    expect(formataHoraBR("2026-10-24T15:30:00Z")).toBe("24/10/2026 11:30");
  });
});

describe("parseBR", () => {
  it("converte DD/MM/AAAA em data local", () => {
    const d = parseBR("24/10/2026");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9);
    expect(d.getDate()).toBe(24);
  });

  it("devolve data inválida para texto fora do formato", () => {
    expect(Number.isNaN(parseBR("2026-10-24").getTime())).toBe(true);
    expect(Number.isNaN(parseBR("31/02/2026").getTime())).toBe(true);
  });
});
