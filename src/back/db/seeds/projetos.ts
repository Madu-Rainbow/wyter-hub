import { db } from "../drizzle.js";
import { projeto } from "../schema/projeto.js";
import type { CLIENTE_IDS } from "./clientes.js";
import type { PESSOA_IDS } from "./pessoas.js";

export const PROJETO_IDS = {
  farmContabil: "00000000-0000-4000-8000-000000000030",
  farmFiscal: "00000000-0000-4000-8000-000000000031",
  farmDP: "00000000-0000-4000-8000-000000000032",
  advTributario: "00000000-0000-4000-8000-000000000033",
  advSocietario: "00000000-0000-4000-8000-000000000034",
  millContabil: "00000000-0000-4000-8000-000000000035",
  millFiscal: "00000000-0000-4000-8000-000000000036",
  millExpansao: "00000000-0000-4000-8000-000000000037",
};

export async function seedProjetos(
  orgId: string,
  clientes: typeof CLIENTE_IDS,
  pessoas: typeof PESSOA_IDS,
) {
  await db.insert(projeto).values([
    {
      id: PROJETO_IDS.farmContabil,
      orgId,
      clienteId: clientes.farmacia,
      nome: "Contabilidade Mensal",
      tipo: "continuo",
      frente: "contabil",
      dataInicio: "2026-01-01",
      status: "em_andamento",
      responsavelId: pessoas.ana,
    },
    {
      id: PROJETO_IDS.farmFiscal,
      orgId,
      clienteId: clientes.farmacia,
      nome: "Fiscal e Tributário",
      tipo: "continuo",
      frente: "fiscal",
      dataInicio: "2026-01-01",
      status: "em_andamento",
      responsavelId: pessoas.pedro,
    },
    {
      id: PROJETO_IDS.farmDP,
      orgId,
      clienteId: clientes.farmacia,
      nome: "Departamento Pessoal",
      tipo: "continuo",
      frente: "dp",
      dataInicio: "2026-03-01",
      status: "em_andamento",
      responsavelId: pessoas.julia,
    },
    {
      id: PROJETO_IDS.advTributario,
      orgId,
      clienteId: clientes.advocacia,
      nome: "Planejamento Tributário 2026",
      tipo: "pontual",
      frente: "tributario",
      dataInicio: "2026-06-01",
      dataFim: "2026-12-31",
      status: "em_andamento",
      responsavelId: pessoas.lucas,
    },
    {
      id: PROJETO_IDS.advSocietario,
      orgId,
      clienteId: clientes.advocacia,
      nome: "Reestruturação Societária",
      tipo: "pontual",
      frente: "societario",
      dataInicio: "2026-08-01",
      dataFim: "2026-11-30",
      status: "planejado",
      responsavelId: pessoas.lucas,
    },
    {
      id: PROJETO_IDS.millContabil,
      orgId,
      clienteId: clientes.industria,
      nome: "Contabilidade Mensal",
      tipo: "continuo",
      frente: "contabil",
      dataInicio: "2026-01-01",
      status: "em_andamento",
      responsavelId: pessoas.ana,
    },
    {
      id: PROJETO_IDS.millFiscal,
      orgId,
      clienteId: clientes.industria,
      nome: "Fiscal e ICMS",
      tipo: "continuo",
      frente: "fiscal",
      dataInicio: "2026-01-01",
      status: "em_andamento",
      responsavelId: pessoas.pedro,
    },
    {
      id: PROJETO_IDS.millExpansao,
      orgId,
      clienteId: clientes.industria,
      parentId: PROJETO_IDS.millContabil,
      nome: "Expansão Linha Capilar",
      tipo: "pontual",
      frente: "contabil",
      dataInicio: "2026-09-01",
      dataFim: "2027-03-31",
      status: "em_andamento",
      responsavelId: pessoas.marcia,
    },
  ]);

  return PROJETO_IDS;
}
