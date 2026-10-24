-- Seguranca de usuarios: convite vinculado por chave imutavel (pessoa_id), e-mail/nome protegidos e guarda do ultimo diretor serializada.

-- 1. Vinculo do convite por pessoa_id (email_autorizado so e alterado por diretor; nao ha policy de UPDATE).
ALTER TABLE public.email_autorizado
  ADD COLUMN IF NOT EXISTS pessoa_id uuid REFERENCES public.pessoa(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS email_autorizado_pessoa_uniq ON public.email_autorizado (pessoa_id);

-- Backfill: convites existentes apontam para a pessoa de mesmo e-mail na org.
UPDATE public.email_autorizado ea
SET pessoa_id = p.id
FROM public.pessoa p
WHERE ea.pessoa_id IS NULL AND p.org_id = ea.org_id AND lower(p.email) = lower(ea.email)
  AND p.deleted_at IS NULL;

-- 2. Signup: localiza a pessoa pelo pessoa_id do convite, nunca por pessoa.email.
CREATE OR REPLACE FUNCTION public.auth_user_criado()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org uuid;
  v_pessoa uuid;
  v_email text := lower(NEW.email);
BEGIN
  SELECT ea.org_id, ea.pessoa_id INTO v_org, v_pessoa
  FROM public.email_autorizado ea
  WHERE lower(ea.email) = v_email
  LIMIT 1;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Acesso restrito a membros da Wyter' USING ERRCODE = 'P0001';
  END IF;

  IF v_pessoa IS NOT NULL THEN
    UPDATE public.pessoa SET auth_user_id = NEW.id
    WHERE id = v_pessoa AND org_id = v_org
      AND auth_user_id IS NULL AND ativo AND deleted_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Acesso restrito a membros da Wyter' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    INSERT INTO public.pessoa (org_id, auth_user_id, nome, email, papel)
    VALUES (v_org, NEW.id, coalesce(NEW.raw_user_meta_data->>'full_name', v_email), v_email, 'analista')
    RETURNING id INTO v_pessoa;
    UPDATE public.email_autorizado SET pessoa_id = v_pessoa
    WHERE org_id = v_org AND lower(email) = v_email;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.auth_user_criado() FROM PUBLIC, anon, authenticated;

-- 3. Convite grava pessoa_id.
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

  INSERT INTO public.pessoa (org_id, nome, email, papel, cargo, capacidade_semanal_horas)
  VALUES (v_eu.org_id, coalesce(nullif(btrim(p_nome), ''), initcap(split_part(v_email, '@', 1))),
          v_email, p_papel, nullif(btrim(p_cargo), ''), p_capacidade)
  RETURNING id INTO v_id;

  INSERT INTO public.email_autorizado (org_id, email, adicionado_por_id, pessoa_id)
  VALUES (v_eu.org_id, v_email, v_eu.id, v_id);

  INSERT INTO public.evento (org_id, quem_id, entidade, entidade_id, verbo, depois)
  VALUES (v_eu.org_id, v_eu.id, 'pessoa', v_id, 'convidou', jsonb_build_object('papel', p_papel));
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.convidar_usuario(text, public.papel, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convidar_usuario(text, public.papel, text, integer, text) TO authenticated;

-- 4. Trigger de colunas sensiveis: tambem bloqueia email e nome para nao-diretor
-- (inclui linhas sem auth_user_id, alvo do sequestro de convite).
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
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.nome IS DISTINCT FROM OLD.nome
    THEN
      RAISE EXCEPTION 'Somente diretor pode alterar nome, e-mail, papel, auth_user_id, org_id, ativo ou deleted_at';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Guarda do ultimo diretor serializada por org (corrida entre duas desativacoes simultaneas).
-- Mesma logica de 20261024000007 + advisory lock antes da checagem.
CREATE OR REPLACE FUNCTION public.guardar_diretor_pessoa()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_eu uuid;
  v_perde_acesso boolean := (OLD.ativo AND NOT NEW.ativo) OR (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL);
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(OLD.org_id::text));

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
