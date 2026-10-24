-- =============================================================================
-- Wyter Hub — Seed de dados fictícios
-- Idempotente: limpa e recria. Rodar via `supabase db reset`.
-- =============================================================================

-- Limpar dados existentes (ordem reversa de FK)
TRUNCATE
  dossie_cliente, registro_diario, sincronizacao, integracao,
  escopo_extra, escopo, aditivo, contrato,
  aprovacao, comentario, anexo, evento,
  tarefa, projeto, contato_cliente, cliente,
  email_autorizado, pessoa, organizacao
CASCADE;

-- =============================================================================
-- IDs fixos
-- =============================================================================

-- Organizacao
-- org:      00000000-0000-4000-8000-000000000001

-- Pessoas
-- marcia:   00000000-0000-4000-8000-000000000010
-- lucas:    00000000-0000-4000-8000-000000000011
-- ana:      00000000-0000-4000-8000-000000000012
-- pedro:    00000000-0000-4000-8000-000000000013
-- julia:    00000000-0000-4000-8000-000000000014

-- Clientes
-- farmacia: 00000000-0000-4000-8000-000000000020
-- advocacia:00000000-0000-4000-8000-000000000021
-- industria:00000000-0000-4000-8000-000000000022

-- Projetos
-- farmContabil:  00000000-0000-4000-8000-000000000030
-- farmFiscal:    00000000-0000-4000-8000-000000000031
-- farmDP:        00000000-0000-4000-8000-000000000032
-- advTributario: 00000000-0000-4000-8000-000000000033
-- advSocietario: 00000000-0000-4000-8000-000000000034
-- millContabil:  00000000-0000-4000-8000-000000000035
-- millFiscal:    00000000-0000-4000-8000-000000000036
-- millExpansao:  00000000-0000-4000-8000-000000000037

-- Contratos
-- ctFarmacia:    00000000-0000-4000-8000-000000000040
-- ctMilligrama:  00000000-0000-4000-8000-000000000041

-- =============================================================================
-- 1. ORGANIZACAO
-- =============================================================================

INSERT INTO organizacao (id, nome, slug) VALUES
  ('00000000-0000-4000-8000-000000000001', 'Wyter Consultoria', 'wyter');

-- =============================================================================
-- 2. PESSOAS
-- =============================================================================

INSERT INTO pessoa (id, org_id, nome, email, papel, cargo, capacidade_semanal_horas, ativo) VALUES
  ('00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000001', 'Márcia Oliveira', 'marcia@wyter.com.br', 'diretor', 'Diretora de Operações', 40, true),
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', 'Lucas Ferreira', 'lucas@wyter.com.br', 'consultor', 'Consultor Sênior', 40, true),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', 'Ana Costa', 'ana@wyter.com.br', 'analista', 'Analista de Processos', 40, true),
  ('00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000001', 'Pedro Santos', 'pedro@wyter.com.br', 'analista', 'Analista Contábil', 40, true),
  ('00000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000001', 'Júlia Mendes', 'julia@wyter.com.br', 'analista', 'Analista Administrativa', 40, true);

-- =============================================================================
-- 3. EMAILS AUTORIZADOS
-- =============================================================================

INSERT INTO email_autorizado (org_id, email, adicionado_por_id) VALUES
  ('00000000-0000-4000-8000-000000000001', 'marcia@wyter.com.br', '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000001', 'lucas@wyter.com.br', '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000001', 'ana@wyter.com.br', '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000001', 'pedro@wyter.com.br', '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000001', 'julia@wyter.com.br', '00000000-0000-4000-8000-000000000010');

-- =============================================================================
-- 4. CLIENTES
-- =============================================================================

INSERT INTO cliente (id, org_id, razao_social, nome_fantasia, segmento, cidade, uf, status, responsavel_id, tags) VALUES
  ('00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000001', 'Farmácia Vida Plena LTDA', 'Farmácia Vida Plena', 'Saúde / Farmácia de Manipulação', 'Cuiabá', 'MT', 'ativo', '00000000-0000-4000-8000-000000000011', ARRAY['manipulacao', 'varejo', 'cuiaba']),
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000001', 'Ribeiro & Associados Advocacia', 'Ribeiro Advocacia', 'Jurídico', 'Cuiabá', 'MT', 'ativo', '00000000-0000-4000-8000-000000000011', ARRAY['advocacia', 'tributario', 'cuiaba']),
  ('00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000001', 'Milligrama Indústria e Comércio LTDA', 'Milligrama', 'Indústria / Cosméticos', 'Várzea Grande', 'MT', 'ativo', '00000000-0000-4000-8000-000000000010', ARRAY['industria', 'cosmeticos', 'varzea-grande']);

