-- =============================================================================
-- Wyter Hub — Schema Inicial + RLS
-- =============================================================================

-- ENUMS
CREATE TYPE public.aprovacao_status AS ENUM('pendente', 'aprovada', 'recusada');
CREATE TYPE public.cliente_status AS ENUM('ativo', 'inativo', 'arquivado');
CREATE TYPE public.papel_no_cliente AS ENUM('decisor', 'operacional', 'fornecedor', 'contador', 'advogado');
CREATE TYPE public.dossie_confianca AS ENUM('fato', 'a_confirmar');
CREATE TYPE public.dossie_tipo AS ENUM('fato', 'decisao', 'restricao', 'sistema', 'glossario', 'pessoa_chave');
CREATE TYPE public.escopo_extra_status AS ENUM('proposto', 'aprovado', 'recusado', 'faturado');
CREATE TYPE public.origem AS ENUM('ui', 'trello', 'email', 'drive', 'mcp', 'ia');
CREATE TYPE public.papel AS ENUM('diretor', 'consultor', 'analista', 'convidado');
CREATE TYPE public.prioridade AS ENUM('critica', 'alta', 'media', 'baixa');
CREATE TYPE public.projeto_status AS ENUM('planejado', 'em_andamento', 'pausado', 'concluido', 'cancelado');
CREATE TYPE public.projeto_tipo AS ENUM('continuo', 'pontual');
CREATE TYPE public.tarefa_status AS ENUM('backlog', 'a_fazer', 'em_andamento', 'aguardando', 'revisao', 'concluida', 'cancelada');
CREATE TYPE public.treinamento_diretoria AS ENUM('nao_iniciado', 'em_andamento', 'concluido');

-- =============================================================================
-- TABELAS
-- =============================================================================

CREATE TABLE public.organizacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pessoa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  auth_user_id uuid REFERENCES auth.users(id),
  nome text NOT NULL,
  email text NOT NULL,
  papel public.papel NOT NULL DEFAULT 'analista',
  cargo text,
  capacidade_semanal_horas integer,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX pessoa_auth_user_id_idx ON public.pessoa(auth_user_id);
CREATE INDEX pessoa_org_id_idx ON public.pessoa(org_id);

