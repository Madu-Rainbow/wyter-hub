ALTER TABLE public.gaveta_pasta
  ADD COLUMN IF NOT EXISTS contrato_id uuid REFERENCES public.contrato(id),
  ADD COLUMN IF NOT EXISTS projeto_id uuid REFERENCES public.projeto(id);

CREATE UNIQUE INDEX IF NOT EXISTS gaveta_pasta_contrato_idx
  ON public.gaveta_pasta (contrato_id)
  WHERE contrato_id IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS gaveta_pasta_projeto_idx
  ON public.gaveta_pasta (projeto_id)
  WHERE projeto_id IS NOT NULL AND deleted_at IS NULL;

CREATE OR REPLACE VIEW public.dw_gaveta_no WITH (security_invoker = true) AS
  SELECT p.id, 'pasta'::text AS tipo, p.nome AS rotulo, p.org_id, p.cliente_id,
    NULL::text AS status,
    jsonb_strip_nulls(jsonb_build_object(
      'pai_id', p.pai_id, 'contrato_id', p.contrato_id, 'projeto_id', p.projeto_id
    )) AS atributos
  FROM public.gaveta_pasta p
  WHERE p.deleted_at IS NULL
  UNION ALL
  SELECT a.id, 'arquivo'::text, a.nome, a.org_id, a.cliente_id, NULL::text,
    jsonb_strip_nulls(jsonb_build_object(
      'pasta_id', a.pasta_id, 'tipo_mime', a.tipo_mime, 'tamanho', a.tamanho,
      'versao_atual', a.versao_atual
    ))
  FROM public.gaveta_arquivo a
  WHERE a.deleted_at IS NULL;

CREATE OR REPLACE VIEW public.dw_gaveta_aresta WITH (security_invoker = true) AS
  SELECT cliente_id AS origem, id AS destino, 'pasta_cliente'::text AS relacao
  FROM public.gaveta_pasta WHERE deleted_at IS NULL
  UNION ALL
  SELECT pai_id, id, 'subpasta' FROM public.gaveta_pasta
  WHERE pai_id IS NOT NULL AND deleted_at IS NULL
  UNION ALL
  SELECT pasta_id, id, 'arquivo' FROM public.gaveta_arquivo
  WHERE pasta_id IS NOT NULL AND deleted_at IS NULL
  UNION ALL
  SELECT contrato_id, id, 'pasta_contrato' FROM public.gaveta_pasta
  WHERE contrato_id IS NOT NULL AND deleted_at IS NULL
  UNION ALL
  SELECT projeto_id, id, 'pasta_projeto' FROM public.gaveta_pasta
  WHERE projeto_id IS NOT NULL AND deleted_at IS NULL;

REVOKE ALL ON public.dw_gaveta_no, public.dw_gaveta_aresta FROM anon, public;
GRANT SELECT ON public.dw_gaveta_no, public.dw_gaveta_aresta TO authenticated;

CREATE OR REPLACE FUNCTION public.gaveta_criar_hierarquia_cliente()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pessoa uuid;
BEGIN
  SELECT id INTO v_pessoa FROM public.pessoa
  WHERE org_id = NEW.org_id AND (id = NEW.responsavel_id OR papel = 'diretor')
  ORDER BY (id = NEW.responsavel_id) DESC, created_at LIMIT 1;
  IF v_pessoa IS NOT NULL THEN
    INSERT INTO public.gaveta_pasta (org_id, cliente_id, nome, criado_por)
    VALUES (NEW.org_id, NEW.id, coalesce(nullif(btrim(NEW.nome_fantasia), ''), NEW.razao_social), v_pessoa)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.gaveta_criar_hierarquia_contrato()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pai uuid; v_pessoa uuid;
BEGIN
  SELECT id INTO v_pai FROM public.gaveta_pasta
  WHERE cliente_id = NEW.cliente_id AND contrato_id IS NULL AND projeto_id IS NULL
    AND deleted_at IS NULL LIMIT 1;
  SELECT id INTO v_pessoa FROM public.pessoa
  WHERE org_id = NEW.org_id ORDER BY (papel = 'diretor') DESC, created_at LIMIT 1;
  IF v_pai IS NOT NULL AND v_pessoa IS NOT NULL THEN
    INSERT INTO public.gaveta_pasta (org_id, cliente_id, pai_id, contrato_id, nome, criado_por)
    VALUES (NEW.org_id, NEW.cliente_id, v_pai, NEW.id,
      coalesce(nullif(btrim(NEW.numero), ''), NEW.tipo), v_pessoa)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.gaveta_criar_hierarquia_projeto()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pai uuid; v_pessoa uuid;
