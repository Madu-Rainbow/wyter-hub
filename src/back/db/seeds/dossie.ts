import { db } from "../drizzle.js";
import { dossieCliente } from "../schema/dossie-cliente.js";
import type { CLIENTE_IDS } from "./clientes.js";

export async function seedDossie(orgId: string, clientes: typeof CLIENTE_IDS) {
  await db.insert(dossieCliente).values([
    {
      orgId,
      clienteId: clientes.farmacia,
      tipo: "fato",
      conteudo: "Regime tributário: Lucro Real. Enquadramento desde 2024.",
      fonte: "Contrato social + consulta CNPJ",
      dataReferencia: "2024-01-01",
      confianca: "fato",
    },
    {
      orgId,
      clienteId: clientes.farmacia,
      tipo: "pessoa_chave",
      conteudo:
        "Dr. Roberto Almeida — proprietário e farmacêutico responsável. Decide tudo pessoalmente. Prefere comunicação por WhatsApp.",
      fonte: "Reunião inicial",
      confianca: "fato",
    },
    {
      orgId,
      clienteId: clientes.farmacia,
      tipo: "restricao",
      conteudo:
        "Não aceita mudanças no sistema ERP (Tiny). Qualquer integração deve ser via exportação de XML.",
      fonte: "Reunião com Dr. Roberto — março/2026",
      dataReferencia: "2026-03-10",
      confianca: "fato",
    },
    {
      orgId,
      clienteId: clientes.farmacia,
      tipo: "sistema",
      conteudo:
        "ERP: Tiny. Emissor NF: próprio Tiny. Banco principal: Bradesco + Santander. Conta PJ e conta investimento.",
      fonte: "Onboarding",
      confianca: "fato",
    },
    {
      orgId,
      clienteId: clientes.advocacia,
      tipo: "fato",
      conteudo: "Regime tributário: Lucro Presumido. Faturamento anual ~R$ 2,4M.",
      fonte: "Documentação entregue no onboarding",
      confianca: "fato",
    },
    {
      orgId,
      clienteId: clientes.advocacia,
      tipo: "decisao",
      conteudo:
        "Diretoria decidiu avaliar migração para Lucro Real no planejamento 2026. Decisão final até dezembro.",
      fonte: "Reunião com Dr. Henrique — outubro/2026",
      dataReferencia: "2026-10-22",
      confianca: "fato",
    },
    {
      orgId,
      clienteId: clientes.advocacia,
      tipo: "pessoa_chave",
      conteudo:
        "Dr. Henrique Ribeiro — sócio majoritário. Centraliza decisões financeiras. Comunica por e-mail formal.",
      fonte: "Onboarding",
      confianca: "fato",
    },
    {
      orgId,
      clienteId: clientes.industria,
      tipo: "fato",
      conteudo:
        "Regime tributário: Lucro Real. Indústria com ICMS-ST em cosméticos. Faturamento anual ~R$ 6M.",
      fonte: "Documentação fiscal + DRE 2025",
      confianca: "fato",
    },
    {
      orgId,
      clienteId: clientes.industria,
      tipo: "decisao",
      conteudo:
        "Expansão para linha de produtos capilares aprovada pela diretoria. Previsão de início de produção em Q1/2027.",
      fonte: "Reunião Fernanda + Márcia — setembro/2026",
      dataReferencia: "2026-09-15",
      confianca: "fato",
    },
    {
      orgId,
      clienteId: clientes.industria,
      tipo: "sistema",
      conteudo: "ERP: SAP Business One. NF-e: emitida pelo SAP. Banco principal: Itaú. Folha: ADP.",
      fonte: "Onboarding",
      confianca: "fato",
    },
    {
      orgId,
      clienteId: clientes.industria,
      tipo: "glossario",
      conteudo:
        "MVA = Margem de Valor Agregado. Usada para cálculo da base de ICMS-ST em cosméticos. Atualizada por portaria SEFAZ-MT.",
      fonte: "Equipe fiscal",
      confianca: "fato",
    },
    {
      orgId,
      clienteId: clientes.industria,
      tipo: "restricao",
      conteudo:
        "ANVISA exige registro para novos produtos cosméticos. Processo leva 60-120 dias. Não iniciar produção sem registro.",
      fonte: "Fernanda Lima — reunião expansão capilar",
      dataReferencia: "2026-09-15",
      confianca: "fato",
    },
  ]);
}
