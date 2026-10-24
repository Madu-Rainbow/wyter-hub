-- Administracao de usuarios (spec 001, FR-014 a FR-019): convite atomico, edicao, revogacao, guardas e auditoria.

-- Guardas em qualquer UPDATE de pessoa (inclusive via API direta): ninguem desativa o proprio
-- acesso e a org nunca fica sem diretor ativo que ja entrou.
CREATE OR REPLACE FUNCTION public.guardar_diretor_pessoa()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_eu uuid;
  v_perde_acesso boolean := (OLD.ativo AND NOT NEW.ativo) OR (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL);
BEGIN
  SELECT id INTO v_eu FROM public.get_my_pessoa();
  IF v_eu IS NOT NULL AND OLD.id = v_eu AND v_perde_acesso THEN
    RAISE EXCEPTION 'Você não pode remover o próprio acesso';
  END IF;

  IF OLD.papel = 'diretor' AND OLD.ativo AND OLD.deleted_at IS NULL
     AND (v_perde_acesso OR NEW.papel <> 'diretor')
     AND NOT EXISTS (
       SELECT 1 FROM public.pessoa p
       WHERE p.org_id = OLD.org_id AND p.id <> OLD.id AND p.papel = 'diretor'
         AND p.ativo AND p.deleted_at IS NULL AND p.auth_user_id IS NOT NULL
     ) THEN
    RAISE EXCEPTION 'A organização precisa de ao menos um diretor ativo';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guardar_diretor_pessoa() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_pessoa_guardar_diretor
  BEFORE UPDATE ON public.pessoa
  FOR EACH ROW EXECUTE FUNCTION public.guardar_diretor_pessoa();

