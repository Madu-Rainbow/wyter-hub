-- Seguranca: signup restrito a email_autorizado, aprovacao imutavel apos decisao, isolamento de tenant.

-- =============================================================================
-- 1. Auth: so e-mail em email_autorizado vira usuario; vincula/cria pessoa.
-- AFTER INSERT: a excecao desfaz o insert em auth.users (FK pessoa -> auth.users exige a linha).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.auth_user_criado()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org uuid;
  v_email text := lower(NEW.email);
BEGIN
  SELECT ea.org_id INTO v_org
  FROM public.email_autorizado ea
  WHERE lower(ea.email) = v_email
  LIMIT 1;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Acesso restrito a membros da Wyter' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.pessoa SET auth_user_id = NEW.id
  WHERE org_id = v_org AND lower(email) = v_email
    AND auth_user_id IS NULL AND ativo AND deleted_at IS NULL;

  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.pessoa WHERE org_id = v_org AND lower(email) = v_email) THEN
      RAISE EXCEPTION 'Acesso restrito a membros da Wyter' USING ERRCODE = 'P0001';
    END IF;
    INSERT INTO public.pessoa (org_id, auth_user_id, nome, email, papel)
    VALUES (v_org, NEW.id, coalesce(NEW.raw_user_meta_data->>'full_name', v_email), v_email, 'analista');
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.auth_user_criado() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_auth_user_criado ON auth.users;
CREATE TRIGGER trg_auth_user_criado
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auth_user_criado();

-- =============================================================================
-- 2. Aprovacao: conteudo imutavel apos decisao; pendente: so solicitante edita conteudo, so diretor decide.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.proteger_aprovacao_decisao()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  meu_id uuid;
  meu_papel public.papel;
  conteudo_mudou boolean;
BEGIN
  SELECT p.id, p.papel INTO meu_id, meu_papel FROM public.get_my_pessoa() p;

  conteudo_mudou :=
    NEW.custo IS DISTINCT FROM OLD.custo
    OR NEW.situacao_atual IS DISTINCT FROM OLD.situacao_atual
    OR NEW.risco_se_nao_fizer IS DISTINCT FROM OLD.risco_se_nao_fizer
    OR NEW.manutencao_futura IS DISTINCT FROM OLD.manutencao_futura
    OR NEW.tarefa_id IS DISTINCT FROM OLD.tarefa_id
    OR NEW.escopo_extra_id IS DISTINCT FROM OLD.escopo_extra_id
    OR NEW.solicitante_id IS DISTINCT FROM OLD.solicitante_id
    OR NEW.org_id IS DISTINCT FROM OLD.org_id;

  IF OLD.status <> 'pendente' AND conteudo_mudou THEN
    RAISE EXCEPTION 'Aprovação já decidida: conteúdo não pode ser alterado';
  END IF;

  IF OLD.status = 'pendente' AND conteudo_mudou
     AND (meu_id IS NULL OR meu_id IS DISTINCT FROM OLD.solicitante_id) THEN
    RAISE EXCEPTION 'Somente o solicitante pode editar o conteúdo da aprovação';
  END IF;

  IF (NEW.status IS DISTINCT FROM OLD.status
      OR NEW.aprovador_id IS DISTINCT FROM OLD.aprovador_id
      OR NEW.decidida_em IS DISTINCT FROM OLD.decidida_em
      OR NEW.decisao_comentario IS DISTINCT FROM OLD.decisao_comentario)
     AND meu_papel IS DISTINCT FROM 'diretor' THEN
    RAISE EXCEPTION 'Somente diretor pode decidir ou reatribuir a aprovação';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'pendente' AND NEW.decidida_em IS NULL THEN
    NEW.decidida_em := now();
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================================================
-- 3. Tenant: referencias devem ter o mesmo org_id da linha.
-- (anexo.entidade_id e polimorfico: sem FK, fica fora.)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.checar_mesmo_org()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  j jsonb := to_jsonb(NEW);
  r record;
  ok boolean;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('projeto','cliente_id','cliente'), ('projeto','contrato_id','contrato'), ('projeto','parent_id','projeto'),
      ('tarefa','projeto_id','projeto'), ('tarefa','parent_id','tarefa'),
      ('comentario','tarefa_id','tarefa'),
      ('aprovacao','tarefa_id','tarefa'), ('aprovacao','escopo_extra_id','escopo_extra'),
      ('aprovacao','solicitante_id','pessoa'), ('aprovacao','aprovador_id','pessoa'),
      ('contrato','cliente_id','cliente')
    ) AS t(tab, col, ref) WHERE t.tab = TG_TABLE_NAME
  LOOP
    IF j->>r.col IS NOT NULL THEN
      EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE id = $1 AND org_id = $2)', r.ref)
        INTO ok USING (j->>r.col)::uuid, NEW.org_id;
      IF NOT ok THEN
        RAISE EXCEPTION 'Referência % em % pertence a outra organização', r.col, TG_TABLE_NAME;
      END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_org_projeto BEFORE INSERT OR UPDATE ON public.projeto
  FOR EACH ROW EXECUTE FUNCTION public.checar_mesmo_org();