-- =============================================================================
-- 5. CONTATOS DOS CLIENTES
-- =============================================================================

INSERT INTO contato_cliente (org_id, cliente_id, nome, papel_no_cliente, email, telefone, canal_preferido) VALUES
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020', 'Dr. Roberto Almeida', 'decisor', 'roberto@vidaplena.com.br', '(65) 99999-0001', 'WhatsApp'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020', 'Carla Souza', 'operacional', 'carla@vidaplena.com.br', '(65) 99999-0002', 'E-mail'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000021', 'Dr. Henrique Ribeiro', 'decisor', 'henrique@ribeiro.adv.br', '(65) 99999-0003', 'E-mail'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000022', 'Fernanda Lima', 'decisor', 'fernanda@milligrama.com.br', '(65) 99999-0004', 'WhatsApp'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000022', 'Marcos Tavares', 'contador', 'marcos@contabil.com.br', '(65) 99999-0005', 'E-mail');

-- =============================================================================
-- 6. PROJETOS
-- =============================================================================

INSERT INTO projeto (id, org_id, cliente_id, parent_id, nome, tipo, frente, data_inicio, data_fim, status, responsavel_id) VALUES
  ('00000000-0000-4000-8000-000000000030', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020', NULL, 'Contabilidade Mensal', 'continuo', 'contabil', '2026-01-01', NULL, 'em_andamento', '00000000-0000-4000-8000-000000000012'),
  ('00000000-0000-4000-8000-000000000031', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020', NULL, 'Fiscal e Tributário', 'continuo', 'fiscal', '2026-01-01', NULL, 'em_andamento', '00000000-0000-4000-8000-000000000013'),
  ('00000000-0000-4000-8000-000000000032', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020', NULL, 'Departamento Pessoal', 'continuo', 'dp', '2026-03-01', NULL, 'em_andamento', '00000000-0000-4000-8000-000000000014'),
  ('00000000-0000-4000-8000-000000000033', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000021', NULL, 'Planejamento Tributário 2026', 'pontual', 'tributario', '2026-06-01', '2026-12-31', 'em_andamento', '00000000-0000-4000-8000-000000000011'),
  ('00000000-0000-4000-8000-000000000034', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000021', NULL, 'Reestruturação Societária', 'pontual', 'societario', '2026-08-01', '2026-11-30', 'planejado', '00000000-0000-4000-8000-000000000011'),
  ('00000000-0000-4000-8000-000000000035', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000022', NULL, 'Contabilidade Mensal', 'continuo', 'contabil', '2026-01-01', NULL, 'em_andamento', '00000000-0000-4000-8000-000000000012'),
  ('00000000-0000-4000-8000-000000000036', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000022', NULL, 'Fiscal e ICMS', 'continuo', 'fiscal', '2026-01-01', NULL, 'em_andamento', '00000000-0000-4000-8000-000000000013'),
  ('00000000-0000-4000-8000-000000000037', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000035', 'Expansão Linha Capilar', 'pontual', 'contabil', '2026-09-01', '2027-03-31', 'em_andamento', '00000000-0000-4000-8000-000000000010');

-- =============================================================================
-- 7. TAREFAS (~30, Ana sobrecarregada)
-- =============================================================================

INSERT INTO tarefa (org_id, projeto_id, titulo, responsavel_id, prioridade, status, urgencia, esforco, categoria, origem) VALUES
  -- Farmácia Contábil — Ana (sobrecarregada)
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000030', 'Conciliação bancária outubro', '00000000-0000-4000-8000-000000000012', 'alta', 'em_andamento', 3, 3, 'conciliacao', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000030', 'Lançamentos NF entrada', '00000000-0000-4000-8000-000000000012', 'media', 'a_fazer', 3, 3, 'lancamentos', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000030', 'Balancete setembro', '00000000-0000-4000-8000-000000000012', 'alta', 'concluida', 3, 3, 'balancete', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000030', 'DRE trimestral Q3', '00000000-0000-4000-8000-000000000012', 'critica', 'em_andamento', 5, 4, 'relatorio', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000030', 'Ajustes SPED Contábil', '00000000-0000-4000-8000-000000000012', 'alta', 'aguardando', 3, 3, 'sped', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000030', 'Provisão 13° salário', '00000000-0000-4000-8000-000000000012', 'alta', 'a_fazer', 3, 3, 'provisao', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000030', 'Importação OFX Bradesco', '00000000-0000-4000-8000-000000000012', 'baixa', 'a_fazer', 3, 3, 'importacao', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000030', 'Fechamento mensal setembro', '00000000-0000-4000-8000-000000000012', 'critica', 'concluida', 5, 3, 'fechamento', 'ui'),

  -- Farmácia Fiscal — Pedro
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000031', 'Apuração ICMS outubro', '00000000-0000-4000-8000-000000000013', 'critica', 'em_andamento', 5, 3, 'icms', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000031', 'SPED Fiscal setembro', '00000000-0000-4000-8000-000000000013', 'alta', 'concluida', 3, 3, 'sped', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000031', 'GIA-ST conferência', '00000000-0000-4000-8000-000000000013', 'media', 'a_fazer', 3, 3, 'gia', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000031', 'Notas devolvidas — regularização', '00000000-0000-4000-8000-000000000013', 'alta', 'aguardando', 3, 3, 'notas', 'ui'),

  -- Farmácia DP — Júlia
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000032', 'Folha de pagamento outubro', '00000000-0000-4000-8000-000000000014', 'critica', 'a_fazer', 5, 4, 'folha', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000032', 'Admissão novo farmacêutico', '00000000-0000-4000-8000-000000000014', 'alta', 'em_andamento', 3, 3, 'admissao', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000032', 'eSocial eventos periódicos', '00000000-0000-4000-8000-000000000014', 'alta', 'a_fazer', 3, 3, 'esocial', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000032', 'Rescisão Cláudia Santos', '00000000-0000-4000-8000-000000000014', 'critica', 'concluida', 3, 3, 'rescisao', 'ui'),

  -- Advocacia Tributário — Lucas
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000033', 'Diagnóstico carga tributária', '00000000-0000-4000-8000-000000000011', 'critica', 'em_andamento', 4, 5, 'diagnostico', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000033', 'Simulação Lucro Real x Presumido', '00000000-0000-4000-8000-000000000011', 'alta', 'a_fazer', 3, 3, 'simulacao', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000033', 'Parecer IRPJ/CSLL', '00000000-0000-4000-8000-000000000011', 'alta', 'em_andamento', 3, 3, 'parecer', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000033', 'Levantamento créditos PIS/COFINS', '00000000-0000-4000-8000-000000000011', 'media', 'a_fazer', 3, 4, 'creditos', 'ui'),

  -- Advocacia Societário — Lucas (planejado)
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000034', 'Análise contrato social vigente', '00000000-0000-4000-8000-000000000011', 'alta', 'backlog', 3, 3, 'analise', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000034', 'Proposta nova estrutura societária', '00000000-0000-4000-8000-000000000011', 'critica', 'backlog', 4, 5, 'proposta', 'ui'),

  -- Milligrama Contábil — Ana
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000035', 'Conciliação bancária outubro', '00000000-0000-4000-8000-000000000012', 'alta', 'a_fazer', 3, 3, 'conciliacao', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000035', 'Custo de produção linha facial', '00000000-0000-4000-8000-000000000012', 'critica', 'em_andamento', 4, 5, 'custo', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000035', 'Balanço patrimonial Q3', '00000000-0000-4000-8000-000000000012', 'alta', 'revisao', 3, 3, 'balanco', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000035', 'Relatório gerencial diretoria', '00000000-0000-4000-8000-000000000012', 'critica', 'a_fazer', 4, 4, 'relatorio', 'ui'),

  -- Milligrama Fiscal — Pedro
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000036', 'ICMS-ST cosméticos outubro', '00000000-0000-4000-8000-000000000013', 'critica', 'em_andamento', 5, 3, 'icms', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000036', 'SPED Fiscal setembro', '00000000-0000-4000-8000-000000000013', 'alta', 'concluida', 3, 3, 'sped', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000036', 'Diferencial de alíquota interestadual', '00000000-0000-4000-8000-000000000013', 'alta', 'a_fazer', 3, 3, 'difal', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000036', 'Classificação fiscal novos produtos', '00000000-0000-4000-8000-000000000013', 'media', 'em_andamento', 3, 3, 'classificacao', 'ui'),

  -- Milligrama Expansão — Márcia
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000037', 'Estudo de viabilidade linha capilar', '00000000-0000-4000-8000-000000000010', 'critica', 'em_andamento', 5, 5, 'viabilidade', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000037', 'Orçamento capex equipamentos', '00000000-0000-4000-8000-000000000010', 'alta', 'a_fazer', 3, 3, 'orcamento', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000037', 'Projeção DRE 12 meses', '00000000-0000-4000-8000-000000000012', 'alta', 'a_fazer', 3, 4, 'projecao', 'ui'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000037', 'Licenças ANVISA — levantamento', '00000000-0000-4000-8000-000000000014', 'alta', 'aguardando', 3, 3, 'licenca', 'ui');

