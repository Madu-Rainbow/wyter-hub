import { db } from "../drizzle.js";
import { aprovacao } from "../schema/aprovacao.js";
import type { PESSOA_IDS } from "./pessoas.js";

export async function seedAprovacoes(orgId: string, pessoas: typeof PESSOA_IDS) {
  await db.insert(aprovacao).values([
    {
      orgId,
      solicitanteId: pessoas.lucas,
      aprovadorId: pessoas.marcia,
      situacaoAtual:
        "Cliente Ribeiro solicitou inclusão de análise societária no escopo tributário",
      riscoSeNaoFizer: "Perda de oportunidade de cross-sell e insatisfação do cliente",
      manutencaoFutura: "Demandará ~8h/mês de consultoria adicional",
      custo: "2400.00",
      status: "pendente",
    },
    {
      orgId,
      solicitanteId: pessoas.ana,
      aprovadorId: pessoas.marcia,
      situacaoAtual: "Necessário contratar sistema de conciliação automática para Milligrama",
      riscoSeNaoFizer: "Atraso recorrente no fechamento mensal — 2 dias extras/mês",
      manutencaoFutura: "Licença mensal do software + treinamento inicial",
      custo: "350.00",
      status: "pendente",
    },
    {
      orgId,
      solicitanteId: pessoas.julia,
      aprovadorId: pessoas.marcia,
      situacaoAtual:
        "Farmácia Vida Plena quer migrar folha para novo sistema eSocial antes do prazo legal",
      riscoSeNaoFizer: "Possível multa por não-conformidade após janeiro 2027",
      manutencaoFutura: "Integração com novo layout requer ajuste único + manutenção trimestral",
      status: "pendente",
    },
    {
      orgId,
      solicitanteId: pessoas.pedro,
      aprovadorId: pessoas.lucas,
      situacaoAtual: "Solicito acesso ao portal da SEFAZ-MT com certificado digital do escritório",
      riscoSeNaoFizer: "Depender de acesso manual do cliente para consultas de ICMS",
      manutencaoFutura: "Renovação anual do certificado A1",
      custo: "180.00",
      status: "aprovada",
      decisaoComentario: "Aprovado. Comprar A1 no nome do escritório.",
      decididaEm: new Date("2026-10-15"),
    },
  ]);
}
