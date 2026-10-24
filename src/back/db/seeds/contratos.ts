import { db } from "../drizzle.js";
import { aditivo } from "../schema/aditivo.js";
import { contrato } from "../schema/contrato.js";
import { escopo } from "../schema/escopo.js";
import { escopoExtra } from "../schema/escopo-extra.js";
import type { CLIENTE_IDS } from "./clientes.js";

const CONTRATO_IDS = {
  farmacia: "00000000-0000-4000-8000-000000000040",
  milligrama: "00000000-0000-4000-8000-000000000041",
};

export async function seedContratos(orgId: string, clientes: typeof CLIENTE_IDS) {
  await db.insert(contrato).values([
    {
      id: CONTRATO_IDS.farmacia,
      orgId,
      clienteId: clientes.farmacia,
      tipo: "Honorários Contábeis",
      vigenciaInicio: "2026-01-01",
      vigenciaFim: "2026-12-31",
      valor: "4500.00",
      formaPagamento: "Boleto mensal — vencimento dia 10",
      numero: "WYT-2026-001",
    },
    {
      id: CONTRATO_IDS.milligrama,
      orgId,
      clienteId: clientes.industria,
      tipo: "Honorários Contábeis + Fiscal",
      vigenciaInicio: "2026-01-01",
      vigenciaFim: "2026-12-31",
      valor: "8500.00",
      formaPagamento: "Transferência mensal — vencimento dia 15",
      numero: "WYT-2026-002",
    },
  ]);

  await db.insert(aditivo).values([
    {
      orgId,
      contratoId: CONTRATO_IDS.farmacia,
      data: "2026-03-15",
      motivo: "Inclusão de serviços de Departamento Pessoal",
      impactoValor: "+R$ 1.200,00/mês",
      impactoPrazo: "Sem alteração",
      impactoEscopo: "Adição de folha de pagamento e eSocial",
    },
    {
      orgId,
      contratoId: CONTRATO_IDS.milligrama,
      data: "2026-09-01",
      motivo: "Expansão para linha capilar — nova frente contábil",
      impactoValor: "+R$ 2.000,00/mês durante projeto",
      impactoPrazo: "Até março 2027",
      impactoEscopo: "Contabilidade de custos da nova linha",
    },
  ]);

  await db.insert(escopo).values([
    { orgId, contratoId: CONTRATO_IDS.farmacia, descricao: "Escrituração contábil mensal" },
    {
      orgId,
      contratoId: CONTRATO_IDS.farmacia,
      descricao: "Apuração de impostos (ICMS, ISS, PIS, COFINS)",
    },
    {
      orgId,
      contratoId: CONTRATO_IDS.farmacia,
      descricao: "Obrigações acessórias (SPED, GIA, EFD)",
    },
    {
      orgId,
      contratoId: CONTRATO_IDS.milligrama,
      descricao: "Escrituração contábil e fiscal mensal",
    },
    { orgId, contratoId: CONTRATO_IDS.milligrama, descricao: "Apuração ICMS-ST cosméticos" },
    {
      orgId,
      contratoId: CONTRATO_IDS.milligrama,
      descricao: "Custo de produção e formação de preço",
    },
    { orgId, contratoId: CONTRATO_IDS.milligrama, descricao: "Relatório gerencial mensal" },
  ]);

  await db.insert(escopoExtra).values([
    {
      orgId,
      contratoId: CONTRATO_IDS.farmacia,
      clienteId: clientes.farmacia,
      descricao: "Consultoria para abertura de filial em Sinop-MT",
      status: "proposto",
    },
    {
      orgId,
      contratoId: CONTRATO_IDS.milligrama,
      clienteId: clientes.industria,
      descricao: "Due diligence para captação de investimento",
      status: "aprovado",
    },
    {
      orgId,
      clienteId: clientes.industria,
      descricao: "Levantamento de incentivos fiscais SUDECO",
      status: "proposto",
    },
  ]);
}