-- =============================================================================
-- 8. CONTRATOS
-- =============================================================================

INSERT INTO contrato (id, org_id, cliente_id, tipo, vigencia_inicio, vigencia_fim, valor, forma_pagamento, numero) VALUES
  ('00000000-0000-4000-8000-000000000040', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020', 'Auditoria', '2026-01-01', '2026-12-31', 4500.00, 'Boleto mensal — vencimento dia 10', 'WYT-2026-001'),
  ('00000000-0000-4000-8000-000000000041', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000022', 'Projeto de inovação', '2026-01-01', '2026-12-31', 8500.00, 'Transferência mensal — vencimento dia 15', 'WYT-2026-002'),
  ('00000000-0000-4000-8000-000000000042', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000021', 'Consultoria', '2026-06-01', '2026-12-31', 12000.00, 'Parcelas mensais', 'WYT-2026-003');

UPDATE projeto SET contrato_id = '00000000-0000-4000-8000-000000000040'
  WHERE id IN ('00000000-0000-4000-8000-000000000030', '00000000-0000-4000-8000-000000000031', '00000000-0000-4000-8000-000000000032');
UPDATE projeto SET contrato_id = '00000000-0000-4000-8000-000000000042'
  WHERE id IN ('00000000-0000-4000-8000-000000000033', '00000000-0000-4000-8000-000000000034');
UPDATE projeto SET contrato_id = '00000000-0000-4000-8000-000000000041'
  WHERE id IN ('00000000-0000-4000-8000-000000000035', '00000000-0000-4000-8000-000000000036', '00000000-0000-4000-8000-000000000037');

-- Subtarefas (profundidade 1; mesmo projeto da mae; numero/chave gerados por trigger).
INSERT INTO tarefa (org_id, projeto_id, parent_id, titulo, responsavel_id, prioridade, status, categoria, origem)
SELECT org_id, projeto_id, id, sub.titulo, responsavel_id, 'media', sub.status::tarefa_status, categoria, 'ui'
FROM tarefa, (VALUES ('Levantar extratos do mês', 'concluida'), ('Conferir lançamentos pendentes', 'a_fazer')) AS sub(titulo, status)
WHERE tarefa.titulo = 'Conciliação bancária outubro';

-- =============================================================================
-- 9. ADITIVOS
-- =============================================================================

INSERT INTO aditivo (org_id, contrato_id, data, motivo, impacto_valor, impacto_prazo, impacto_escopo) VALUES
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000040', '2026-03-15', 'Inclusão de serviços de Departamento Pessoal', 1200.00, 'Sem alteração', 'Adição de folha de pagamento e eSocial'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000041', '2026-09-01', 'Expansão para linha capilar — nova frente contábil', 2000.00, 'Até março 2027', 'Contabilidade de custos da nova linha'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000041', '2026-07-01', 'Ajuste reajuste anual IGPM', 425.00, 'Sem alteração', 'Reajuste de 5% sobre valor base');

-- =============================================================================
-- 10. ESCOPOS
-- =============================================================================

INSERT INTO escopo (org_id, contrato_id, descricao) VALUES
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000040', 'Escrituração contábil mensal'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000040', 'Apuração de impostos (ICMS, ISS, PIS, COFINS)'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000040', 'Obrigações acessórias (SPED, GIA, EFD)'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000041', 'Escrituração contábil e fiscal mensal'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000041', 'Apuração ICMS-ST cosméticos');

-- =============================================================================
-- 11. ESCOPOS EXTRAS
-- =============================================================================

INSERT INTO escopo_extra (org_id, contrato_id, cliente_id, descricao, status, aprovado_por_id) VALUES
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000040', '00000000-0000-4000-8000-000000000020', 'Consultoria para abertura de filial em Sinop-MT', 'proposto', NULL),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000041', '00000000-0000-4000-8000-000000000022', 'Due diligence para captação de investimento', 'aprovado', '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000001', NULL, '00000000-0000-4000-8000-000000000022', 'Levantamento de incentivos fiscais SUDECO', 'faturado', '00000000-0000-4000-8000-000000000010');

-- =============================================================================
-- 12. APROVAÇÕES (2 pendentes, 1 aprovada, 1 recusada)
-- =============================================================================

INSERT INTO aprovacao (org_id, solicitante_id, aprovador_id, situacao_atual, risco_se_nao_fizer, manutencao_futura, custo, status, decisao_comentario, decidida_em) VALUES
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000010', 'Cliente Ribeiro solicitou inclusão de análise societária no escopo tributário', 'Perda de oportunidade de cross-sell e insatisfação do cliente', 'Demandará ~8h/mês de consultoria adicional', 2400.00, 'pendente', NULL, NULL),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000010', 'Necessário contratar sistema de conciliação automática para Milligrama', 'Atraso recorrente no fechamento mensal — 2 dias extras/mês', 'Licença mensal do software + treinamento inicial', 350.00, 'pendente', NULL, NULL),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000011', 'Solicito acesso ao portal da SEFAZ-MT com certificado digital do escritório', 'Depender de acesso manual do cliente para consultas de ICMS', 'Renovação anual do certificado A1', 180.00, 'aprovada', 'Aprovado. Comprar A1 no nome do escritório.', '2026-10-15T00:00:00-04:00'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000010', 'Farmácia Vida Plena quer migrar folha para novo sistema eSocial antes do prazo legal', 'Possível multa por não-conformidade após janeiro 2027', 'Integração com novo layout requer ajuste único + manutenção trimestral', NULL, 'recusada', 'Aguardar prazo oficial. Risco baixo antes de jan/2027.', '2026-10-20T00:00:00-04:00');

