-- Spec 008 (DataWare): grafo da base. Views security_invoker (RLS do chamador), sem campos sensiveis.

CREATE EXTENSION IF NOT EXISTS pg_graphql;

-- Nos. atributos: so campos nao sensiveis (sem CPF/endereco/processuais/arquivo_url/email/conteudo de dossie).
-- Eventos NAO entram aqui (FR-008-05): ver dw_eventos.
CREATE VIEW public.dw_no WITH (security_invoker = true) AS
  SELECT c.id, 'cliente'::text AS tipo, coalesce(c.nome_fantasia, c.razao_social) AS rotulo,
    c.org_id, c.id AS cliente_id, c.status::text AS status,
    jsonb_strip_nulls(jsonb_build_object('segmento', c.segmento, 'cidade', c.cidade, 'uf', c.uf,
      'responsavel_id', c.responsavel_id, 'tags', to_jsonb(c.tags))) AS atributos
  FROM public.cliente c WHERE c.deleted_at IS NULL
  UNION ALL
  SELECT k.id, 'contrato', coalesce(k.numero || ' · ', '') || k.tipo, k.org_id, k.cliente_id, NULL,
    jsonb_strip_nulls(jsonb_build_object('tipo', k.tipo, 'numero', k.numero,
      'vigencia_inicio', k.vigencia_inicio, 'vigencia_fim', k.vigencia_fim, 'contrato_id', k.id))
  FROM public.contrato k WHERE k.deleted_at IS NULL
  UNION ALL
  SELECT p.id, 'projeto', p.nome, p.org_id, p.cliente_id, p.status::text,
    jsonb_strip_nulls(jsonb_build_object('chave', p.chave, 'tipo', p.tipo, 'frente', p.frente,
      'data_inicio', p.data_inicio, 'data_fim', p.data_fim, 'contrato_id', p.contrato_id,
      'projeto_id', p.id, 'responsavel_id', p.responsavel_id))
  FROM public.projeto p WHERE p.deleted_at IS NULL
  UNION ALL
  SELECT t.id, CASE WHEN t.parent_id IS NULL THEN 'tarefa' ELSE 'subtarefa' END, t.titulo, t.org_id,
    p.cliente_id, t.status::text,
    jsonb_strip_nulls(jsonb_build_object('chave', p.chave || '-' || t.numero, 'prioridade', t.prioridade,
      'categoria', t.categoria, 'data_inicio', t.data_inicio, 'data_prazo', t.data_prazo,
      'projeto_id', t.projeto_id, 'contrato_id', p.contrato_id, 'responsavel_id', t.responsavel_id))
  FROM public.tarefa t JOIN public.projeto p ON p.id = t.projeto_id WHERE t.deleted_at IS NULL
  UNION ALL
  SELECT s.id, 'pessoa', s.nome, s.org_id, NULL, CASE WHEN s.ativo THEN 'ativo' ELSE 'inativo' END,
    jsonb_strip_nulls(jsonb_build_object('papel', s.papel, 'cargo', s.cargo))
  FROM public.pessoa s WHERE s.deleted_at IS NULL
  UNION ALL
  SELECT d.id, 'dossie', 'Dossiê · ' || d.tipo::text, d.org_id, d.cliente_id, d.confianca::text,
    jsonb_strip_nulls(jsonb_build_object('tipo', d.tipo, 'fonte', d.fonte, 'data_referencia', d.data_referencia))
  FROM public.dossie_cliente d WHERE d.deleted_at IS NULL
  UNION ALL
  SELECT a.id, 'aditivo', 'Aditivo ' || to_char(a.data, 'DD/MM/YYYY'), a.org_id, k.cliente_id, NULL,
    jsonb_strip_nulls(jsonb_build_object('data', a.data, 'motivo', left(a.motivo, 200),
      'contrato_id', a.contrato_id))
  FROM public.aditivo a JOIN public.contrato k ON k.id = a.contrato_id
  UNION ALL
  SELECT e.id, 'escopo', left(e.descricao, 60), e.org_id, e.cliente_id, e.status::text,
    jsonb_strip_nulls(jsonb_build_object('contrato_id', e.contrato_id))
  FROM public.escopo_extra e
  UNION ALL
  SELECT ap.id, 'aprovacao', 'Aprovação · ' || ap.status::text, ap.org_id,
    coalesce(p.cliente_id, e.cliente_id), ap.status::text,
    jsonb_strip_nulls(jsonb_build_object('decidida_em', ap.decidida_em, 'projeto_id', t.projeto_id,
      'contrato_id', coalesce(p.contrato_id, e.contrato_id)))
  FROM public.aprovacao ap
  LEFT JOIN public.tarefa t ON t.id = ap.tarefa_id
  LEFT JOIN public.projeto p ON p.id = t.projeto_id
  LEFT JOIN public.escopo_extra e ON e.id = ap.escopo_extra_id;

