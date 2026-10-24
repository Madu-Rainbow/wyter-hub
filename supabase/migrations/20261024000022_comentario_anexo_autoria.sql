-- Autoria nao falsificavel em comentario e anexo; edicao de comentario so de conteudo.
DROP POLICY IF EXISTS "comentario_insert" ON public.comentario;
CREATE POLICY "comentario_insert" ON public.comentario
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.my_org_id() AND public.my_papel() != 'convidado'
              AND autor_id = (SELECT id FROM public.get_my_pessoa()));

DROP POLICY IF EXISTS "comentario_update_autor" ON public.comentario;
CREATE POLICY "comentario_update_autor" ON public.comentario
  FOR UPDATE TO authenticated
  USING (org_id = public.my_org_id() AND public.my_papel() != 'convidado'
         AND autor_id = (SELECT id FROM public.get_my_pessoa()))
  WITH CHECK (org_id = public.my_org_id() AND public.my_papel() != 'convidado'
              AND autor_id = (SELECT id FROM public.get_my_pessoa()));

CREATE OR REPLACE FUNCTION public.comentario_campos_imutaveis()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.tarefa_id IS DISTINCT FROM OLD.tarefa_id
     OR NEW.parent_id IS DISTINCT FROM OLD.parent_id
     OR NEW.autor_id IS DISTINCT FROM OLD.autor_id
     OR NEW.org_id IS DISTINCT FROM OLD.org_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Campos do comentario nao podem ser alterados';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_comentario_imutaveis ON public.comentario;
CREATE TRIGGER trg_comentario_imutaveis BEFORE UPDATE ON public.comentario
  FOR EACH ROW EXECUTE FUNCTION public.comentario_campos_imutaveis();

DROP POLICY IF EXISTS "anexo_insert" ON public.anexo;
CREATE POLICY "anexo_insert" ON public.anexo
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.my_org_id() AND public.my_papel() != 'convidado'
              AND autor_id = (SELECT id FROM public.get_my_pessoa()));
