import { sql } from "drizzle-orm";
import { db } from "../src/back/db/drizzle.js";
import { aprovacao } from "../src/back/db/schema/aprovacao.js";
import { cliente } from "../src/back/db/schema/cliente.js";
import { contrato } from "../src/back/db/schema/contrato.js";
import { dossieCliente } from "../src/back/db/schema/dossie-cliente.js";
import { emailAutorizado } from "../src/back/db/schema/email-autorizado.js";
import { evento } from "../src/back/db/schema/evento.js";
import { organizacao } from "../src/back/db/schema/organizacao.js";
import { pessoa } from "../src/back/db/schema/pessoa.js";
import { projeto } from "../src/back/db/schema/projeto.js";
import { registroDiario } from "../src/back/db/schema/registro-diario.js";
import { tarefa } from "../src/back/db/schema/tarefa.js";

async function seed() {
  console.log("Limpando tabelas...");
  await db.execute(sql`TRUNCATE
    evento, dossie_cliente, registro_diario, aprovacao,
    tarefa, contrato, projeto, email_autorizado,
    cliente, pessoa, organizacao
    CASCADE`);

  console.log("Criando organização...");
  const [org] = await db
    .insert(organizacao)
    .values({ nome: "Wyter Consultoria", slug: "wyter" })
    .returning();

  console.log("Criando equipe (5 pessoas fictícias)...");
  const pessoasData = [
    {
      nome: "Ana Borges",
      email: "ana.borges@ficticio.com",
      papel: "diretor" as const,
      cargo: "Diretora Executiva",
      capacidadeSemanalHoras: 40,
    },
    {
      nome: "Carlos Mendes",
      email: "carlos.mendes@ficticio.com",
      papel: "consultor" as const,
      cargo: "Consultor Sênior",
      capacidadeSemanalHoras: 40,
    },
    {
      nome: "Daniela Torres",
      email: "daniela.torres@ficticio.com",
      papel: "consultor" as const,
      cargo: "Consultora Plena",
      capacidadeSemanalHoras: 40,
    },
    {
      nome: "Eduardo Lima",
      email: "eduardo.lima@ficticio.com",
      papel: "analista" as const,
      cargo: "Analista",
      capacidadeSemanalHoras: 30,
    },
    {
      nome: "Fernanda Costa",
      email: "fernanda.costa@ficticio.com",
      papel: "convidado" as const,
      cargo: "Estagiária",
      capacidadeSemanalHoras: 20,
    },
  ];

  const pessoas = await db
    .insert(pessoa)
    .values(pessoasData.map((p) => ({ ...p, orgId: org.id })))
    .returning();

  const [ana, carlos, daniela, eduardo, fernanda] = pessoas;

  console.log("Cadastrando e-mails autorizados...");
  await db.insert(emailAutorizado).values(
    pessoasData.map((p) => ({
      orgId: org.id,
      email: p.email,
      adicionadoPorId: ana.id,
    })),
  );

  console.log("Criando 3 clientes fictícios...");
  const clientesData = [
    {
      razaoSocial: "Padaria Pão Dourado Ltda",
      nomeFantasia: "Pão Dourado",
      segmento: "Alimentação",
      cidade: "Cuiabá",
      uf: "MT",
      responsavelId: carlos.id,
      tags: ["alimentação", "mvp"],
    },
    {
      razaoSocial: "Construtora Horizonte S.A.",
      nomeFantasia: "Horizonte",
      segmento: "Construção Civil",
      cidade: "Várzea Grande",
      uf: "MT",
      responsavelId: daniela.id,
      tags: ["construção", "ativo"],
    },
    {
      razaoSocial: "Clínica Bem Viver ME",
      nomeFantasia: "Bem Viver",
      segmento: "Saúde",
      cidade: "Cuiabá",
      uf: "MT",
      responsavelId: carlos.id,
      tags: ["saúde", "novo"],
    },
  ];

  const clientes = await db
    .insert(cliente)
    .values(clientesData.map((c) => ({ ...c, orgId: org.id })))
    .returning();

  const [paoDourado, horizonte, bemViver] = clientes;

  console.log("Criando 8 projetos (incluindo sub-projetos)...");
  const projetosData = [
    {
      clienteId: paoDourado.id,
      nome: "Planejamento Tributário 2026",
      tipo: "pontual" as const,
      frente: "Tributário",
      status: "em_andamento" as const,
      responsavelId: carlos.id,
      dataInicio: "2026-01-15",
      dataFim: "2026-06-30",
    },
    {
      clienteId: paoDourado.id,
      nome: "Departamento Pessoal",
      tipo: "continuo" as const,
      frente: "RH",
      status: "em_andamento" as const,
      responsavelId: eduardo.id,
      dataInicio: "2026-01-01",
    },
    {
      clienteId: horizonte.id,
      nome: "Consultoria Estratégica",
      tipo: "pontual" as const,
      frente: "Estratégia",
      status: "em_andamento" as const,
      responsavelId: daniela.id,
      dataInicio: "2026-03-01",
      dataFim: "2026-12-31",
    },
    {
      clienteId: horizonte.id,
      nome: "Regularização Fiscal",
      tipo: "pontual" as const,
      frente: "Fiscal",
      status: "planejado" as const,
      responsavelId: carlos.id,
      dataInicio: "2026-07-01",
    },
    {
      clienteId: bemViver.id,
      nome: "Implantação Contábil",
      tipo: "pontual" as const,
      frente: "Contábil",
      status: "em_andamento" as const,
      responsavelId: daniela.id,
      dataInicio: "2026-08-01",
      dataFim: "2027-01-31",
    },
    {
      clienteId: bemViver.id,
      nome: "Assessoria Financeira Mensal",
      tipo: "continuo" as const,
      frente: "Financeiro",
      status: "em_andamento" as const,
      responsavelId: carlos.id,
      dataInicio: "2026-09-01",
    },
  ];

  const projetos = await db
    .insert(projeto)
    .values(projetosData.map((p) => ({ ...p, orgId: org.id })))
    .returning();

  const [
    tribPaoDourado,
    dpPaoDourado,
    estratHorizonte,
    fiscalHorizonte,
    contBemViver,
    finBemViver,
  ] = projetos;

  const subProjetos = await db
    .insert(projeto)
    .values([
      {
        orgId: org.id,
        clienteId: horizonte.id,
        parentId: estratHorizonte.id,
        nome: "Diagnóstico Organizacional",
        tipo: "pontual" as const,
        frente: "Estratégia",
        status: "concluido" as const,
        responsavelId: daniela.id,
        dataInicio: "2026-03-01",
        dataFim: "2026-04-30",
      },
      {
        orgId: org.id,
        clienteId: horizonte.id,
        parentId: estratHorizonte.id,
        nome: "Plano de Ação",
        tipo: "pontual" as const,
        frente: "Estratégia",
        status: "em_andamento" as const,
        responsavelId: daniela.id,
        dataInicio: "2026-05-01",
        dataFim: "2026-08-31",
      },
    ])
    .returning();

  const allProjects = [...projetos, ...subProjetos];

  console.log("Criando tarefas (~50 por spread de projetos)...");
  const statusOptions = [
    "backlog",
    "a_fazer",
    "em_andamento",
    "aguardando",
    "revisao",
    "concluida",
  ] as const;
  const prioridadeOptions = ["critica", "alta", "media", "baixa"] as const;
  const responsaveis = [carlos, daniela, eduardo, fernanda];

  const tarefasValues: Array<{
    orgId: string;
    projetoId: string;
    titulo: string;
    prioridade: (typeof prioridadeOptions)[number];
    status: (typeof statusOptions)[number];
    responsavelId: string;
    urgencia: number;
    esforco: number;
    origem: "ui";
  }> = [];

  const tarefasTitulos: Record<string, string[]> = {
    [tribPaoDourado.id]: [
      "Levantar documentação fiscal 2025",
      "Analisar regime tributário atual",
      "Simular Simples Nacional vs Lucro Presumido",
      "Preparar relatório comparativo",
      "Revisar NFs emitidas Q1/2026",
      "Mapear créditos de ICMS",
      "Elaborar parecer técnico",
      "Apresentar proposta ao cliente",
      "Ajustar enquadramento no e-CAC",
      "Revisar DCTF pendentes",
    ],
    [dpPaoDourado.id]: [
      "Processar folha outubro/2026",
      "Calcular 13º proporcional",
      "Conferir guias FGTS",
      "Atualizar registro de ponto",
      "Preparar rescisão funcionário #12",
      "Admitir novo colaborador",
      "Enviar eSocial eventos periódicos",
      "Gerar informe de rendimentos",
      "Revisar convenção coletiva 2026",
    ],
    [estratHorizonte.id]: [
      "Realizar entrevista com diretoria",
      "Mapear processos internos",
      "Analisar concorrentes regionais",
      "Elaborar SWOT",
      "Definir indicadores-chave (KPIs)",
      "Workshop com liderança",
      "Validar metas trimestrais",
      "Preparar apresentação executiva",
    ],
    [fiscalHorizonte.id]: [
      "Levantar pendências na Receita",
      "Solicitar certidões negativas",
      "Analisar auto de infração 2024",
      "Preparar defesa administrativa",
      "Negociar parcelamento PGFN",
    ],
    [contBemViver.id]: [
      "Configurar plano de contas",
      "Importar balancete anterior",
      "Classificar despesas operacionais",
      "Lançar NFs de serviço",
      "Conciliar extrato bancário set/2026",
      "Gerar DRE mensal",
      "Preparar balanço patrimonial",
      "Revisar obrigações acessórias",
    ],
    [finBemViver.id]: [
      "Projetar fluxo de caixa Q4/2026",
      "Analisar inadimplência",
      "Negociar taxa bancária",
      "Preparar relatório financeiro mensal",
      "Revisar contratos de fornecedores",
      "Simular cenários de investimento",
      "Elaborar orçamento 2027",
    ],
    [subProjetos[0].id]: [
      "Entrevistar gestores de área",
      "Mapear organograma atual",
      "Identificar gargalos operacionais",
    ],
    [subProjetos[1].id]: [
      "Priorizar ações por impacto",
      "Definir responsáveis e prazos",
      "Criar cronograma de implementação",
      "Acompanhar ação #1 — reestruturar compras",
    ],
  };

  for (const [projId, titulos] of Object.entries(tarefasTitulos)) {
    for (let i = 0; i < titulos.length; i++) {
      tarefasValues.push({
        orgId: org.id,
        projetoId: projId,
        titulo: titulos[i],
        prioridade: prioridadeOptions[i % prioridadeOptions.length],
        status: statusOptions[i % statusOptions.length],
        responsavelId: responsaveis[i % responsaveis.length].id,
        urgencia: (i % 5) + 1,
        esforco: (i % 5) + 1,
        origem: "ui",
      });
    }
  }

  const tarefas = await db.insert(tarefa).values(tarefasValues).returning();
  console.log(`  ${tarefas.length} tarefas criadas`);

  console.log("Criando contratos...");
  await db.insert(contrato).values([
    {
      orgId: org.id,
      clienteId: paoDourado.id,
      tipo: "Consultoria Tributária",
      vigenciaInicio: "2026-01-15",
      vigenciaFim: "2026-06-30",
      valor: "18000.00",
      formaPagamento: "6x de R$ 3.000",
      numero: "CT-2026-001",
    },
    {
      orgId: org.id,
      clienteId: paoDourado.id,
      tipo: "Departamento Pessoal",
      vigenciaInicio: "2026-01-01",
      valor: "2500.00",
      formaPagamento: "Mensal",
      numero: "CT-2026-002",
    },
    {
      orgId: org.id,
      clienteId: horizonte.id,
      tipo: "Consultoria Estratégica",
      vigenciaInicio: "2026-03-01",
      vigenciaFim: "2026-12-31",
      valor: "72000.00",
      formaPagamento: "10x de R$ 7.200",
      numero: "CT-2026-003",
    },
    {
      orgId: org.id,
      clienteId: bemViver.id,
      tipo: "Implantação Contábil + Assessoria",
      vigenciaInicio: "2026-08-01",
      vigenciaFim: "2027-01-31",
      valor: "24000.00",
      formaPagamento: "6x de R$ 4.000",
      numero: "CT-2026-004",
    },
  ]);

  console.log("Criando aprovações...");
  const tarefaParaAprovacao = tarefas.filter((t) => t.status === "aguardando").slice(0, 3);
  await db.insert(aprovacao).values(
    tarefaParaAprovacao.map((t, i) => ({
      orgId: org.id,
      tarefaId: t.id,
      solicitanteId: [carlos, daniela, eduardo][i % 3].id,
      aprovadorId: ana.id,
      situacaoAtual: [
        "Cliente solicitou alteração no regime tributário fora do escopo original",
        "Necessidade de contratação de sistema ERP para integração contábil",
        "Treinamento presencial adicional para equipe do cliente",
      ][i],
      riscoSeNaoFizer: [
        "Perda do prazo de opção pelo Simples Nacional em janeiro/2027",
        "Lançamentos manuais continuam gerando retrabalho e erros",
        "Equipe do cliente não consegue operar o novo sistema sozinha",
      ][i],
      manutencaoFutura: [
        "Acompanhamento trimestral do enquadramento, revisão anual",
        "Manutenção mensal do ERP, suporte técnico incluso no contrato",
        "Reciclagem semestral, material de apoio atualizado a cada versão",
      ][i],
      custo: ["0", "4500.00", "2800.00"][i],
      status: ["pendente", "pendente", "aprovada"][i] as "pendente" | "aprovada",
    })),
  );

  console.log("Criando registros diários...");
  const registros = [];
  const datasRegistro = ["2026-10-20", "2026-10-21", "2026-10-22"];
  for (const data of datasRegistro) {
    registros.push(
      {
        orgId: org.id,
        pessoaId: carlos.id,
        clienteId: paoDourado.id,
        data,
        oQueFiz: "Revisão das NFs de outubro e conferência de alíquotas ICMS.",
        oQueSubi: "Planilha comparativa de regimes no Drive.",
        oQueDescobri: "Cliente tem crédito acumulado de ICMS que não está usando.",
        publicado: true,
      },
      {
        orgId: org.id,
        pessoaId: daniela.id,
        clienteId: horizonte.id,
        data,
        oQueFiz: "Reunião com gerente de compras para mapear fluxo de aprovação.",
        oQueDescobri: "Processo de compras usa 3 sistemas diferentes sem integração.",
        precisaAprovacao: false,
        publicado: true,
      },
      {
        orgId: org.id,
        pessoaId: eduardo.id,
        clienteId: paoDourado.id,
        data,
        oQueFiz: "Processamento da folha de outubro, conferência de holerites.",
        trava: "Aguardando atestados médicos de 2 funcionários.",
        publicado: data !== "2026-10-22",
      },
    );
  }
  await db.insert(registroDiario).values(registros);

  console.log("Criando dossiê do cliente...");
  await db.insert(dossieCliente).values([
    {
      orgId: org.id,
      clienteId: paoDourado.id,
      tipo: "fato" as const,
      conteudo: "Faturamento mensal médio de R$ 180.000. Regime atual: Lucro Presumido.",
      fonte: "Documentação fiscal 2025",
      confianca: "fato" as const,
    },
    {
      orgId: org.id,
      clienteId: paoDourado.id,
      tipo: "decisao" as const,
      conteudo: "Decidido manter Lucro Presumido em 2026 após simulação. Reavaliar em set/2026.",
      fonte: "Reunião 15/01/2026 com Ana Borges",
      confianca: "fato" as const,
    },
    {
      orgId: org.id,
      clienteId: paoDourado.id,
      tipo: "pessoa_chave" as const,
      conteudo: "Sr. Joaquim Souza — proprietário, decide tudo. Prefere comunicação por WhatsApp.",
      confianca: "fato" as const,
    },
    {
      orgId: org.id,
      clienteId: horizonte.id,
      tipo: "fato" as const,
      conteudo: "50 funcionários, 3 obras simultâneas. CNAE principal: 4120-4/00.",
      fonte: "Contrato social atualizado",
      confianca: "fato" as const,
    },
    {
      orgId: org.id,
      clienteId: horizonte.id,
      tipo: "restricao" as const,
      conteudo: "Não compartilhar informações financeiras com gerentes de obra — apenas diretoria.",
      fonte: "Solicitação do diretor Ricardo Alves",
      confianca: "fato" as const,
    },
    {
      orgId: org.id,
      clienteId: horizonte.id,
      tipo: "sistema" as const,
      conteudo:
        "Usa Sienge para gestão de obras, Domínio para contabilidade, planilha Excel para compras.",
      confianca: "a_confirmar" as const,
    },
    {
      orgId: org.id,
      clienteId: bemViver.id,
      tipo: "fato" as const,
      conteudo: "Clínica com 12 profissionais de saúde. Faturamento crescente desde mar/2026.",
      fonte: "Balancete anterior",
      confianca: "fato" as const,
    },
    {
      orgId: org.id,
      clienteId: bemViver.id,
      tipo: "glossario" as const,
      conteudo:
        '"Guia TISS" = Troca de Informações na Saúde Suplementar — padrão obrigatório para faturamento de convênios.',
      confianca: "fato" as const,
    },
  ]);

  console.log("Registrando eventos de seed...");
  const agora = new Date();
  await db.insert(evento).values([
    {
      orgId: org.id,
      quemId: ana.id,
      entidade: "organizacao",
      entidadeId: org.id,
      verbo: "criar",
      depois: { nome: org.nome },
      origem: "ui" as const,
    },
    ...clientes.map((c) => ({
      orgId: org.id,
      quemId: ana.id,
      entidade: "cliente" as const,
      entidadeId: c.id,
      verbo: "criar",
      depois: { razaoSocial: c.razaoSocial },
      origem: "ui" as const,
      clienteId: c.id,
    })),
  ]);

  console.log("\nSeed concluído!");
  console.log(`  1 organização, ${pessoas.length} pessoas, ${clientes.length} clientes`);
  console.log(`  ${allProjects.length} projetos, ${tarefas.length} tarefas`);
  console.log(`  4 contratos, 3 aprovações, ${registros.length} registros diários, 8 dossiês`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});