-- =============================================================================
-- 13. DOSSIÊ DO CLIENTE
-- =============================================================================

INSERT INTO dossie_cliente (org_id, cliente_id, tipo, conteudo, fonte, data_referencia, confianca) VALUES
  -- Farmácia
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020', 'fato', 'Regime tributário: Lucro Real. Enquadramento desde 2024.', 'Contrato social + consulta CNPJ', '2024-01-01', 'fato'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020', 'pessoa_chave', 'Dr. Roberto Almeida — proprietário e farmacêutico responsável. Decide tudo pessoalmente. Prefere comunicação por WhatsApp.', 'Reunião inicial', NULL, 'fato'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020', 'restricao', 'Não aceita mudanças no sistema ERP (Tiny). Qualquer integração deve ser via exportação de XML.', 'Reunião com Dr. Roberto — março/2026', '2026-03-10', 'fato'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000020', 'sistema', 'ERP: Tiny. Emissor NF: próprio Tiny. Banco principal: Bradesco + Santander. Conta PJ e conta investimento.', 'Onboarding', NULL, 'fato'),

  -- Advocacia
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000021', 'fato', 'Regime tributário: Lucro Presumido. Faturamento anual ~R$ 2,4M.', 'Documentação entregue no onboarding', NULL, 'fato'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000021', 'decisao', 'Diretoria decidiu avaliar migração para Lucro Real no planejamento 2026. Decisão final até dezembro.', 'Reunião com Dr. Henrique — outubro/2026', '2026-10-22', 'fato'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000021', 'pessoa_chave', 'Dr. Henrique Ribeiro — sócio majoritário. Centraliza decisões financeiras. Comunica por e-mail formal.', 'Onboarding', NULL, 'fato'),

  -- Indústria
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000022', 'fato', 'Regime tributário: Lucro Real. Indústria com ICMS-ST em cosméticos. Faturamento anual ~R$ 6M.', 'Documentação fiscal + DRE 2025', NULL, 'fato'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000022', 'decisao', 'Expansão para linha de produtos capilares aprovada pela diretoria. Previsão de início de produção em Q1/2027.', 'Reunião Fernanda + Márcia — setembro/2026', '2026-09-15', 'fato'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000022', 'sistema', 'ERP: SAP Business One. NF-e: emitida pelo SAP. Banco principal: Itaú. Folha: ADP.', 'Onboarding', NULL, 'fato'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000022', 'glossario', 'MVA = Margem de Valor Agregado. Usada para cálculo da base de ICMS-ST em cosméticos. Atualizada por portaria SEFAZ-MT.', 'Equipe fiscal', NULL, 'fato'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000022', 'restricao', 'ANVISA exige registro para novos produtos cosméticos. Processo leva 60-120 dias. Não iniciar produção sem registro.', 'Fernanda Lima — reunião expansão capilar', '2026-09-15', 'fato');

