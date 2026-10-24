import { db } from "../drizzle.js";
import { registroDiario } from "../schema/registro-diario.js";
import type { CLIENTE_IDS } from "./clientes.js";
import type { PESSOA_IDS } from "./pessoas.js";

export async function seedRegistros(
  orgId: string,
  pessoas: typeof PESSOA_IDS,
  clientes: typeof CLIENTE_IDS,
) {
  await db.insert(registroDiario).values([
    {
      orgId,
      pessoaId: pessoas.ana,
      clienteId: clientes.farmacia,
      data: "2026-10-21",
      oQueFiz: "Conciliação bancária Bradesco e Santander. Lançamento de 47 NFs de entrada.",
      oQueSubi: "Planilha conciliação outubro no Drive",
      oQueDescobri: "Duas NFs com CFOP incorreto — devolvidas para o cliente corrigir",
      pendencias: JSON.stringify(["Aguardando NFs corrigidas do cliente"]),
      precisaAprovacao: false,
      publicado: true,
    },
    {
      orgId,
      pessoaId: pessoas.ana,
      clienteId: clientes.industria,
      data: "2026-10-21",
      oQueFiz: "Apuração custo de produção linha facial — falta dados de embalagem",
      oQueDescobri: "Fornecedor trocou composição do frasco — impacta custo unitário em ~4%",
      pendencias: JSON.stringify(["Pedir planilha embalagens atualizada para Fernanda"]),
      precisaAprovacao: false,
      publicado: true,
    },
    {
      orgId,
      pessoaId: pessoas.pedro,
      clienteId: clientes.farmacia,
      data: "2026-10-21",
      oQueFiz: "SPED Fiscal transmitido. Conferência GIA-ST em andamento.",
      oQueSubi: "Recibo SPED no Drive",
      precisaAprovacao: false,
      publicado: true,
    },
    {
      orgId,
      pessoaId: pessoas.pedro,
      clienteId: clientes.industria,
      data: "2026-10-21",
      oQueFiz: "Apuração ICMS-ST cosméticos — verificando alíquotas MVA atualizada",
      oQueDescobri: "MVA ajustada para cosméticos mudou em outubro/2026 conforme Portaria SEFAZ",
      pendencias: JSON.stringify(["Aplicar nova MVA nas próximas NFs"]),
      precisaAprovacao: true,
      publicado: false,
    },
    {
      orgId,
      pessoaId: pessoas.julia,
      clienteId: clientes.farmacia,
      data: "2026-10-21",
      oQueFiz: "Admissão do farmacêutico — documentos recebidos, exame admissional agendado",
      oQueSubi: "Check-list admissional preenchido",
      pendencias: JSON.stringify(["Aguardar resultado exame admissional (23/10)"]),
      precisaAprovacao: false,
      publicado: true,
    },
    {
      orgId,
      pessoaId: pessoas.lucas,
      clienteId: clientes.advocacia,
      data: "2026-10-22",
      oQueFiz:
        "Reunião com Dr. Henrique — apresentação diagnóstico tributário. Alinhamento de próximos passos.",
      oQueDescobri:
        "Escritório tem débitos de IRPJ que podem ser compensados com créditos PIS/COFINS acumulados",
      pedidoAoCliente: "Enviar extratos do e-CAC dos últimos 5 anos",
      precisaAprovacao: false,
      publicado: true,
    },
    {
      orgId,
      pessoaId: pessoas.ana,
      clienteId: clientes.farmacia,
      data: "2026-10-22",
      oQueFiz: "DRE trimestral Q3 — 80% pronto, falta rateio de despesas administrativas",
      pendencias: JSON.stringify([
        "Critério de rateio precisa aprovação da diretoria",
        "Falta nota do aluguel de outubro",
      ]),
      precisaAprovacao: true,
      publicado: false,
    },
    {
      orgId,
      pessoaId: pessoas.marcia,
      clienteId: clientes.industria,
      data: "2026-10-22",
      oQueFiz:
        "Estudo de viabilidade linha capilar — consolidação projeções de custo e receita. Reunião com Fernanda.",
      oQueDescobri: "Margem líquida projetada de 18% — acima do mínimo de 15% da diretoria",
      oQueSubi: "Planilha viabilidade v3 no Drive",
      precisaAprovacao: false,
      publicado: true,
    },
    {
      orgId,
      pessoaId: pessoas.ana,
      clienteId: clientes.industria,
      data: "2026-10-22",
      oQueFiz: "Balanço patrimonial Q3 Milligrama — revisão final antes de enviar para Márcia",
      pendencias: JSON.stringify(["Aguardando conferência final de Márcia"]),
      precisaAprovacao: false,
      publicado: true,
    },
    {
      orgId,
      pessoaId: pessoas.pedro,
      clienteId: clientes.industria,
      data: "2026-10-22",
      oQueFiz: "Classificação fiscal dos 3 novos produtos da linha capilar — NCMs definidos",
      oQueSubi: "Tabela NCM produtos capilares no Drive",
      oQueDescobri:
        "Um dos produtos pode se enquadrar como cosmético com ICMS-ST menor (NCM 3305.10.00)",
      precisaAprovacao: false,
      publicado: true,
    },
  ]);
}
