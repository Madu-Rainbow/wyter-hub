import { type Ev, type TarefaInfo, estatisticas, gerarSecoes } from "../../src/front/lib/registro";
import { mesclar, secoesParaTexto, textoParaSecoes } from "../../src/front/lib/registro-texto";
import { describe, expect, it } from "vitest";

const t: TarefaInfo = {
  id: "t1",
  titulo: "Revisar contrato de R$ 5.000,00",
  numero: 3,
  status: "concluida",
  data_prazo: "2026-10-24",
  responsavel_id: null,
  projeto_id: "p1",
  chave: "FARM",
  projeto_nome: "Farm",
  cliente_id: "c1",
  descricao: "<p>Contrato revisado</p>",
  horas: 2,
  bloqueada_por_id: null,
  n_anexos: 1,
};
const ev = (verbo: string, quando: string, antes = {}, depois = {}): Ev => ({
  id: verbo + quando,
  quando,
  verbo,
  quem_id: "u1",
  entidade_id: "t1",
  cliente_id: "c1",
  projeto_id: "p1",
  antes,
  depois,
});
const evs = [
  ev("moveu", "2026-10-24T12:00:00Z", { status: "a_fazer" }, { status: "em_andamento" }),
  ev("moveu", "2026-10-24T14:00:00Z", { status: "em_andamento" }, { status: "revisao" }),
  ev("concluiu", "2026-10-24T15:00:00Z", { status: "revisao" }, { status: "concluida" }),
];
const tarefas = new Map([["t1", t]]);

describe("registro", () => {
  it("gera narrativa agrupada e mascara valores", () => {
    const s = gerarSecoes({
      voz: "eu",
      cliente: "Farm",
      ref: "2026-10-24",
      dias: 1,
      eventos: evs,
      tarefas,
      abertas: [],
      enriq: { checklist: new Map([["t1", { feito: 2, total: 2 }]]), comentarios: new Map(), destravou: new Map() },
      pessoas: new Map([["u1", "Ana"]]),
    });
    expect(s.entregas).toContain("concluí");
    expect(s.entregas).toContain("Checklist 2/2");
    expect(s.entregas).not.toContain("5.000");
    expect(s.entregas.split("\n")).toHaveLength(1);
  });
  it("estatísticas contam concluídas e plano", () => {
    const e = estatisticas({ ref: "2026-10-24", dias: 1, eventos: evs, tarefas, abertas: [] });
    expect(e.kpis.concluidas).toBe(1);
    expect(e.plano).toEqual({ planejado: 1, entregue: 1, extra: 0 });
  });
  it("mesclar preserva seção editada e ida e volta de texto", () => {
    const base = textoParaSecoes(secoesParaTexto("T", { resumo: "a", entregas: "b", andamento: "", bloqueios: "", proximos: "", obs: "" }));
    const atual = { ...base, resumo: "editado" };
    const nova = { ...base, resumo: "novo", entregas: "b2" };
    const r = mesclar(atual, base, nova);
    expect(r.resumo).toBe("editado");
    expect(r.entregas).toBe("b2");
  });
});
