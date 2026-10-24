import { db } from "../drizzle.js";
import { tarefa } from "../schema/tarefa.js";
import type { PESSOA_IDS } from "./pessoas.js";
import type { PROJETO_IDS } from "./projetos.js";

type Prioridade = "critica" | "alta" | "media" | "baixa";
type Status =
  | "backlog"
  | "a_fazer"
  | "em_andamento"
  | "aguardando"
  | "revisao"
  | "concluida"
  | "cancelada";

function t(
  orgId: string,
  projetoId: string,
  titulo: string,
  responsavelId: string,
  prioridade: Prioridade,
  status: Status,
  extra?: Partial<{
    urgencia: number;
    esforco: number;
    estimativaHoras: string;
    categoria: string;
  }>,
) {
  return {
    orgId,
    projetoId,
    titulo,
    responsavelId,
    prioridade,
    status,
    urgencia: extra?.urgencia ?? 3,
    esforco: extra?.esforco ?? 3,
    estimativaHoras: extra?.estimativaHoras,
    categoria: extra?.categoria,
    origem: "ui" as const,
  };
}

export async function seedTarefas(
  orgId: string,
  projetos: typeof PROJETO_IDS,
  pessoas: typeof PESSOA_IDS,
) {
  const tarefas = [
    // Farmácia Contábil — Ana (sobrecarregada)
    t(
      orgId,
      projetos.farmContabil,
      "Conciliação bancária outubro",
      pessoas.ana,
      "alta",
      "em_andamento",
      { categoria: "conciliacao" },
    ),
    t(orgId, projetos.farmContabil, "Lançamentos NF entrada", pessoas.ana, "media", "a_fazer", {
      categoria: "lancamentos",
    }),
    t(orgId, projetos.farmContabil, "Balancete setembro", pessoas.ana, "alta", "concluida", {
      categoria: "balancete",
    }),
    t(
      orgId,
      projetos.farmContabil,
      "Classificação despesas set",
      pessoas.ana,
      "media",
      "concluida",
      { categoria: "classificacao" },
    ),
    t(orgId, projetos.farmContabil, "DRE trimestral Q3", pessoas.ana, "critica", "em_andamento", {
      urgencia: 5,
      esforco: 4,
      categoria: "relatorio",
    }),
    t(
      orgId,
      projetos.farmContabil,
      "Conferência estoque farmácia",
      pessoas.ana,
      "media",
      "backlog",
      { categoria: "estoque" },
    ),
    t(orgId, projetos.farmContabil, "Ajustes SPED Contábil", pessoas.ana, "alta", "aguardando", {
      categoria: "sped",
    }),
    t(orgId, projetos.farmContabil, "Importação OFX Bradesco", pessoas.ana, "baixa", "a_fazer", {
      categoria: "importacao",
    }),
    t(
      orgId,
      projetos.farmContabil,
      "Fechamento mensal setembro",
      pessoas.ana,
      "critica",
      "concluida",
      { urgencia: 5, categoria: "fechamento" },
    ),
    t(
      orgId,
      projetos.farmContabil,
      "Conciliação cartão PagSeguro",
      pessoas.ana,
      "media",
      "backlog",
      { categoria: "conciliacao" },
    ),

    // Farmácia Contábil — tarefas extras para Ana
    t(orgId, projetos.farmContabil, "Provisão 13° salário", pessoas.ana, "alta", "a_fazer", {
      categoria: "provisao",
    }),
    t(
      orgId,
      projetos.farmContabil,
      "Conferência DARF recolhidos",
      pessoas.ana,
      "media",
      "backlog",
      { categoria: "conferencia" },
    ),
    t(
      orgId,
      projetos.farmContabil,
      "Atualização plano de contas",
      pessoas.ana,
      "baixa",
      "backlog",
      { categoria: "plano-contas" },
    ),

    // Farmácia Fiscal — Pedro
    t(
      orgId,
      projetos.farmFiscal,
      "Apuração ICMS outubro",
      pessoas.pedro,
      "critica",
      "em_andamento",
      { urgencia: 5, categoria: "icms" },
    ),
    t(orgId, projetos.farmFiscal, "SPED Fiscal setembro", pessoas.pedro, "alta", "concluida", {
      categoria: "sped",
    }),
    t(orgId, projetos.farmFiscal, "GIA-ST conferência", pessoas.pedro, "media", "a_fazer", {
      categoria: "gia",
    }),
    t(
      orgId,
      projetos.farmFiscal,
      "Notas devolvidas — regularização",
      pessoas.pedro,
      "alta",
      "aguardando",
      { categoria: "notas" },
    ),
    t(orgId, projetos.farmFiscal, "EFD Contribuições", pessoas.pedro, "media", "backlog", {
      categoria: "efd",
    }),
    t(orgId, projetos.farmFiscal, "Consulta NCM manipulados", pessoas.pedro, "baixa", "backlog", {
      categoria: "ncm",
    }),

    // Farmácia DP — Júlia
    t(orgId, projetos.farmDP, "Folha de pagamento outubro", pessoas.julia, "critica", "a_fazer", {
      urgencia: 5,
      esforco: 4,
      categoria: "folha",
    }),
    t(orgId, projetos.farmDP, "Admissão novo farmacêutico", pessoas.julia, "alta", "em_andamento", {
      categoria: "admissao",
    }),
    t(orgId, projetos.farmDP, "eSocial eventos periódicos", pessoas.julia, "alta", "a_fazer", {
      categoria: "esocial",
    }),
    t(orgId, projetos.farmDP, "Rescisão Cláudia Santos", pessoas.julia, "critica", "concluida", {
      categoria: "rescisao",
    }),
    t(orgId, projetos.farmDP, "FGTS Digital conferência", pessoas.julia, "media", "backlog", {
      categoria: "fgts",
    }),

    // Advocacia Tributário — Lucas
    t(
      orgId,
      projetos.advTributario,
      "Diagnóstico carga tributária",
      pessoas.lucas,
      "critica",
      "em_andamento",
      { urgencia: 4, esforco: 5, categoria: "diagnostico" },
    ),
    t(
      orgId,
      projetos.advTributario,
      "Simulação Lucro Real x Presumido",
      pessoas.lucas,
      "alta",
      "a_fazer",
      { categoria: "simulacao" },
    ),
    t(
      orgId,
      projetos.advTributario,
      "Revisão contratos fornecedores",
      pessoas.lucas,
      "media",
      "backlog",
      { categoria: "revisao" },
    ),
    t(orgId, projetos.advTributario, "Parecer IRPJ/CSLL", pessoas.lucas, "alta", "em_andamento", {
      categoria: "parecer",
    }),
    t(
      orgId,
      projetos.advTributario,
      "Levantamento créditos PIS/COFINS",
      pessoas.lucas,
      "media",
      "a_fazer",
      { esforco: 4, categoria: "creditos" },
    ),

    // Advocacia Societário — Lucas (planejado)
    t(
      orgId,
      projetos.advSocietario,
      "Análise contrato social vigente",
      pessoas.lucas,
      "alta",
      "backlog",
      { categoria: "analise" },
    ),
    t(
      orgId,
      projetos.advSocietario,
      "Proposta nova estrutura societária",
      pessoas.lucas,
      "critica",
      "backlog",
      { urgencia: 4, esforco: 5, categoria: "proposta" },
    ),

    // Milligrama Contábil — Ana
    t(
      orgId,
      projetos.millContabil,
      "Conciliação bancária outubro",
      pessoas.ana,
      "alta",
      "a_fazer",
      { categoria: "conciliacao" },
    ),
    t(
      orgId,
      projetos.millContabil,
      "Custo de produção linha facial",
      pessoas.ana,
      "critica",
      "em_andamento",
      { urgencia: 4, esforco: 5, categoria: "custo" },
    ),
    t(orgId, projetos.millContabil, "Balanço patrimonial Q3", pessoas.ana, "alta", "revisao", {
      categoria: "balanco",
    }),
    t(orgId, projetos.millContabil, "Lançamentos NF saída", pessoas.ana, "media", "a_fazer", {
      categoria: "lancamentos",
    }),
    t(orgId, projetos.millContabil, "Conciliação fornecedores", pessoas.ana, "media", "backlog", {
      categoria: "conciliacao",
    }),

    // Milligrama Fiscal — Pedro
    t(
      orgId,
      projetos.millFiscal,
      "ICMS-ST cosméticos outubro",
      pessoas.pedro,
      "critica",
      "em_andamento",
      { urgencia: 5, categoria: "icms" },
    ),
    t(orgId, projetos.millFiscal, "SPED Fiscal setembro", pessoas.pedro, "alta", "concluida", {
      categoria: "sped",
    }),
    t(
      orgId,
      projetos.millFiscal,
      "Diferencial de alíquota interestadual",
      pessoas.pedro,
      "alta",
      "a_fazer",
      { categoria: "difal" },
    ),
    t(
      orgId,
      projetos.millFiscal,
      "Classificação fiscal novos produtos",
      pessoas.pedro,
      "media",
      "em_andamento",
      { categoria: "classificacao" },
    ),
    t(orgId, projetos.millFiscal, "Conferência XML x DANFE", pessoas.pedro, "media", "backlog", {
      categoria: "conferencia",
    }),

    // Milligrama Expansão — Márcia
    t(
      orgId,
      projetos.millExpansao,
      "Estudo de viabilidade linha capilar",
      pessoas.marcia,
      "critica",
      "em_andamento",
      { urgencia: 5, esforco: 5, categoria: "viabilidade" },
    ),
    t(
      orgId,
      projetos.millExpansao,
      "Orçamento capex equipamentos",
      pessoas.marcia,
      "alta",
      "a_fazer",
      { categoria: "orcamento" },
    ),
    t(orgId, projetos.millExpansao, "Projeção DRE 12 meses", pessoas.ana, "alta", "a_fazer", {
      esforco: 4,
      categoria: "projecao",
    }),
    t(
      orgId,
      projetos.millExpansao,
      "Análise fornecedores matéria-prima",
      pessoas.lucas,
      "media",
      "backlog",
      { categoria: "analise" },
    ),
    t(
      orgId,
      projetos.millExpansao,
      "Licenças ANVISA — levantamento",
      pessoas.julia,
      "alta",
      "aguardando",
      { categoria: "licenca" },
    ),

    // Mais tarefas para Ana (sobrecarregada conforme spec)
    t(orgId, projetos.farmContabil, "Livro Razão auxiliar", pessoas.ana, "baixa", "backlog", {
      categoria: "razao",
    }),
    t(
      orgId,
      projetos.farmContabil,
      "Conferência depreciação imobilizado",
      pessoas.ana,
      "media",
      "backlog",
      { categoria: "depreciacao" },
    ),
    t(orgId, projetos.millContabil, "Provisão férias novembro", pessoas.ana, "alta", "backlog", {
      categoria: "provisao",
    }),
    t(
      orgId,
      projetos.millContabil,
      "Relatório gerencial diretoria",
      pessoas.ana,
      "critica",
      "a_fazer",
      { urgencia: 4, esforco: 4, categoria: "relatorio" },
    ),
  ];

  await db.insert(tarefa).values(tarefas);
}