CREATE VIEW public.dw_aresta WITH (security_invoker = true) AS
  SELECT cliente_id AS origem, id AS destino, 'contrato'::text AS relacao
    FROM public.contrato WHERE deleted_at IS NULL
  UNION ALL
  SELECT coalesce(contrato_id, cliente_id), id, 'projeto'
    FROM public.projeto WHERE deleted_at IS NULL AND parent_id IS NULL
  UNION ALL
  SELECT parent_id, id, 'subprojeto' FROM public.projeto WHERE deleted_at IS NULL AND parent_id IS NOT NULL
  UNION ALL
  SELECT coalesce(parent_id, projeto_id), id, CASE WHEN parent_id IS NULL THEN 'tarefa' ELSE 'subtarefa' END
    FROM public.tarefa WHERE deleted_at IS NULL
  UNION ALL
  SELECT responsavel_id, id, 'responsavel' FROM public.cliente WHERE deleted_at IS NULL AND responsavel_id IS NOT NULL
  UNION ALL
  SELECT responsavel_id, id, 'responsavel' FROM public.projeto WHERE deleted_at IS NULL AND responsavel_id IS NOT NULL
  UNION ALL
  SELECT responsavel_id, id, 'responsavel' FROM public.tarefa WHERE deleted_at IS NULL AND responsavel_id IS NOT NULL
  UNION ALL
  SELECT cliente_id, id, 'dossie' FROM public.dossie_cliente WHERE deleted_at IS NULL
  UNION ALL
  SELECT contrato_id, id, 'aditivo' FROM public.aditivo
  UNION ALL
  SELECT coalesce(contrato_id, cliente_id), id, 'escopo' FROM public.escopo_extra
  UNION ALL
  SELECT coalesce(tarefa_id, escopo_extra_id), id, 'aprovacao' FROM public.aprovacao
    WHERE coalesce(tarefa_id, escopo_extra_id) IS NOT NULL
  UNION ALL
  SELECT solicitante_id, id, 'solicitou' FROM public.aprovacao
  UNION ALL
  SELECT aprovador_id, id, 'aprova' FROM public.aprovacao;

-- Vizinhanca (FR-008-06): profundidade 1..3, ate 500 nos. Invoker: so enxerga o que a RLS permite.
CREATE FUNCTION public.dw_vizinhanca(no_id uuid, profundidade int DEFAULT 1)
RETURNS jsonb
LANGUAGE sql STABLE SET search_path = ''
AS $$
  WITH RECURSIVE ar AS MATERIALIZED (
    SELECT origem, destino, relacao FROM public.dw_aresta
  ), bi AS (
    SELECT origem AS a, destino AS b FROM ar UNION ALL SELECT destino, origem FROM ar
  ), walk(id, d) AS (
    SELECT no_id, 0
    UNION
    SELECT bi.b, walk.d + 1 FROM walk JOIN bi ON bi.a = walk.id
    WHERE walk.d < least(greatest(coalesce(profundidade, 1), 1), 3)
  ), ids AS (
    SELECT id FROM (SELECT id, min(d) AS d FROM walk GROUP BY id) w ORDER BY d LIMIT 500
  ), nos AS (
    SELECT n.* FROM public.dw_no n JOIN ids USING (id)
  )
  SELECT jsonb_build_object(
    'nos', coalesce((SELECT jsonb_agg(to_jsonb(nos)) FROM nos), '[]'::jsonb),
    'arestas', coalesce((SELECT jsonb_agg(to_jsonb(ar)) FROM ar
       WHERE ar.origem IN (SELECT id FROM nos) AND ar.destino IN (SELECT id FROM nos)), '[]'::jsonb));
$$;

-- Eventos (FR-008-05): so por filtro (pessoa, cliente ou janela de tempo); nunca todos. Sem antes/depois.
CREATE FUNCTION public.dw_eventos(
  p_pessoa uuid DEFAULT NULL, p_cliente uuid DEFAULT NULL,
  p_de timestamptz DEFAULT NULL, p_ate timestamptz DEFAULT NULL, p_limite int DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql STABLE SET search_path = ''
AS $$
DECLARE r jsonb;
BEGIN
  IF p_pessoa IS NULL AND p_cliente IS NULL AND p_de IS NULL AND p_ate IS NULL THEN
    RAISE EXCEPTION 'dw_eventos exige ao menos um filtro (pessoa, cliente ou periodo)';
  END IF;
  WITH ev AS (
    SELECT * FROM public.evento
    WHERE (p_pessoa IS NULL OR quem_id = p_pessoa) AND (p_cliente IS NULL OR cliente_id = p_cliente)
      AND (p_de IS NULL OR quando >= p_de) AND (p_ate IS NULL OR quando <= p_ate)
    ORDER BY quando DESC LIMIT least(greatest(coalesce(p_limite, 100), 1), 500)
  )
  SELECT jsonb_build_object(
    'nos', coalesce(jsonb_agg(jsonb_build_object('id', id, 'tipo', 'evento', 'rotulo', verbo || ' ' || entidade,
      'org_id', org_id, 'cliente_id', cliente_id, 'status', NULL,
      'atributos', jsonb_strip_nulls(jsonb_build_object('quando', quando, 'entidade', entidade,
        'verbo', verbo, 'projeto_id', projeto_id, 'responsavel_id', quem_id)))), '[]'::jsonb),
    'arestas', coalesce(jsonb_agg(jsonb_build_object('origem', quem_id, 'destino', id, 'relacao', 'autor'))
      || jsonb_agg(jsonb_build_object('origem', id, 'destino', entidade_id, 'relacao', 'afetou')), '[]'::jsonb))
  INTO r FROM ev;
  RETURN r;
END $$;

COMMENT ON VIEW public.dw_no IS e'@graphql({"primary_key_columns": ["id"], "totalCount": {"enabled": true}})';
COMMENT ON VIEW public.dw_aresta IS e'@graphql({"primary_key_columns": ["origem", "destino", "relacao"], "totalCount": {"enabled": true}})';

REVOKE ALL ON public.dw_no, public.dw_aresta FROM anon, public;
GRANT SELECT ON public.dw_no, public.dw_aresta TO authenticated;
REVOKE ALL ON FUNCTION public.dw_vizinhanca(uuid, int), public.dw_eventos(uuid, uuid, timestamptz, timestamptz, int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.dw_vizinhanca(uuid, int), public.dw_eventos(uuid, uuid, timestamptz, timestamptz, int) TO authenticated;
