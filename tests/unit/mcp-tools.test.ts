import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ALIAS_ARGUMENTOS, normalizarArgumentos } from "../../supabase/functions/mcp/schemas";
import { describe, expect, it } from "vitest";

const toolsSrc = readFileSync(join(__dirname, "../../supabase/functions/mcp/tools.ts"), "utf8");

describe("normalizarArgumentos (buscar)", () => {
  it("reescreve query para consulta (nome canonico)", () => {
    expect(normalizarArgumentos("buscar", { query: "Pao" })).toEqual({ consulta: "Pao" });
  });

  it("mantem consulta quando ja vem no nome canonico", () => {
    expect(normalizarArgumentos("buscar", { consulta: "Pao" })).toEqual({ consulta: "Pao" });
  });

  it("canonico prevalece se vierem os dois, e o alias some", () => {
    expect(normalizarArgumentos("buscar", { query: "x", consulta: "Pao" })).toEqual({ consulta: "Pao" });
  });

  it("preserva os demais argumentos", () => {
    expect(normalizarArgumentos("buscar", { query: "Pao", tipos: ["cliente"], limite: 5 }))
      .toEqual({ consulta: "Pao", tipos: ["cliente"], limite: 5 });
  });
});

describe("normalizarArgumentos (outras ferramentas)", () => {
  it("obter_tarefa aceita tarefa_id e id como tarefa", () => {
    expect(normalizarArgumentos("obter_tarefa", { tarefa_id: "ABC-12" })).toEqual({ tarefa: "ABC-12" });
    expect(normalizarArgumentos("obter_tarefa", { id: "ABC-12" })).toEqual({ tarefa: "ABC-12" });
  });

  it("criar_tarefa aceita data_prazo como prazo", () => {
    expect(normalizarArgumentos("criar_tarefa", { projeto_id: "p", titulo: "t", data_prazo: "2026-10-30" }))
      .toEqual({ projeto_id: "p", titulo: "t", prazo: "2026-10-30" });
  });

  it("comentar_tarefa aceita comentario como texto", () => {
    expect(normalizarArgumentos("comentar_tarefa", { tarefa: "ABC-1", comentario: "oi" }))
      .toEqual({ tarefa: "ABC-1", texto: "oi" });
  });
});

describe("normalizarArgumentos (entradas que nao devem mudar)", () => {
  it("ferramenta sem aliases devolve os argumentos iguais", () => {
    expect(normalizarArgumentos("resumo_painel", {})).toEqual({});
    expect(normalizarArgumentos("listar_projetos", { status: "em_andamento" })).toEqual({ status: "em_andamento" });
  });

  it("valores que nao sao objeto passam sem alteracao", () => {
    expect(normalizarArgumentos("buscar", undefined)).toBeUndefined();
    expect(normalizarArgumentos("buscar", null)).toBeNull();
    expect(normalizarArgumentos("buscar", ["x"])).toEqual(["x"]);
  });

  it("nao altera o objeto original", () => {
    const entrada = { query: "Pao" };
    normalizarArgumentos("buscar", entrada);
    expect(entrada).toEqual({ query: "Pao" });
  });
});

describe("tabela de aliases x schemas de tools.ts", () => {
  it("alvo de alias nunca e outro alias (sem encadeamento)", () => {
    for (const mapa of Object.values(ALIAS_ARGUMENTOS)) {
      for (const [alias, canonico] of Object.entries(mapa)) {
        expect(mapa[canonico], `${alias} -> ${canonico}`).toBeUndefined();
      }
    }
  });

  it("cada nome canonico aparece como chave do schema em tools.ts", () => {
    for (const mapa of Object.values(ALIAS_ARGUMENTOS)) {
      for (const canonico of new Set(Object.values(mapa))) {
        expect(toolsSrc, `chave ${canonico} ausente em tools.ts`).toMatch(new RegExp(`\\b${canonico}\\??:`));
      }
    }
  });

  it("buscar: schema usa consulta e a descricao mostra o nome canonico e o exemplo", () => {
    expect(toolsSrc).toMatch(/consulta: z\.string\(\)\.min\(2\)\.max\(200\)/);
    expect(toolsSrc).toMatch(/Exemplo: \{\\"consulta\\": /);
  });
});
