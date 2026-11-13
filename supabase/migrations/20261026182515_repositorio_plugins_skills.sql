CREATE TABLE public.repositorio_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  tipo text NOT NULL CHECK (tipo IN ('plugin', 'skill')),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
  nome text NOT NULL CHECK (length(btrim(nome)) BETWEEN 2 AND 120),
  descricao text NOT NULL DEFAULT '',
  conteudo text NOT NULL DEFAULT '',
  versao text NOT NULL DEFAULT '1.0.0',
  publicado boolean NOT NULL DEFAULT false,
  criado_por uuid NOT NULL REFERENCES public.pessoa(id),
  atualizado_por uuid NOT NULL REFERENCES public.pessoa(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, tipo, slug)
);

ALTER TABLE public.repositorio_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY repositorio_item_select ON public.repositorio_item
  FOR SELECT TO authenticated
  USING (org_id = public.my_org_id() AND (public.my_papel() <> 'convidado' OR publicado));

CREATE POLICY repositorio_item_insert ON public.repositorio_item
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = public.my_org_id()
    AND criado_por = (SELECT id FROM public.get_my_pessoa())
    AND atualizado_por = (SELECT id FROM public.get_my_pessoa())
    AND public.my_papel() IN ('diretor', 'consultor', 'analista')
  );

CREATE POLICY repositorio_item_update ON public.repositorio_item
  FOR UPDATE TO authenticated
  USING (org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor', 'analista'))
  WITH CHECK (org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor', 'analista'));

CREATE POLICY repositorio_item_delete ON public.repositorio_item
  FOR DELETE TO authenticated
  USING (org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.repositorio_item TO authenticated;
CREATE INDEX repositorio_item_org_publicado_idx
  ON public.repositorio_item (org_id, publicado, tipo, updated_at DESC);