-- =============================================================================
-- 14. REGISTROS DIÁRIOS
-- =============================================================================

INSERT INTO registro_diario (org_id, pessoa_id, cliente_id, data, o_que_fiz, o_que_subi, o_que_descobri, pendencias, precisa_aprovacao, publicado) VALUES
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000020', '2026-10-21', 'Conciliação bancária Bradesco e Santander. Lançamento de 47 NFs de entrada.', 'Planilha conciliação outubro no Drive', 'Duas NFs com CFOP incorreto — devolvidas para o cliente corrigir', '["Aguardando NFs corrigidas do cliente"]', false, true),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000022', '2026-10-21', 'Apuração custo de produção linha facial — falta dados de embalagem', NULL, 'Fornecedor trocou composição do frasco — impacta custo unitário em ~4%', '["Pedir planilha embalagens atualizada para Fernanda"]', false, true),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000020', '2026-10-21', 'SPED Fiscal transmitido. Conferência GIA-ST em andamento.', 'Recibo SPED no Drive', NULL, NULL, false, true),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000022', '2026-10-21', 'Apuração ICMS-ST cosméticos — verificando alíquotas MVA atualizada', NULL, 'MVA ajustada para cosméticos mudou em outubro/2026 conforme Portaria SEFAZ', '["Aplicar nova MVA nas próximas NFs"]', true, false),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000020', '2026-10-21', 'Admissão do farmacêutico — documentos recebidos, exame admissional agendado', 'Check-list admissional preenchido', NULL, '["Aguardar resultado exame admissional (23/10)"]', false, true),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000021', '2026-10-22', 'Reunião com Dr. Henrique — apresentação diagnóstico tributário. Alinhamento de próximos passos.', NULL, 'Escritório tem débitos de IRPJ que podem ser compensados com créditos PIS/COFINS acumulados', NULL, false, true),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000020', '2026-10-22', 'DRE trimestral Q3 — 80% pronto, falta rateio de despesas administrativas', NULL, NULL, '["Critério de rateio precisa aprovação da diretoria", "Falta nota do aluguel de outubro"]', true, false),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000022', '2026-10-22', 'Estudo de viabilidade linha capilar — consolidação projeções de custo e receita. Reunião com Fernanda.', 'Planilha viabilidade v3 no Drive', 'Margem líquida projetada de 18% — acima do mínimo de 15% da diretoria', NULL, false, true),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000022', '2026-10-22', 'Balanço patrimonial Q3 Milligrama — revisão final antes de enviar para Márcia', NULL, NULL, '["Aguardando conferência final de Márcia"]', false, true),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000022', '2026-10-22', 'Classificação fiscal dos 3 novos produtos da linha capilar — NCMs definidos', 'Tabela NCM produtos capilares no Drive', 'Um dos produtos pode se enquadrar como cosmético com ICMS-ST menor (NCM 3305.10.00)', NULL, false, true);

