-- Tokens MCP permanecem ativos ate serem revogados explicitamente pelo usuario.
ALTER TABLE public.token_mcp
  ALTER COLUMN expira_em DROP NOT NULL;

DROP FUNCTION IF EXISTS public.criar_token_mcp(text, text, integer);
CREATE OR REPLACE FUNCTION public.criar_token_mcp(
  p_nome text,
  p_escopo text DEFAULT 'leitura'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me record;
  v_token text;
BEGIN
  SELECT * INTO v_me FROM public.get_my_pessoa();
  IF v_me.id IS NULL OR v_me.papel = 'convidado' THEN
    RAISE EXCEPTION 'sem permissao';
  END IF;
  IF p_escopo NOT IN ('leitura', 'escrita') THEN
    RAISE EXCEPTION 'escopo invalido';
  END IF;
  IF (SELECT count(*) FROM public.token_mcp
      WHERE pessoa_id = v_me.id AND revogado_em IS NULL) >= 10 THEN
    RAISE EXCEPTION 'limite de 10 tokens ativos';
  END IF;
  v_token := 'wyh_' || encode(extensions.gen_random_bytes(32), 'hex');
  INSERT INTO public.token_mcp (
    org_id, pessoa_id, nome, token_hash, prefixo, escopo, expira_em
  )
  VALUES (
    v_me.org_id, v_me.id, btrim(p_nome),
    encode(extensions.digest(v_token, 'sha256'), 'hex'), left(v_token, 8),
    p_escopo, NULL
  );
  RETURN v_token;
END
$$;

CREATE OR REPLACE FUNCTION public.mcp_validar_token(p_hash text)
RETURNS TABLE(token_id uuid, pessoa_id uuid, org_id uuid, papel public.papel, escopo text, auth_user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH t AS (
    UPDATE public.token_mcp tk
    SET ultimo_uso_em = now()
    FROM public.pessoa p
    WHERE tk.token_hash = p_hash
      AND tk.revogado_em IS NULL
      AND p.id = tk.pessoa_id
      AND p.ativo
      AND p.deleted_at IS NULL
      AND p.auth_user_id IS NOT NULL
      AND p.papel <> 'convidado'
    RETURNING tk.id, tk.pessoa_id, tk.org_id, p.papel, tk.escopo, p.auth_user_id
  )
  SELECT * FROM t;
END
$$;

REVOKE ALL ON FUNCTION public.criar_token_mcp(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_token_mcp(text, text) TO authenticated;