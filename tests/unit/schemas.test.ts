import { describe, expect, it } from "vitest";
import { aprovacaoCreateSchema } from "../../src/shared/schemas/aprovacao";
import { clienteCreateSchema, clienteResponseSchema } from "../../src/shared/schemas/cliente";
import { dossieCreateSchema } from "../../src/shared/schemas/dossie";
import { eventoCreateSchema } from "../../src/shared/schemas/evento";
import { projetoCreateSchema } from "../../src/shared/schemas/projeto";
import { registroDiarioCreateSchema } from "../../src/shared/schemas/registro-diario";
import { tarefaCreateSchema } from "../../src/shared/schemas/tarefa";

const UUID = "11111111-1111-4111-8111-111111111111";
const UUID2 = "22222222-2222-4222-8222-222222222222";

describe("clienteCreateSchema", () => {
  it("aceita cliente mínimo válido", () => {
    expect(clienteCreateSchema.safeParse({ razaoSocial: "Farm Ltda" }).success).toBe(true);
  });

  it("recusa razão social vazia", () => {
    expect(clienteCreateSchema.safeParse({ razaoSocial: "" }).success).toBe(false);
  });

  it("recusa UF com tamanho diferente de 2", () => {
    expect(clienteCreateSchema.safeParse({ razaoSocial: "X", uf: "MTT" }).success).toBe(false);
    expect(clienteCreateSchema.safeParse({ razaoSocial: "X", uf: "MT" }).success).toBe(true);
  });

  it("recusa responsável que não é UUID", () => {
    expect(
      clienteCreateSchema.safeParse({ razaoSocial: "X", responsavelId: "nao-uuid" }).success,
    ).toBe(false);
  });

  it("resposta converte datas em Date", () => {
    const r = clienteResponseSchema.safeParse({
      id: UUID,
      orgId: UUID2,
      razaoSocial: "X",
      nomeFantasia: null,
      segmento: null,
      cidade: null,
      uf: null,
      status: "ativo",
      responsavelId: null,
      tags: null,
      createdAt: "2026-10-24T10:00:00.000Z",
      updatedAt: "2026-10-24T10:00:00.000Z",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.createdAt).toBeInstanceOf(Date);
  });

  it("resposta recusa status fora do enum", () => {
    const r = clienteResponseSchema.safeParse({
      id: UUID,
      orgId: UUID2,
      razaoSocial: "X",
      nomeFantasia: null,
      segmento: null,
      cidade: null,
      uf: null,
      status: "excluido",
      responsavelId: null,
      tags: null,
      createdAt: "2026-10-24",
      updatedAt: "2026-10-24",
    });
    expect(r.success).toBe(false);
  });
});

describe("tarefaCreateSchema", () => {
  const base = { projetoId: UUID, titulo: "Revisar contrato" };

  it("aplica padrões de prioridade, urgência, esforço e origem", () => {
    const r = tarefaCreateSchema.parse(base);
    expect(r).toMatchObject({ prioridade: "media", urgencia: 3, esforco: 3, origem: "ui" });
  });

  it("recusa urgência fora de 1 a 5", () => {
    expect(tarefaCreateSchema.safeParse({ ...base, urgencia: 0 }).success).toBe(false);
    expect(tarefaCreateSchema.safeParse({ ...base, urgencia: 6 }).success).toBe(false);
    expect(tarefaCreateSchema.safeParse({ ...base, urgencia: 5 }).success).toBe(true);
  });

  it("recusa link externo que não é URL", () => {
    expect(tarefaCreateSchema.safeParse({ ...base, linkExterno: "isto nao e url" }).success).toBe(
      false,
    );
  });

  it("recusa título vazio e projeto inválido", () => {
    expect(tarefaCreateSchema.safeParse({ ...base, titulo: "" }).success).toBe(false);
    expect(tarefaCreateSchema.safeParse({ ...base, projetoId: "x" }).success).toBe(false);
  });
});

describe("projetoCreateSchema", () => {
  it("tipo padrão é pontual", () => {
    const r = projetoCreateSchema.parse({ clienteId: UUID, nome: "Diagnóstico" });
    expect(r.tipo).toBe("pontual");
  });

  it("recusa tipo fora do enum", () => {
    expect(
      projetoCreateSchema.safeParse({ clienteId: UUID, nome: "X", tipo: "eterno" }).success,
    ).toBe(false);
  });
});

describe("aprovacaoCreateSchema", () => {
  const completo = {
    solicitanteId: UUID,
    aprovadorId: UUID2,
    situacaoAtual: "Atrasado",
    riscoSeNaoFizer: "Multa",
    manutencaoFutura: "Mensal",
  };

  it("aceita pedido completo", () => {
    expect(aprovacaoCreateSchema.safeParse(completo).success).toBe(true);
  });

  it("recusa pedido sem justificativa de risco", () => {
    const { riscoSeNaoFizer: _r, ...sem } = completo;
    expect(aprovacaoCreateSchema.safeParse(sem).success).toBe(false);
  });
});

describe("eventoCreateSchema", () => {
  const base = { quemId: UUID, entidade: "tarefa", entidadeId: UUID2, verbo: "criou" };

  it("origem padrão é ui", () => {
    expect(eventoCreateSchema.parse(base).origem).toBe("ui");
  });

  it("recusa entidade sem id válido", () => {
    expect(eventoCreateSchema.safeParse({ ...base, entidadeId: "123" }).success).toBe(false);
  });
});

describe("registroDiarioCreateSchema", () => {
  const base = {
    pessoaId: UUID,
    clienteId: UUID2,
    data: "2026-10-24",
    oQueFiz: "Reunião de alinhamento",
  };

  it("precisaAprovacao padrão é false", () => {
    expect(registroDiarioCreateSchema.parse(base).precisaAprovacao).toBe(false);
  });

  it("recusa 'o que fiz' vazio", () => {
    expect(registroDiarioCreateSchema.safeParse({ ...base, oQueFiz: "" }).success).toBe(false);
  });

  it("recusa treinamento de diretoria fora do enum", () => {
    expect(
      registroDiarioCreateSchema.safeParse({ ...base, treinamentoDiretoria: "parcial" }).success,
    ).toBe(false);
  });
});

describe("dossieCreateSchema", () => {
  const base = { clienteId: UUID, tipo: "decisao", conteudo: "Escolheram ERP X" };

  it("confiança padrão é a_confirmar", () => {
    expect(dossieCreateSchema.parse(base).confianca).toBe("a_confirmar");
  });

  it("recusa tipo fora de DOSSIE_TIPOS", () => {
    expect(dossieCreateSchema.safeParse({ ...base, tipo: "boato" }).success).toBe(false);
  });

  it("recusa conteúdo vazio", () => {
    expect(dossieCreateSchema.safeParse({ ...base, conteudo: "" }).success).toBe(false);
  });
});