-- =============================================================================
-- 15. EVENTOS (~20)
-- =============================================================================

INSERT INTO evento (org_id, quem_id, entidade, entidade_id, verbo, antes, depois, origem, cliente_id, projeto_id) VALUES
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 'organizacao', '00000000-0000-4000-8000-000000000001', 'criou', NULL, '{"nome":"Wyter Consultoria"}', 'ui', NULL, NULL),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 'cliente', '00000000-0000-4000-8000-000000000020', 'criou', NULL, '{"nome_fantasia":"Farmácia Vida Plena"}', 'ui', '00000000-0000-4000-8000-000000000020', NULL),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 'cliente', '00000000-0000-4000-8000-000000000021', 'criou', NULL, '{"nome_fantasia":"Ribeiro Advocacia"}', 'ui', '00000000-0000-4000-8000-000000000021', NULL),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 'cliente', '00000000-0000-4000-8000-000000000022', 'criou', NULL, '{"nome_fantasia":"Milligrama"}', 'ui', '00000000-0000-4000-8000-000000000022', NULL),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', 'projeto', '00000000-0000-4000-8000-000000000030', 'criou', NULL, '{"nome":"Contabilidade Mensal"}', 'ui', '00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000030'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000013', 'projeto', '00000000-0000-4000-8000-000000000031', 'criou', NULL, '{"nome":"Fiscal e Tributário"}', 'ui', '00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000031'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000014', 'projeto', '00000000-0000-4000-8000-000000000032', 'criou', NULL, '{"nome":"Departamento Pessoal"}', 'ui', '00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000032'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'projeto', '00000000-0000-4000-8000-000000000033', 'criou', NULL, '{"nome":"Planejamento Tributário 2026"}', 'ui', '00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000033'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 'contrato', '00000000-0000-4000-8000-000000000040', 'criou', NULL, '{"tipo":"Honorários Contábeis","valor":4500}', 'ui', '00000000-0000-4000-8000-000000000020', NULL),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 'contrato', '00000000-0000-4000-8000-000000000041', 'criou', NULL, '{"tipo":"Honorários Contábeis + Fiscal","valor":8500}', 'ui', '00000000-0000-4000-8000-000000000022', NULL),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', 'tarefa', '00000000-0000-4000-8000-000000000030', 'concluiu', '{"status":"em_andamento"}', '{"status":"concluida"}', 'ui', '00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000030'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000013', 'tarefa', '00000000-0000-4000-8000-000000000031', 'concluiu', '{"status":"em_andamento"}', '{"status":"concluida"}', 'ui', '00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000031'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'aprovacao', '00000000-0000-4000-8000-000000000033', 'criou', NULL, '{"situacao":"Inclusão análise societária"}', 'ui', '00000000-0000-4000-8000-000000000021', NULL),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'aprovacao', '00000000-0000-4000-8000-000000000033', 'aprovou', '{"status":"pendente"}', '{"status":"aprovada"}', 'ui', NULL, NULL),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'dossie', '00000000-0000-4000-8000-000000000021', 'adicionou', NULL, '{"tipo":"decisao","conteudo":"Avaliar migração Lucro Real"}', 'ui', '00000000-0000-4000-8000-000000000021', NULL),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 'projeto', '00000000-0000-4000-8000-000000000037', 'criou', NULL, '{"nome":"Expansão Linha Capilar"}', 'ui', '00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000037'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', 'registro', '00000000-0000-4000-8000-000000000020', 'publicou', NULL, '{"data":"2026-10-21","pessoa":"Ana Costa"}', 'ui', '00000000-0000-4000-8000-000000000020', NULL),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000013', 'registro', '00000000-0000-4000-8000-000000000022', 'descobriu', NULL, '{"conteudo":"MVA ajustada para cosméticos mudou em outubro/2026"}', 'ui', '00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000036'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 'escopo_extra', '00000000-0000-4000-8000-000000000022', 'aprovou', '{"status":"proposto"}', '{"status":"aprovado","descricao":"Due diligence"}', 'ui', '00000000-0000-4000-8000-000000000022', NULL),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 'aditivo', '00000000-0000-4000-8000-000000000040', 'criou', NULL, '{"motivo":"Inclusão DP","impacto_valor":1200}', 'ui', '00000000-0000-4000-8000-000000000020', NULL);
