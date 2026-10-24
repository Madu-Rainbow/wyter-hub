import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DATABASE_URL || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Faltam variáveis: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const sql = postgres(DATABASE_URL);
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  console.log("Limpando tabelas public...");
  await sql`TRUNCATE
    evento, dossie_cliente, registro_diario, aprovacao,
    tarefa, contrato, projeto, email_autorizado,
    cliente, pessoa, organizacao
    CASCADE`;

  console.log("Limpando auth...");
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  for (const u of existingUsers?.users ?? []) {
    await supabaseAdmin.auth.admin.deleteUser(u.id);
  }

  console.log("Criando organização...");
  const [org] = await sql`
    INSERT INTO organizacao (nome, slug)
    VALUES ('Wyter Consultoria', 'wyter')
    RETURNING id`;

  console.log("Criando usuário admin via Auth Admin API...");
  const testEmail = "admin@gmail.com";
  const testSenha = "admin@123";

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: testSenha,
    email_confirm: true,
    user_metadata: { full_name: "Ana Borges" },
  });

  if (authError || !authData.user) {
    throw new Error(`Erro ao criar user: ${authError?.message}`);
  }

  const authUserId = authData.user.id;
  console.log(`  User criado: ${authUserId}`);

  console.log("Criando equipe (5 pessoas fictícias)...");
  async function insertPessoa(
    orgId: string,
    authId: string | null,
    nome: string,
    email: string,
    papel: string,
    cargo: string,
    horas: number,
  ) {
    const [p] = await sql`
      INSERT INTO pessoa (org_id, auth_user_id, nome, email, papel, cargo, capacidade_semanal_horas)
      VALUES (${orgId}, ${authId}, ${nome}, ${email}, ${papel}::papel, ${cargo}, ${horas})
      RETURNING id, nome, papel`;
    return p;
  }

  const ana = await insertPessoa(
    org.id,
    authUserId,
    "Ana Borges",
    testEmail,
    "diretor",
    "Diretora Executiva",
    40,
  );
  const carlos = await insertPessoa(
    org.id,
    null,
    "Carlos Mendes",
    "carlos@ficticio.com",
    "consultor",
    "Consultor Sênior",
    40,
  );
  const daniela = await insertPessoa(
    org.id,
    null,
    "Daniela Torres",
    "daniela@ficticio.com",
    "consultor",
    "Consultora Plena",
    40,
  );
  const eduardo = await insertPessoa(
    org.id,
    null,
    "Eduardo Lima",
    "eduardo@ficticio.com",
    "analista",
    "Analista",
    30,
  );
  await insertPessoa(
    org.id,
    null,
    "Fernanda Costa",
    "fernanda@ficticio.com",
    "convidado",
    "Estagiária",
    20,
  );

  console.log("Cadastrando e-mails autorizados...");
  await sql`
    INSERT INTO email_autorizado (org_id, email, adicionado_por_id)
    VALUES
      (${org.id}, ${testEmail}, ${ana.id}),
      (${org.id}, 'carlos@ficticio.com', ${ana.id}),
      (${org.id}, 'daniela@ficticio.com', ${ana.id})`;

  console.log("Criando 3 clientes fictícios...");
  const clientes = await sql`
    INSERT INTO cliente (org_id, razao_social, nome_fantasia, segmento, cidade, uf, responsavel_id, tags)
    VALUES
      (${org.id}, 'Padaria Pão Dourado Ltda', 'Pão Dourado', 'Alimentação', 'Cuiabá', 'MT', ${carlos.id}, ARRAY['alimentação','mvp']),
      (${org.id}, 'Construtora Horizonte S.A.', 'Horizonte', 'Construção Civil', 'Várzea Grande', 'MT', ${daniela.id}, ARRAY['construção','ativo']),
      (${org.id}, 'Clínica Bem Viver ME', 'Bem Viver', 'Saúde', 'Cuiabá', 'MT', ${carlos.id}, ARRAY['saúde','novo'])
    RETURNING id, nome_fantasia`;

  const [paoDourado, horizonte, bemViver] = clientes;

  console.log("Criando projetos...");
  const projetos = await sql`
    INSERT INTO projeto (org_id, cliente_id, nome, tipo, frente, status, responsavel_id, data_inicio, data_fim)
    VALUES
      (${org.id}, ${paoDourado.id}, 'Planejamento Tributário 2026', 'pontual', 'Tributário', 'em_andamento', ${carlos.id}, '2026-01-15', '2026-06-30'),
      (${org.id}, ${paoDourado.id}, 'Departamento Pessoal', 'continuo', 'RH', 'em_andamento', ${eduardo.id}, '2026-01-01', NULL),
      (${org.id}, ${horizonte.id}, 'Consultoria Estratégica', 'pontual', 'Estratégia', 'em_andamento', ${daniela.id}, '2026-03-01', '2026-12-31'),
      (${org.id}, ${horizonte.id}, 'Regularização Fiscal', 'pontual', 'Fiscal', 'planejado', ${carlos.id}, '2026-07-01', NULL),
      (${org.id}, ${bemViver.id}, 'Implantação Contábil', 'pontual', 'Contábil', 'em_andamento', ${daniela.id}, '2026-08-01', '2027-01-31'),
      (${org.id}, ${bemViver.id}, 'Assessoria Financeira', 'continuo', 'Financeiro', 'em_andamento', ${carlos.id}, '2026-09-01', NULL)
    RETURNING id, nome`;

  const [tribPD, dpPD, estratH, , contBV, finBV] = projetos;

  console.log("Criando tarefas...");
  const tarefasTitulos: [(typeof projetos)[0], string[]][] = [
    [
      tribPD,
      [
        "Levantar documentação fiscal 2025",
        "Simular Simples vs Lucro Presumido",
        "Preparar relatório comparativo",
        "Revisar NFs Q1/2026",
        "Mapear créditos ICMS",
        "Elaborar parecer técnico",
      ],
    ],
    [
      dpPD,
      [
        "Processar folha outubro",
        "Calcular 13º proporcional",
        "Conferir guias FGTS",
        "Enviar eSocial periódicos",
      ],
    ],
    [
      estratH,
      [
        "Entrevistar diretoria",
        "Mapear processos internos",
        "Analisar concorrentes",
        "Elaborar SWOT",
        "Definir KPIs",
      ],
    ],
    [
      contBV,
      [
        "Configurar plano de contas",
        "Importar balancete anterior",
        "Classificar despesas",
        "Conciliar extrato bancário",
      ],
    ],
    [finBV, ["Projetar fluxo de caixa Q4", "Analisar inadimplência", "Preparar relatório mensal"]],
  ];

  const statusOpts = ["backlog", "a_fazer", "em_andamento", "aguardando", "revisao", "concluida"];
  const prioOpts = ["critica", "alta", "media", "baixa"];
  const responsaveis = [carlos, daniela, eduardo];
  let tarefaCount = 0;

  for (const [proj, titulos] of tarefasTitulos) {
    for (let i = 0; i < titulos.length; i++) {
      await sql`
        INSERT INTO tarefa (org_id, projeto_id, titulo, prioridade, status, responsavel_id, urgencia, esforco)
        VALUES (${org.id}, ${proj.id}, ${titulos[i]}, ${prioOpts[i % 4]}::prioridade, ${statusOpts[i % 6]}::tarefa_status, ${responsaveis[i % 3].id}, ${(i % 5) + 1}, ${(i % 5) + 1})`;
      tarefaCount++;
    }
  }

  console.log("Criando contratos...");
  await sql`
    INSERT INTO contrato (org_id, cliente_id, tipo, vigencia_inicio, vigencia_fim, valor, forma_pagamento, numero)
    VALUES
      (${org.id}, ${paoDourado.id}, 'Consultoria Tributária', '2026-01-15', '2026-06-30', 18000, '6x R$ 3.000', 'CT-2026-001'),
      (${org.id}, ${paoDourado.id}, 'Departamento Pessoal', '2026-01-01', NULL, 2500, 'Mensal', 'CT-2026-002'),
      (${org.id}, ${horizonte.id}, 'Consultoria Estratégica', '2026-03-01', '2026-12-31', 72000, '10x R$ 7.200', 'CT-2026-003'),
      (${org.id}, ${bemViver.id}, 'Implantação + Assessoria', '2026-08-01', '2027-01-31', 24000, '6x R$ 4.000', 'CT-2026-004')`;

  console.log("Criando dossiê...");
  await sql`
    INSERT INTO dossie_cliente (org_id, cliente_id, tipo, conteudo, fonte, confianca)
    VALUES
      (${org.id}, ${paoDourado.id}, 'fato', 'Faturamento médio R$ 180k/mês. Lucro Presumido.', 'Documentação fiscal 2025', 'fato'),
      (${org.id}, ${paoDourado.id}, 'pessoa_chave', 'Sr. Joaquim Souza — proprietário. Prefere WhatsApp.', NULL, 'fato'),
      (${org.id}, ${horizonte.id}, 'fato', '50 funcionários, 3 obras. CNAE 4120-4/00.', 'Contrato social', 'fato'),
      (${org.id}, ${horizonte.id}, 'restricao', 'Não compartilhar financeiro com gerentes de obra.', 'Diretor Ricardo Alves', 'fato'),
      (${org.id}, ${bemViver.id}, 'fato', '12 profissionais de saúde. Faturamento crescente.', 'Balancete', 'fato'),
      (${org.id}, ${bemViver.id}, 'glossario', 'Guia TISS = Troca de Informações na Saúde Suplementar.', NULL, 'fato')`;

  console.log("\n✓ Seed concluído!");
  console.log(`  1 org, 5 pessoas, ${clientes.length} clientes`);
  console.log(`  ${projetos.length} projetos, ${tarefaCount} tarefas, 4 contratos, 6 dossiês`);
  console.log(`\n  Login de teste: ${testEmail} / ${testSenha}`);

  await sql.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});