CREATE TABLE public.email_autorizado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  email text NOT NULL,
  adicionado_por_id uuid REFERENCES public.pessoa(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  razao_social text NOT NULL,
  nome_fantasia text,
  segmento text,
  cidade text,
  uf char(2),
  status public.cliente_status NOT NULL DEFAULT 'ativo',
  responsavel_id uuid REFERENCES public.pessoa(id),
  tags text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE public.contato_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  cliente_id uuid NOT NULL REFERENCES public.cliente(id),
  nome text NOT NULL,
  papel_no_cliente public.papel_no_cliente,
  email text,
  telefone text,
  canal_preferido text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE public.projeto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  cliente_id uuid NOT NULL REFERENCES public.cliente(id),
  parent_id uuid REFERENCES public.projeto(id),
  nome text NOT NULL,
  tipo public.projeto_tipo NOT NULL DEFAULT 'pontual',
  frente text,
  data_inicio date,
  data_fim date,
  status public.projeto_status NOT NULL DEFAULT 'planejado',
  responsavel_id uuid REFERENCES public.pessoa(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE public.tarefa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  projeto_id uuid NOT NULL REFERENCES public.projeto(id),
  titulo text NOT NULL,
  descricao text,
  responsavel_id uuid REFERENCES public.pessoa(id),
  categoria text,
  prioridade public.prioridade NOT NULL DEFAULT 'media',
  urgencia integer NOT NULL DEFAULT 3,
  esforco integer NOT NULL DEFAULT 3,
  estimativa_horas numeric,
  data_inicio date,
  data_prazo date,
  status public.tarefa_status NOT NULL DEFAULT 'backlog',
  bloqueada_por_id uuid,
  checklist jsonb,
  origem public.origem NOT NULL DEFAULT 'ui',
  link_externo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE public.comentario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  tarefa_id uuid NOT NULL REFERENCES public.tarefa(id),
  autor_id uuid NOT NULL REFERENCES public.pessoa(id),
  texto text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE public.aprovacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  tarefa_id uuid REFERENCES public.tarefa(id),
  escopo_extra_id uuid,
  solicitante_id uuid NOT NULL REFERENCES public.pessoa(id),
  aprovador_id uuid NOT NULL REFERENCES public.pessoa(id),
  situacao_atual text NOT NULL,
  risco_se_nao_fizer text NOT NULL,
  manutencao_futura text NOT NULL,
  custo numeric,
  status public.aprovacao_status NOT NULL DEFAULT 'pendente',
  decisao_comentario text,
  decidida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.anexo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  entidade_tipo text NOT NULL,
  entidade_id uuid NOT NULL,
  nome_arquivo text NOT NULL,
  url_ou_caminho text NOT NULL,
  tipo_arquivo text,
  tamanho_bytes integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.contrato (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  cliente_id uuid NOT NULL REFERENCES public.cliente(id),
  tipo text NOT NULL,
  vigencia_inicio date NOT NULL,
  vigencia_fim date,
  valor numeric,
  forma_pagamento text,
  numero text,
  arquivo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE public.aditivo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  contrato_id uuid NOT NULL REFERENCES public.contrato(id),
  data date NOT NULL,
  motivo text NOT NULL,
  impacto_valor numeric,
  impacto_prazo text,
  impacto_escopo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.escopo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  contrato_id uuid NOT NULL REFERENCES public.contrato(id),
  descricao text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.escopo_extra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  contrato_id uuid REFERENCES public.contrato(id),
  cliente_id uuid NOT NULL REFERENCES public.cliente(id),
  descricao text NOT NULL,
  status public.escopo_extra_status NOT NULL DEFAULT 'proposto',
  aprovado_por_id uuid REFERENCES public.pessoa(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.dossie_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  cliente_id uuid NOT NULL REFERENCES public.cliente(id),
  tipo public.dossie_tipo NOT NULL,
  conteudo text NOT NULL,
  fonte text,
  data_referencia date,
  confianca public.dossie_confianca NOT NULL DEFAULT 'a_confirmar',
  evento_origem_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Evento com contexto por cliente E projeto (append-only)
CREATE TABLE public.evento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  quem_id uuid NOT NULL REFERENCES public.pessoa(id),
  quando timestamptz NOT NULL DEFAULT now(),
  entidade text NOT NULL,
  entidade_id uuid NOT NULL,
  verbo text NOT NULL,
  antes jsonb,
  depois jsonb,
  origem public.origem NOT NULL DEFAULT 'ui',
  cliente_id uuid REFERENCES public.cliente(id),
  projeto_id uuid REFERENCES public.projeto(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX evento_quem_quando_idx ON public.evento(quem_id, quando);
CREATE INDEX evento_cliente_quando_idx ON public.evento(cliente_id, quando);
CREATE INDEX evento_projeto_quando_idx ON public.evento(projeto_id, quando);

CREATE TABLE public.registro_diario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  pessoa_id uuid NOT NULL REFERENCES public.pessoa(id),
  cliente_id uuid NOT NULL REFERENCES public.cliente(id),
  data date NOT NULL,
  o_que_fiz text NOT NULL,
  o_que_subi text,
  o_que_descobri text,
  pendencias jsonb,
  precisa_aprovacao boolean NOT NULL DEFAULT false,
  treinamento_diretoria public.treinamento_diretoria,
  trava text,
  pedido_ao_cliente text,
  pilar text,
  publicado boolean NOT NULL DEFAULT false,
  importado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.integracao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  servico text NOT NULL,
  config jsonb,
  ultimo_cursor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sincronizacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  integracao_id uuid NOT NULL REFERENCES public.integracao(id),
  entidade_interna text NOT NULL,
  id_interno uuid NOT NULL,
  id_externo text NOT NULL,
  ultima_sync timestamptz NOT NULL DEFAULT now(),
  erros jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- FUNCAO AUXILIAR: pegar org_id e papel do usuario logado
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_pessoa()
RETURNS TABLE(id uuid, org_id uuid, papel public.papel)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id, p.org_id, p.papel
  FROM public.pessoa p
  WHERE p.auth_user_id = auth.uid()
    AND p.ativo = true
    AND p.deleted_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.my_org_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.org_id
  FROM public.pessoa p
  WHERE p.auth_user_id = auth.uid()
    AND p.ativo = true
    AND p.deleted_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.my_papel()
RETURNS public.papel
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.papel
  FROM public.pessoa p
  WHERE p.auth_user_id = auth.uid()
    AND p.ativo = true
    AND p.deleted_at IS NULL
  LIMIT 1;
$$;

-- =============================================================================
-- RLS — Habilitar em TODAS as tabelas
-- =============================================================================

ALTER TABLE public.organizacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pessoa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_autorizado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contato_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projeto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aprovacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anexo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contrato ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aditivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escopo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escopo_extra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossie_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registro_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integracao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sincronizacao ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES — Membro da org pode ler; papel controla escrita
-- =============================================================================

-- Organizacao: membros podem ler sua org
CREATE POLICY "org_select" ON public.organizacao
  FOR SELECT TO authenticated
  USING (id = public.my_org_id());

-- Pessoa: membros da org
CREATE POLICY "pessoa_select" ON public.pessoa
  FOR SELECT TO authenticated
  USING (org_id = public.my_org_id());

CREATE POLICY "pessoa_insert" ON public.pessoa
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.my_org_id() AND public.my_papel() = 'diretor');

CREATE POLICY "pessoa_update" ON public.pessoa
  FOR UPDATE TO authenticated
  USING (org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor'))
  WITH CHECK (org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor'));

-- Impedir escalação de privilégio: só diretor altera colunas sensíveis
CREATE OR REPLACE FUNCTION public.proteger_pessoa_colunas_sensiveis()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF public.my_papel() != 'diretor' THEN
    IF NEW.papel IS DISTINCT FROM OLD.papel
       OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
       OR NEW.org_id IS DISTINCT FROM OLD.org_id
       OR NEW.ativo IS DISTINCT FROM OLD.ativo
       OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
    THEN
      RAISE EXCEPTION 'Somente diretor pode alterar papel, auth_user_id, org_id, ativo ou deleted_at';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pessoa_proteger_colunas
  BEFORE UPDATE ON public.pessoa
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_pessoa_colunas_sensiveis();

-- Email autorizado: diretor gerencia
CREATE POLICY "email_select" ON public.email_autorizado
  FOR SELECT TO authenticated
  USING (org_id = public.my_org_id() AND public.my_papel() = 'diretor');

CREATE POLICY "email_insert" ON public.email_autorizado
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.my_org_id() AND public.my_papel() = 'diretor');

CREATE POLICY "email_delete" ON public.email_autorizado
  FOR DELETE TO authenticated
  USING (org_id = public.my_org_id() AND public.my_papel() = 'diretor');

-- Cliente: todos da org leem; diretor/consultor escrevem
CREATE POLICY "cliente_select" ON public.cliente
  FOR SELECT TO authenticated
  USING (org_id = public.my_org_id());

CREATE POLICY "cliente_insert" ON public.cliente
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor'));

CREATE POLICY "cliente_update" ON public.cliente
  FOR UPDATE TO authenticated
  USING (org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor'));

-- Contato cliente
CREATE POLICY "contato_select" ON public.contato_cliente
  FOR SELECT TO authenticated
  USING (org_id = public.my_org_id());

CREATE POLICY "contato_write" ON public.contato_cliente
  FOR ALL TO authenticated
  USING (org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor'))
  WITH CHECK (org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor'));

-- Projeto
CREATE POLICY "projeto_select" ON public.projeto
  FOR SELECT TO authenticated
  USING (org_id = public.my_org_id());

CREATE POLICY "projeto_insert" ON public.projeto
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor'));

CREATE POLICY "projeto_update" ON public.projeto
  FOR UPDATE TO authenticated
  USING (org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor'));

-- Tarefa: todos leem; todos exceto convidado escrevem
CREATE POLICY "tarefa_select" ON public.tarefa
  FOR SELECT TO authenticated
  USING (org_id = public.my_org_id());

CREATE POLICY "tarefa_insert" ON public.tarefa
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.my_org_id() AND public.my_papel() != 'convidado');

CREATE POLICY "tarefa_update" ON public.tarefa
  FOR UPDATE TO authenticated
  USING (org_id = public.my_org_id() AND public.my_papel() != 'convidado');

-- Comentario
CREATE POLICY "comentario_select" ON public.comentario
  FOR SELECT TO authenticated
  USING (org_id = public.my_org_id());

CREATE POLICY "comentario_insert" ON public.comentario
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.my_org_id() AND public.my_papel() != 'convidado');

-- Aprovacao
CREATE POLICY "aprovacao_select" ON public.aprovacao
  FOR SELECT TO authenticated
  USING (org_id = public.my_org_id());

CREATE POLICY "aprovacao_insert" ON public.aprovacao
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.my_org_id() AND public.my_papel() != 'convidado');

CREATE POLICY "aprovacao_update" ON public.aprovacao
  FOR UPDATE TO authenticated
  USING (org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor'));

-- Anexo
CREATE POLICY "anexo_select" ON public.anexo
  FOR SELECT TO authenticated
  USING (org_id = public.my_org_id());

CREATE POLICY "anexo_insert" ON public.anexo
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.my_org_id() AND public.my_papel() != 'convidado');

-- Contrato: todos leem; diretor escreve
CREATE POLICY "contrato_select" ON public.contrato
  FOR SELECT TO authenticated
  USING (org_id = public.my_org_id());

CREATE POLICY "contrato_write" ON public.contrato
  FOR ALL TO authenticated
  USING (org_id = public.my_org_id() AND public.my_papel() = 'diretor')
  WITH CHECK (org_id = public.my_org_id() AND public.my_papel() = 'diretor');

-- Aditivo
CREATE POLICY "aditivo_select" ON public.aditivo
  FOR SELECT TO authenticated
  USING (org_id = public.my_org_id());

CREATE POLICY "aditivo_write" ON public.aditivo
  FOR ALL TO authenticated
  USING (org_id = public.my_org_id() AND public.my_papel() = 'diretor')
  WITH CHECK (org_id = public.my_org_id() AND public.my_papel() = 'diretor');

-- Escopo
CREATE POLICY "escopo_select" ON public.escopo
  FOR SELECT TO authenticated
  USING (org_id = public.my_org_id());

CREATE POLICY "escopo_write" ON public.escopo
  FOR ALL TO authenticated
  USING (org_id = public.my_org_id() AND public.my_papel() = 'diretor')
  WITH CHECK (org_id = public.my_org_id() AND public.my_papel() = 'diretor');

-- Escopo extra
CREATE POLICY "escopo_extra_select" ON public.escopo_extra
  FOR SELECT TO authenticated
  USING (org_id = public.my_org_id());

CREATE POLICY "escopo_extra_insert" ON public.escopo_extra
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor'));

CREATE POLICY "escopo_extra_update" ON public.escopo_extra
  FOR UPDATE TO authenticated
  USING (org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor'));

-- Dossie cliente
CREATE POLICY "dossie_select" ON public.dossie_cliente
  FOR SELECT TO authenticated
  USING (org_id = public.my_org_id());

CREATE POLICY "dossie_insert" ON public.dossie_cliente
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.my_org_id() AND public.my_papel() != 'convidado');

CREATE POLICY "dossie_update" ON public.dossie_cliente
  FOR UPDATE TO authenticated
  USING (org_id = public.my_org_id() AND public.my_papel() != 'convidado');

-- Evento: todos leem; insert para todos (append-only, sem update/delete)
CREATE POLICY "evento_select" ON public.evento
  FOR SELECT TO authenticated
  USING (org_id = public.my_org_id());

CREATE POLICY "evento_insert" ON public.evento
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.my_org_id());

-- Registro diario
CREATE POLICY "registro_select" ON public.registro_diario
  FOR SELECT TO authenticated
  USING (org_id = public.my_org_id());

CREATE POLICY "registro_insert" ON public.registro_diario
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.my_org_id() AND public.my_papel() != 'convidado');

CREATE POLICY "registro_update" ON public.registro_diario
  FOR UPDATE TO authenticated
  USING (org_id = public.my_org_id() AND public.my_papel() != 'convidado');

-- Integracao: diretor
CREATE POLICY "integracao_select" ON public.integracao
  FOR SELECT TO authenticated
  USING (org_id = public.my_org_id());

CREATE POLICY "integracao_write" ON public.integracao
  FOR ALL TO authenticated
  USING (org_id = public.my_org_id() AND public.my_papel() = 'diretor')
  WITH CHECK (org_id = public.my_org_id() AND public.my_papel() = 'diretor');

-- Sincronizacao
CREATE POLICY "sync_select" ON public.sincronizacao
  FOR SELECT TO authenticated
  USING (org_id = public.my_org_id());

CREATE POLICY "sync_write" ON public.sincronizacao
  FOR ALL TO authenticated
  USING (org_id = public.my_org_id() AND public.my_papel() = 'diretor')
  WITH CHECK (org_id = public.my_org_id() AND public.my_papel() = 'diretor');

-- =============================================================================
-- INDICES para performance de RLS
-- =============================================================================

CREATE INDEX cliente_org_id_idx ON public.cliente(org_id);
CREATE INDEX projeto_org_id_idx ON public.projeto(org_id);
CREATE INDEX tarefa_org_id_idx ON public.tarefa(org_id);
CREATE INDEX tarefa_projeto_id_idx ON public.tarefa(projeto_id);
CREATE INDEX aprovacao_org_id_idx ON public.aprovacao(org_id);
CREATE INDEX contrato_org_id_idx ON public.contrato(org_id);
CREATE INDEX registro_org_id_idx ON public.registro_diario(org_id);
CREATE INDEX evento_org_id_idx ON public.evento(org_id);
CREATE INDEX dossie_org_id_idx ON public.dossie_cliente(org_id);
CREATE INDEX dossie_cliente_id_idx ON public.dossie_cliente(cliente_id);
