-- Spec 004 (Ponte Claude): tokens pessoais do MCP, validacao por hash, taxa e auditoria. Enum origem ja tem 'mcp'.

CREATE TABLE public.token_mcp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  pessoa_id uuid NOT NULL REFERENCES public.pessoa(id),
  nome text NOT NULL CHECK (length(btrim(nome)) BETWEEN 1 AND 80),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  prefixo text NOT NULL,
  escopo text NOT NULL DEFAULT 'leitura' CHECK (escopo IN ('leitura', 'escrita')),
  expira_em timestamptz NOT NULL,
  ultimo_uso_em timestamptz,
  revogado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX token_mcp_pessoa_idx ON public.token_mcp(pessoa_id);

ALTER TABLE public.token_mcp ENABLE ROW LEVEL SECURITY;
-- Cada usuario ve so os seus. Sem policy de escrita: criar/revogar so pelas funcoes abaixo.
CREATE POLICY "token_mcp_select_proprio" ON public.token_mcp FOR SELECT TO authenticated
  USING (pessoa_id IN (SELECT id FROM public.get_my_pessoa()));
REVOKE ALL ON public.token_mcp FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, pessoa_id, nome, prefixo, escopo, expira_em, ultimo_uso_em, revogado_em, created_at)
  ON public.token_mcp TO authenticated;

-- Cria token (devolve o valor UMA vez; guarda so o SHA-256). Convidado nao cria.
CREATE FUNCTION public.criar_token_mcp(p_nome text, p_escopo text DEFAULT 'leitura', p_dias integer DEFAULT 90)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_me record;
  v_token text;
BEGIN
  SELECT * INTO v_me FROM public.get_my_pessoa();
  IF v_me.id IS NULL OR v_me.papel = 'convidado' THEN RAISE EXCEPTION 'sem permissao'; END IF;
  IF p_escopo NOT IN ('leitura', 'escrita') THEN RAISE EXCEPTION 'escopo invalido'; END IF;
  IF p_dias IS NULL OR p_dias < 1 OR p_dias > 365 THEN RAISE EXCEPTION 'validade deve ser de 1 a 365 dias'; END IF;
  IF (SELECT count(*) FROM public.token_mcp
       WHERE pessoa_id = v_me.id AND revogado_em IS NULL AND expira_em > now()) >= 10 THEN
    RAISE EXCEPTION 'limite de 10 tokens ativos';
  END IF;
  v_token := 'wyh_' || encode(extensions.gen_random_bytes(32), 'hex');
  INSERT INTO public.token_mcp (org_id, pessoa_id, nome, token_hash, prefixo, escopo, expira_em)
  VALUES (v_me.org_id, v_me.id, btrim(p_nome),
          encode(extensions.digest(v_token, 'sha256'), 'hex'), left(v_token, 8),
          p_escopo, now() + make_interval(days => p_dias));
  RETURN v_token;
END $$;