BEGIN
  SELECT id INTO v_pai FROM public.gaveta_pasta
  WHERE cliente_id = NEW.cliente_id
    AND (contrato_id = NEW.contrato_id OR (NEW.contrato_id IS NULL AND contrato_id IS NULL))
    AND deleted_at IS NULL ORDER BY contrato_id NULLS LAST LIMIT 1;
  SELECT id INTO v_pessoa FROM public.pessoa
  WHERE org_id = NEW.org_id ORDER BY (id = NEW.responsavel_id) DESC, (papel = 'diretor') DESC, created_at LIMIT 1;
  IF v_pai IS NOT NULL AND v_pessoa IS NOT NULL THEN
    INSERT INTO public.gaveta_pasta (org_id, cliente_id, pai_id, projeto_id, nome, criado_por)
    VALUES (NEW.org_id, NEW.cliente_id, v_pai, NEW.id, NEW.nome, v_pessoa)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cliente_cria_gaveta ON public.cliente;
DROP TRIGGER IF EXISTS contrato_cria_gaveta ON public.contrato;
DROP TRIGGER IF EXISTS projeto_cria_gaveta ON public.projeto;
CREATE TRIGGER cliente_cria_gaveta AFTER INSERT ON public.cliente
  FOR EACH ROW EXECUTE FUNCTION public.gaveta_criar_hierarquia_cliente();
CREATE TRIGGER contrato_cria_gaveta AFTER INSERT ON public.contrato
  FOR EACH ROW EXECUTE FUNCTION public.gaveta_criar_hierarquia_contrato();
CREATE TRIGGER projeto_cria_gaveta AFTER INSERT ON public.projeto
  FOR EACH ROW EXECUTE FUNCTION public.gaveta_criar_hierarquia_projeto();

INSERT INTO public.gaveta_pasta (org_id, cliente_id, nome, criado_por)
SELECT c.org_id, c.id, coalesce(nullif(btrim(c.nome_fantasia), ''), c.razao_social), p.id
FROM public.cliente c
JOIN LATERAL (
  SELECT id FROM public.pessoa
  WHERE org_id = c.org_id AND (id = c.responsavel_id OR papel = 'diretor')
  ORDER BY (id = c.responsavel_id) DESC, created_at LIMIT 1
) p ON true
WHERE c.deleted_at IS NULL ON CONFLICT DO NOTHING;

INSERT INTO public.gaveta_pasta (org_id, cliente_id, pai_id, contrato_id, nome, criado_por)
SELECT c.org_id, c.cliente_id, gp.id, c.id, coalesce(nullif(btrim(c.numero), ''), c.tipo), p.id
FROM public.contrato c
JOIN public.gaveta_pasta gp ON gp.cliente_id = c.cliente_id
  AND gp.contrato_id IS NULL AND gp.projeto_id IS NULL AND gp.deleted_at IS NULL
JOIN LATERAL (SELECT id FROM public.pessoa WHERE org_id = c.org_id ORDER BY (papel = 'diretor') DESC, created_at LIMIT 1) p ON true
WHERE c.deleted_at IS NULL ON CONFLICT DO NOTHING;

INSERT INTO public.gaveta_pasta (org_id, cliente_id, pai_id, projeto_id, nome, criado_por)
SELECT p.org_id, p.cliente_id, gp.id, p.id, p.nome, pe.id
FROM public.projeto p
JOIN public.gaveta_pasta gp ON gp.cliente_id = p.cliente_id
  AND (gp.contrato_id = p.contrato_id OR (p.contrato_id IS NULL AND gp.contrato_id IS NULL))
  AND gp.deleted_at IS NULL
JOIN LATERAL (SELECT id FROM public.pessoa WHERE org_id = p.org_id ORDER BY (papel = 'diretor') DESC, created_at LIMIT 1) pe ON true
WHERE p.deleted_at IS NULL ON CONFLICT DO NOTHING;