CREATE TRIGGER trg_org_tarefa BEFORE INSERT OR UPDATE ON public.tarefa
  FOR EACH ROW EXECUTE FUNCTION public.checar_mesmo_org();
CREATE TRIGGER trg_org_comentario BEFORE INSERT OR UPDATE ON public.comentario
  FOR EACH ROW EXECUTE FUNCTION public.checar_mesmo_org();
CREATE TRIGGER trg_org_aprovacao BEFORE INSERT OR UPDATE ON public.aprovacao
  FOR EACH ROW EXECUTE FUNCTION public.checar_mesmo_org();
CREATE TRIGGER trg_org_contrato BEFORE INSERT OR UPDATE ON public.contrato
  FOR EACH ROW EXECUTE FUNCTION public.checar_mesmo_org();

-- tarefa_numero_seq: filtra tambem por org_id.
CREATE OR REPLACE FUNCTION public.tarefa_numero_seq()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.projeto_id IS NOT DISTINCT FROM OLD.projeto_id THEN
    NEW.numero := OLD.numero;
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(NEW.projeto_id::text));
  SELECT coalesce(max(numero), 0) + 1 INTO NEW.numero
  FROM public.tarefa WHERE projeto_id = NEW.projeto_id AND org_id = NEW.org_id;
  RETURN NEW;
END $$;

-- =============================================================================
-- 4. Valores financeiros so para diretor/consultor.
-- REVOKE de coluna nao remove GRANT de tabela: revoga a tabela e concede as demais colunas.
-- Novas colunas nao financeiras de contrato/aditivo precisam de GRANT SELECT (col) explicito.
-- INSERT/UPDATE nao mudam (a RLS ja restringe escrita).
-- =============================================================================
REVOKE SELECT ON public.contrato FROM anon, authenticated;
GRANT SELECT (id, org_id, cliente_id, tipo, vigencia_inicio, vigencia_fim, numero, arquivo_url,
              created_at, updated_at, deleted_at) ON public.contrato TO authenticated;

REVOKE SELECT ON public.aditivo FROM anon, authenticated;
GRANT SELECT (id, org_id, contrato_id, data, motivo, impacto_prazo, impacto_escopo, created_at)
  ON public.aditivo TO authenticated;

-- security_invoker=false: le a tabela como dono; o filtro explicito faz o papel da RLS.
CREATE VIEW public.contrato_financeiro WITH (security_invoker = false) AS
SELECT c.id AS contrato_id, c.org_id, c.valor, c.forma_pagamento
FROM public.contrato c
WHERE c.org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor');

CREATE VIEW public.aditivo_financeiro WITH (security_invoker = false) AS
SELECT a.id AS aditivo_id, a.contrato_id, a.org_id, a.impacto_valor
FROM public.aditivo a
WHERE a.org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor');

REVOKE ALL ON public.contrato_financeiro, public.aditivo_financeiro FROM PUBLIC, anon;
GRANT SELECT ON public.contrato_financeiro, public.aditivo_financeiro TO authenticated;
