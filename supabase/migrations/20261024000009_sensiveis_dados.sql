-- FR-008 retificação por coluna; FR-012 dados sensíveis cifrados; FR-013 auditoria de acesso; US3 evento imutável
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Retificação
ALTER TABLE public.dossie_cliente ADD COLUMN retifica_id uuid REFERENCES public.dossie_cliente(id);
CREATE INDEX dossie_retifica_idx ON public.dossie_cliente(retifica_id) WHERE retifica_id IS NOT NULL;
UPDATE public.dossie_cliente d
SET retifica_id = substring(conteudo from '^\[Retificação:([0-9a-f-]{36})\]')::uuid,
    conteudo = regexp_replace(conteudo, '^\[Retificação:[0-9a-f-]{36}\]\s*', ''),
    tipo = 'retificacao'
WHERE conteudo ~ '^\[Retificação:[0-9a-f-]{36}\]'
  AND EXISTS (SELECT 1 FROM public.dossie_cliente o
              WHERE o.id = substring(d.conteudo from '^\[Retificação:([0-9a-f-]{36})\]')::uuid);

-- Chave no Vault (fora do código); gerada uma vez
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'dado_sensivel_key') THEN
    PERFORM vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'dado_sensivel_key');
  END IF;
END $$;

CREATE TABLE public.dado_sensivel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  cliente_id uuid NOT NULL REFERENCES public.cliente(id),
  entidade text NOT NULL DEFAULT 'cliente',
  entidade_id uuid NOT NULL,
  campo text NOT NULL CHECK (campo IN ('cpf', 'endereco', 'dado_processual')),
  valor_cifrado bytea NOT NULL,
  created_by uuid NOT NULL REFERENCES public.pessoa(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX dado_sensivel_cliente_idx ON public.dado_sensivel(cliente_id);
ALTER TABLE public.dado_sensivel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dado_sensivel_select" ON public.dado_sensivel FOR SELECT TO authenticated
  USING (org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor') AND deleted_at IS NULL);
-- escrita só pelas funções; valor cifrado nunca sai por SELECT direto
REVOKE ALL ON public.dado_sensivel FROM anon, authenticated;
GRANT SELECT (id, org_id, cliente_id, entidade, entidade_id, campo, created_by, created_at)
  ON public.dado_sensivel TO authenticated;

CREATE FUNCTION public.gravar_sensivel(p_cliente uuid, p_campo text, p_valor text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, vault AS $$
DECLARE v_id uuid; v_key text; v_pessoa uuid;
BEGIN
  IF public.my_papel() NOT IN ('diretor', 'consultor') THEN RAISE EXCEPTION 'sem permissão'; END IF;
  IF coalesce(btrim(p_valor), '') = '' THEN RAISE EXCEPTION 'valor vazio'; END IF;
  IF NOT EXISTS (SELECT 1 FROM cliente WHERE id = p_cliente AND org_id = public.my_org_id()) THEN
    RAISE EXCEPTION 'cliente inválido';
  END IF;
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'dado_sensivel_key';
  SELECT id INTO v_pessoa FROM pessoa WHERE auth_user_id = auth.uid();
  INSERT INTO dado_sensivel (org_id, cliente_id, entidade_id, campo, valor_cifrado, created_by)
  VALUES (public.my_org_id(), p_cliente, p_cliente, p_campo, pgp_sym_encrypt(p_valor, v_key), v_pessoa)
  RETURNING id INTO v_id;
  INSERT INTO evento (org_id, quem_id, entidade, entidade_id, verbo, depois, cliente_id)
  VALUES (public.my_org_id(), v_pessoa, 'dado_sensivel', v_id, 'gravou_sensivel', jsonb_build_object('campo', p_campo), p_cliente);
  RETURN v_id;
END $$;

-- Cada leitura grava evento acessou_sensivel (sem o valor)
CREATE FUNCTION public.revelar_sensivel(p_id uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, vault AS $$
DECLARE r dado_sensivel; v_key text; v_pessoa uuid;
BEGIN
  IF public.my_papel() NOT IN ('diretor', 'consultor') THEN RAISE EXCEPTION 'sem permissão'; END IF;
  SELECT * INTO r FROM dado_sensivel WHERE id = p_id AND org_id = public.my_org_id() AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'não encontrado'; END IF;
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'dado_sensivel_key';
  SELECT id INTO v_pessoa FROM pessoa WHERE auth_user_id = auth.uid();
  INSERT INTO evento (org_id, quem_id, entidade, entidade_id, verbo, depois, cliente_id)
  VALUES (r.org_id, v_pessoa, 'dado_sensivel', r.id, 'acessou_sensivel',
          jsonb_build_object('campo', r.campo, 'entidade', r.entidade, 'entidade_id', r.entidade_id), r.cliente_id);
  RETURN pgp_sym_decrypt(r.valor_cifrado, v_key);
END $$;

REVOKE ALL ON FUNCTION public.gravar_sensivel(uuid, text, text), public.revelar_sensivel(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gravar_sensivel(uuid, text, text), public.revelar_sensivel(uuid) TO authenticated;

-- US3: evento imutável também para service_role/owner
CREATE FUNCTION public.trg_evento_imutavel() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'evento é append-only'; END $$;
CREATE TRIGGER evento_imutavel BEFORE UPDATE OR DELETE ON public.evento
  FOR EACH ROW EXECUTE FUNCTION public.trg_evento_imutavel();
