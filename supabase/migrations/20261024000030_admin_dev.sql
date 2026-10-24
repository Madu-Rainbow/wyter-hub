-- Conta admin de DESENVOLVIMENTO (diretor). Senha fraca: trocar antes de uso real (specs/009 S-13).
-- Idempotente. Ordem: pessoa + email_autorizado primeiro, auth.users depois (o trigger auth_user_criado vincula).
DO $$
DECLARE
  v_email constant text := 'admin@gmail.com';
  v_hash constant text := '$2a$10$y4FNOrxhtjSWwS7ytbMwNutcMxMg9wrhEwF3CVbYVuOwOVeMPJKja';
  v_org uuid;
  v_pessoa uuid;
  v_uid uuid;
BEGIN
  SELECT id INTO v_org FROM public.organizacao ORDER BY created_at LIMIT 1;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Nenhuma organizacao cadastrada';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email) THEN
    RETURN;
  END IF;

  SELECT id INTO v_pessoa FROM public.pessoa
  WHERE lower(email) = v_email AND deleted_at IS NULL LIMIT 1;
  IF v_pessoa IS NULL THEN
    INSERT INTO public.pessoa (org_id, nome, email, papel)
    VALUES (v_org, 'Admin', v_email, 'diretor') RETURNING id INTO v_pessoa;
  ELSE
    UPDATE public.pessoa SET papel = 'diretor', ativo = true WHERE id = v_pessoa;
  END IF;

  IF EXISTS (SELECT 1 FROM public.email_autorizado WHERE lower(email) = v_email) THEN
    UPDATE public.email_autorizado SET pessoa_id = v_pessoa WHERE lower(email) = v_email;
  ELSE
    INSERT INTO public.email_autorizado (org_id, email, pessoa_id) VALUES (v_org, v_email, v_pessoa);
  END IF;

  v_uid := gen_random_uuid();
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', v_email, v_hash, now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), v_uid, v_uid::text, 'email',
          jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
          now(), now(), now());
END;
$$;