-- Convite: email_autorizado + pessoa pre-vinculada por e-mail, na mesma transacao.
CREATE OR REPLACE FUNCTION public.convidar_usuario(
  p_email text,
  p_papel public.papel,
  p_cargo text DEFAULT NULL,
  p_capacidade integer DEFAULT NULL,
  p_nome text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_eu record;
  v_email text := lower(btrim(p_email));
  v_id uuid;
BEGIN
  SELECT * INTO v_eu FROM public.get_my_pessoa();
  IF v_eu.id IS NULL OR v_eu.papel <> 'diretor' THEN
    RAISE EXCEPTION 'Somente diretor pode convidar usuários';
  END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'E-mail inválido';
  END IF;
  IF p_capacidade IS NOT NULL AND p_capacidade NOT BETWEEN 0 AND 168 THEN
    RAISE EXCEPTION 'Capacidade semanal inválida';
  END IF;
  IF EXISTS (SELECT 1 FROM public.email_autorizado WHERE lower(email) = v_email)
     OR EXISTS (SELECT 1 FROM public.pessoa WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'Este e-mail já está cadastrado';
  END IF;

  INSERT INTO public.email_autorizado (org_id, email, adicionado_por_id)
  VALUES (v_eu.org_id, v_email, v_eu.id);

  INSERT INTO public.pessoa (org_id, nome, email, papel, cargo, capacidade_semanal_horas)
  VALUES (v_eu.org_id, coalesce(nullif(btrim(p_nome), ''), initcap(split_part(v_email, '@', 1))),
          v_email, p_papel, nullif(btrim(p_cargo), ''), p_capacidade)
  RETURNING id INTO v_id;

  INSERT INTO public.evento (org_id, quem_id, entidade, entidade_id, verbo, depois)
  VALUES (v_eu.org_id, v_eu.id, 'pessoa', v_id, 'convidou', jsonb_build_object('papel', p_papel));
  RETURN v_id;
END;
$$;

-- Edita papel/cargo/capacidade/ativo; as guardas ficam no trigger acima.
CREATE OR REPLACE FUNCTION public.atualizar_usuario(
  p_pessoa_id uuid,
  p_papel public.papel,
  p_cargo text,
  p_capacidade integer,
  p_ativo boolean
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_eu record;
  v_old public.pessoa;
BEGIN
  SELECT * INTO v_eu FROM public.get_my_pessoa();
  IF v_eu.id IS NULL OR v_eu.papel <> 'diretor' THEN
    RAISE EXCEPTION 'Somente diretor pode editar usuários';
  END IF;
  IF p_capacidade IS NOT NULL AND p_capacidade NOT BETWEEN 0 AND 168 THEN
    RAISE EXCEPTION 'Capacidade semanal inválida';
  END IF;
  SELECT * INTO v_old FROM public.pessoa
  WHERE id = p_pessoa_id AND org_id = v_eu.org_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Usuário não encontrado'; END IF;

  UPDATE public.pessoa
  SET papel = p_papel, cargo = nullif(btrim(p_cargo), ''), capacidade_semanal_horas = p_capacidade,
      ativo = p_ativo, updated_at = now()
  WHERE id = p_pessoa_id;

  IF v_old.papel <> p_papel THEN
    INSERT INTO public.evento (org_id, quem_id, entidade, entidade_id, verbo, antes, depois)
    VALUES (v_eu.org_id, v_eu.id, 'pessoa', p_pessoa_id, 'alterou_papel',
            jsonb_build_object('papel', v_old.papel), jsonb_build_object('papel', p_papel));
  END IF;
  IF v_old.ativo <> p_ativo THEN
    INSERT INTO public.evento (org_id, quem_id, entidade, entidade_id, verbo)
    VALUES (v_eu.org_id, v_eu.id, 'pessoa', p_pessoa_id, CASE WHEN p_ativo THEN 'reativou' ELSE 'desativou' END);
  END IF;
END;
$$;

-- Revoga convite pendente (apaga a autorizacao e a pessoa que nunca entrou). Quem ja entrou so se desativa.
CREATE OR REPLACE FUNCTION public.revogar_convite(p_email text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_eu record;
  v_email text := lower(btrim(p_email));
  v_pessoa public.pessoa;
BEGIN
  SELECT * INTO v_eu FROM public.get_my_pessoa();
  IF v_eu.id IS NULL OR v_eu.papel <> 'diretor' THEN
    RAISE EXCEPTION 'Somente diretor pode revogar convites';
  END IF;
  SELECT * INTO v_pessoa FROM public.pessoa WHERE org_id = v_eu.org_id AND lower(email) = v_email;
  IF v_pessoa.id IS NOT NULL AND v_pessoa.auth_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'Este usuário já entrou no sistema: desative em vez de revogar';
  END IF;

  DELETE FROM public.email_autorizado WHERE org_id = v_eu.org_id AND lower(email) = v_email;
  IF v_pessoa.id IS NOT NULL THEN
    BEGIN
      DELETE FROM public.pessoa WHERE id = v_pessoa.id;
    EXCEPTION WHEN foreign_key_violation THEN
      RAISE EXCEPTION 'Usuário com histórico não pode ser excluído: desative-o';
    END;
    INSERT INTO public.evento (org_id, quem_id, entidade, entidade_id, verbo)
    VALUES (v_eu.org_id, v_eu.id, 'pessoa', v_pessoa.id, 'revogou_convite');
  END IF;
END;
$$;

-- Ultimo acesso (auth.users) so para diretor, restrito a org.
CREATE OR REPLACE FUNCTION public.ultimo_acesso_usuarios()
RETURNS TABLE(pessoa_id uuid, ultimo_acesso timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id, u.last_sign_in_at
  FROM public.pessoa p
  JOIN auth.users u ON u.id = p.auth_user_id
  WHERE p.org_id = public.my_org_id() AND public.my_papel() = 'diretor';
$$;

REVOKE ALL ON FUNCTION public.convidar_usuario(text, public.papel, text, integer, text),
  public.atualizar_usuario(uuid, public.papel, text, integer, boolean),
  public.revogar_convite(text), public.ultimo_acesso_usuarios() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convidar_usuario(text, public.papel, text, integer, text),
  public.atualizar_usuario(uuid, public.papel, text, integer, boolean),
  public.revogar_convite(text), public.ultimo_acesso_usuarios() TO authenticated;