CREATE FUNCTION public.revogar_token_mcp(p_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  UPDATE public.token_mcp SET revogado_em = now()
   WHERE id = p_id AND revogado_em IS NULL
     AND pessoa_id IN (SELECT id FROM public.get_my_pessoa());
$$;

-- Validacao por hash (so Edge Function / service_role). Atualiza ultimo uso.
CREATE FUNCTION public.mcp_validar_token(p_hash text)
RETURNS TABLE(token_id uuid, pessoa_id uuid, org_id uuid, papel public.papel, escopo text, auth_user_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH t AS (
    UPDATE public.token_mcp tk SET ultimo_uso_em = now()
     FROM public.pessoa p
     WHERE tk.token_hash = p_hash AND tk.revogado_em IS NULL AND tk.expira_em > now()
       AND p.id = tk.pessoa_id AND p.ativo AND p.deleted_at IS NULL AND p.auth_user_id IS NOT NULL
       AND p.papel <> 'convidado'
     RETURNING tk.id, tk.pessoa_id, tk.org_id, p.papel, tk.escopo, p.auth_user_id
  ) SELECT * FROM t;
END $$;

-- Chamadas do token na ultima hora/dia (limite de taxa).
CREATE FUNCTION public.mcp_checar_taxa(p_token uuid)
RETURNS TABLE(ultimo_minuto integer, ultimo_dia integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT count(*) FILTER (WHERE quando > now() - interval '1 minute')::int,
         count(*)::int
    FROM public.evento
   WHERE entidade = 'mcp' AND entidade_id = p_token AND quando > now() - interval '1 day';
$$;

-- Auditoria: sem argumentos, sem valores.
CREATE FUNCTION public.mcp_auditar(
  p_token uuid, p_ferramenta text, p_escopo text, p_ok boolean, p_ms integer)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE tk public.token_mcp;
BEGIN
  SELECT * INTO tk FROM public.token_mcp WHERE id = p_token;
  IF tk.id IS NULL THEN RETURN; END IF;
  INSERT INTO public.evento (org_id, quem_id, entidade, entidade_id, verbo, depois, origem)
  VALUES (tk.org_id, tk.pessoa_id, 'mcp', tk.id, left('mcp:' || p_ferramenta, 60),
          jsonb_build_object('ferramenta', left(p_ferramenta, 60), 'escopo', p_escopo, 'ok', p_ok, 'ms', p_ms), 'mcp');
END $$;

CREATE INDEX evento_mcp_idx ON public.evento(entidade_id, quando) WHERE entidade = 'mcp';

REVOKE ALL ON FUNCTION public.mcp_validar_token(text), public.mcp_checar_taxa(uuid),
  public.mcp_auditar(uuid, text, text, boolean, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_validar_token(text), public.mcp_checar_taxa(uuid),
  public.mcp_auditar(uuid, text, text, boolean, integer) TO service_role;
REVOKE ALL ON FUNCTION public.criar_token_mcp(text, text, integer), public.revogar_token_mcp(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_token_mcp(text, text, integer), public.revogar_token_mcp(uuid) TO authenticated;

-- Origem 'mcp' nos eventos de tarefa: a Edge Function manda o cabecalho x-wyter-origem=mcp
-- (PostgREST o expoe em request.headers). Mesma funcao de 000006; so o calculo de origem muda.
-- Cabecalho forjavel por qualquer usuario: afeta apenas o rotulo do evento, nao permissoes.
CREATE OR REPLACE FUNCTION public.log_evento_tarefa(
  t public.tarefa, p_verbo text, p_antes jsonb, p_depois jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_quem uuid;
  v_origem public.origem;
  v_cliente uuid;
  v_contrato uuid;
  v_hdr text;
BEGIN
  BEGIN
    v_hdr := current_setting('request.headers', true)::json ->> 'x-wyter-origem';
  EXCEPTION WHEN OTHERS THEN v_hdr := NULL;
  END;
  SELECT id INTO v_quem FROM public.pessoa
   WHERE auth_user_id = auth.uid() AND org_id = t.org_id AND deleted_at IS NULL LIMIT 1;
  IF v_quem IS NOT NULL THEN
    v_origem := CASE WHEN v_hdr = 'mcp' OR (t.origem IN ('mcp', 'ia') AND p_verbo = 'criou') THEN 'mcp'
                     WHEN t.origem IN ('trello', 'email', 'drive') AND p_verbo = 'criou' THEN 'importador'
                     ELSE 'ui' END;
  ELSE
    v_origem := 'sistema';
    SELECT id INTO v_quem FROM public.pessoa WHERE id = t.responsavel_id;
    IF v_quem IS NULL THEN
      SELECT id INTO v_quem FROM public.pessoa
       WHERE org_id = t.org_id AND papel = 'diretor' AND deleted_at IS NULL ORDER BY created_at LIMIT 1;
    END IF;
  END IF;
  IF v_quem IS NULL THEN RETURN; END IF;

  SELECT pr.cliente_id, pr.contrato_id INTO v_cliente, v_contrato FROM public.projeto pr WHERE pr.id = t.projeto_id;

  INSERT INTO public.evento (org_id, quem_id, entidade, entidade_id, verbo, antes, depois, origem, cliente_id, projeto_id, contrato_id)
  VALUES (t.org_id, v_quem, 'tarefa', t.id, p_verbo, p_antes, p_depois, v_origem, v_cliente, t.projeto_id, v_contrato);
END;
$$;
