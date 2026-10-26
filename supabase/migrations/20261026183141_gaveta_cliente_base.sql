CREATE TABLE public.gaveta_pasta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  cliente_id uuid NOT NULL REFERENCES public.cliente(id),
  pai_id uuid REFERENCES public.gaveta_pasta(id),
  contrato_id uuid REFERENCES public.contrato(id),
  projeto_id uuid REFERENCES public.projeto(id),
  nome text NOT NULL CHECK (length(btrim(nome)) BETWEEN 1 AND 120),
  criado_por uuid NOT NULL REFERENCES public.pessoa(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX gaveta_pasta_nome_unico_idx
  ON public.gaveta_pasta (cliente_id, coalesce(pai_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(btrim(nome)))
  WHERE deleted_at IS NULL;
CREATE INDEX gaveta_pasta_cliente_idx ON public.gaveta_pasta (org_id, cliente_id, pai_id)
  WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX gaveta_pasta_contrato_idx ON public.gaveta_pasta (contrato_id)
  WHERE contrato_id IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX gaveta_pasta_projeto_idx ON public.gaveta_pasta (projeto_id)
  WHERE projeto_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE public.gaveta_arquivo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  cliente_id uuid NOT NULL REFERENCES public.cliente(id),
  pasta_id uuid REFERENCES public.gaveta_pasta(id),
  nome text NOT NULL CHECK (length(btrim(nome)) BETWEEN 1 AND 255),
  tipo_mime text NOT NULL,
  tamanho bigint NOT NULL CHECK (tamanho > 0 AND tamanho <= 26214400),
  storage_path text NOT NULL UNIQUE,
  versao_atual integer NOT NULL DEFAULT 1 CHECK (versao_atual > 0),
  criado_por uuid NOT NULL REFERENCES public.pessoa(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX gaveta_arquivo_cliente_idx ON public.gaveta_arquivo (org_id, cliente_id, pasta_id)
  WHERE deleted_at IS NULL;

CREATE TABLE public.gaveta_versao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  arquivo_id uuid NOT NULL REFERENCES public.gaveta_arquivo(id),
  numero integer NOT NULL CHECK (numero > 0),
  storage_path text NOT NULL UNIQUE,
  tamanho bigint NOT NULL CHECK (tamanho > 0 AND tamanho <= 26214400),
  sha256 text,
  criado_por uuid NOT NULL REFERENCES public.pessoa(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (arquivo_id, numero)
);

ALTER TABLE public.gaveta_pasta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gaveta_arquivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gaveta_versao ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.gaveta_pode_escrever(p_cliente uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT public.my_papel() IN ('diretor', 'consultor')
    AND EXISTS (
      SELECT 1 FROM public.cliente c
      WHERE c.id = p_cliente AND c.org_id = public.my_org_id() AND c.deleted_at IS NULL
    );
$$;

CREATE POLICY gaveta_pasta_select ON public.gaveta_pasta
  FOR SELECT TO authenticated USING (org_id = public.my_org_id());
CREATE POLICY gaveta_pasta_write ON public.gaveta_pasta
  FOR ALL TO authenticated
  USING (org_id = public.my_org_id() AND public.gaveta_pode_escrever(cliente_id))
  WITH CHECK (org_id = public.my_org_id() AND public.gaveta_pode_escrever(cliente_id));

CREATE POLICY gaveta_arquivo_select ON public.gaveta_arquivo
  FOR SELECT TO authenticated USING (org_id = public.my_org_id());
CREATE POLICY gaveta_arquivo_write ON public.gaveta_arquivo
  FOR ALL TO authenticated
  USING (org_id = public.my_org_id() AND public.gaveta_pode_escrever(cliente_id))
  WITH CHECK (org_id = public.my_org_id() AND public.gaveta_pode_escrever(cliente_id));

CREATE POLICY gaveta_versao_select ON public.gaveta_versao
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gaveta_arquivo a
    WHERE a.id = arquivo_id AND a.org_id = public.my_org_id()
  ));
CREATE POLICY gaveta_versao_write ON public.gaveta_versao
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.gaveta_arquivo a
    WHERE a.id = arquivo_id AND a.org_id = public.my_org_id()
      AND public.gaveta_pode_escrever(a.cliente_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.gaveta_arquivo a
    WHERE a.id = arquivo_id AND a.org_id = public.my_org_id()
      AND public.gaveta_pode_escrever(a.cliente_id)
  ));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gaveta',
  'gaveta',
  false,
  26214400,
  ARRAY[
    'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
    'text/csv', 'text/plain', 'text/markdown',
    'application/zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 26214400,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY gaveta_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'gaveta' AND (storage.foldername(name))[1] = public.my_org_id()::text);
CREATE POLICY gaveta_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'gaveta'
    AND (storage.foldername(name))[1] = public.my_org_id()::text
    AND public.my_papel() IN ('diretor', 'consultor')
  );
CREATE POLICY gaveta_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'gaveta'
    AND (storage.foldername(name))[1] = public.my_org_id()::text
    AND public.my_papel() IN ('diretor', 'consultor')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gaveta_pasta TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gaveta_arquivo TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gaveta_versao TO authenticated;

CREATE OR REPLACE FUNCTION public.gaveta_criar_hierarquia_cliente()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pasta_cliente uuid;
BEGIN
  INSERT INTO public.gaveta_pasta (org_id, cliente_id, nome, criado_por)
  SELECT NEW.org_id, NEW.id, coalesce(nullif(btrim(NEW.nome_fantasia), ''), NEW.razao_social),
    coalesce(NEW.responsavel_id, (SELECT id FROM public.pessoa WHERE org_id = NEW.org_id AND papel = 'diretor' ORDER BY created_at LIMIT 1))
  WHERE coalesce(NEW.responsavel_id, (SELECT id FROM public.pessoa WHERE org_id = NEW.org_id AND papel = 'diretor' ORDER BY created_at LIMIT 1)) IS NOT NULL
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_pasta_cliente;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.gaveta_criar_hierarquia_contrato()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pasta_cliente uuid;
  v_pessoa uuid;
BEGIN
  SELECT id INTO v_pasta_cliente FROM public.gaveta_pasta
  WHERE cliente_id = NEW.cliente_id AND contrato_id IS NULL AND projeto_id IS NULL AND deleted_at IS NULL
  LIMIT 1;
  SELECT id INTO v_pessoa FROM public.pessoa
  WHERE org_id = NEW.org_id
  ORDER BY (papel = 'diretor') DESC, created_at LIMIT 1;
  IF v_pasta_cliente IS NOT NULL AND v_pessoa IS NOT NULL THEN
    INSERT INTO public.gaveta_pasta (org_id, cliente_id, pai_id, contrato_id, nome, criado_por)
    VALUES (NEW.org_id, NEW.cliente_id, v_pasta_cliente, NEW.id,
      coalesce(nullif(btrim(NEW.numero), ''), NEW.tipo), v_pessoa)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.gaveta_criar_hierarquia_projeto()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pai uuid;
  v_pessoa uuid;
BEGIN
  SELECT id INTO v_pai FROM public.gaveta_pasta
  WHERE (contrato_id = NEW.contrato_id OR (NEW.contrato_id IS NULL AND cliente_id = NEW.cliente_id))
    AND deleted_at IS NULL
  ORDER BY contrato_id NULLS LAST LIMIT 1;
  SELECT coalesce(NEW.responsavel_id, id) INTO v_pessoa FROM public.pessoa
  WHERE id = NEW.responsavel_id OR (org_id = NEW.org_id AND papel = 'diretor')
  ORDER BY (id = NEW.responsavel_id) DESC, created_at LIMIT 1;
  IF v_pai IS NOT NULL AND v_pessoa IS NOT NULL THEN
    INSERT INTO public.gaveta_pasta (org_id, cliente_id, pai_id, projeto_id, nome, criado_por)
    VALUES (NEW.org_id, NEW.cliente_id, v_pai, NEW.id, NEW.nome, v_pessoa)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER cliente_cria_gaveta
  AFTER INSERT ON public.cliente FOR EACH ROW EXECUTE FUNCTION public.gaveta_criar_hierarquia_cliente();
CREATE TRIGGER contrato_cria_gaveta
  AFTER INSERT ON public.contrato FOR EACH ROW EXECUTE FUNCTION public.gaveta_criar_hierarquia_contrato();
CREATE TRIGGER projeto_cria_gaveta
  AFTER INSERT ON public.projeto FOR EACH ROW EXECUTE FUNCTION public.gaveta_criar_hierarquia_projeto();

INSERT INTO public.gaveta_pasta (org_id, cliente_id, nome, criado_por)
SELECT c.org_id, c.id, coalesce(nullif(btrim(c.nome_fantasia), ''), c.razao_social), p.id
FROM public.cliente c
JOIN LATERAL (
  SELECT id FROM public.pessoa
  WHERE org_id = c.org_id AND (id = c.responsavel_id OR papel = 'diretor')
  ORDER BY (id = c.responsavel_id) DESC, created_at LIMIT 1
) p ON true
WHERE c.deleted_at IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.gaveta_pasta (org_id, cliente_id, pai_id, contrato_id, nome, criado_por)
SELECT k.org_id, k.cliente_id, gp.id, k.id, coalesce(nullif(btrim(k.numero), ''), k.tipo), p.id
FROM public.contrato k
JOIN public.gaveta_pasta gp ON gp.cliente_id = k.cliente_id
  AND gp.contrato_id IS NULL AND gp.projeto_id IS NULL AND gp.deleted_at IS NULL
JOIN LATERAL (
  SELECT id FROM public.pessoa WHERE org_id = k.org_id ORDER BY (papel = 'diretor') DESC, created_at LIMIT 1
) p ON true
WHERE k.deleted_at IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.gaveta_pasta (org_id, cliente_id, pai_id, projeto_id, nome, criado_por)
SELECT p.org_id, p.cliente_id, gp.id, p.id, p.nome, pe.id
FROM public.projeto p
JOIN public.gaveta_pasta gp ON gp.cliente_id = p.cliente_id
  AND (gp.contrato_id = p.contrato_id OR (p.contrato_id IS NULL AND gp.contrato_id IS NULL))
  AND gp.deleted_at IS NULL
JOIN LATERAL (
  SELECT id FROM public.pessoa WHERE org_id = p.org_id ORDER BY (papel = 'diretor') DESC, created_at LIMIT 1
) pe ON true
WHERE p.deleted_at IS NULL
ON CONFLICT DO NOTHING;