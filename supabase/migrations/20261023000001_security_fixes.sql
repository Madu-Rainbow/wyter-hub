-- =============================================================================
-- Fix 1: Aprovação — só pode inserir como pendente, sem decisão, e como solicitante
-- =============================================================================

DROP POLICY IF EXISTS "aprovacao_insert" ON public.aprovacao;
CREATE POLICY "aprovacao_insert" ON public.aprovacao
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = public.my_org_id()
    AND public.my_papel() != 'convidado'
    AND status = 'pendente'
    AND decidida_em IS NULL
    AND decisao_comentario IS NULL
    AND solicitante_id = (SELECT id FROM public.get_my_pessoa())
  );

-- Só o aprovador designado (ou diretor) pode alterar status da aprovação
CREATE OR REPLACE FUNCTION public.proteger_aprovacao_decisao()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  meu_id uuid;
  meu_papel public.papel;
BEGIN
  SELECT p.id, p.papel INTO meu_id, meu_papel FROM public.get_my_pessoa() p;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF meu_id != OLD.aprovador_id AND meu_papel != 'diretor' THEN
      RAISE EXCEPTION 'Somente o aprovador designado ou diretor pode alterar o status da aprovação';
    END IF;
    IF NEW.status != 'pendente' AND NEW.decidida_em IS NULL THEN
      NEW.decidida_em := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_aprovacao_proteger_decisao
  BEFORE UPDATE ON public.aprovacao
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_aprovacao_decisao();

-- =============================================================================
-- Fix 2: Evento — forçar quem_id = pessoa logada (anti-spoofing no audit log)
-- =============================================================================

DROP POLICY IF EXISTS "evento_insert" ON public.evento;
CREATE POLICY "evento_insert" ON public.evento
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = public.my_org_id()
    AND quem_id = (SELECT id FROM public.get_my_pessoa())
  );

-- Comentário — forçar autor_id = pessoa logada
DROP POLICY IF EXISTS "comentario_insert" ON public.comentario;
CREATE POLICY "comentario_insert" ON public.comentario
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = public.my_org_id()
    AND public.my_papel() != 'convidado'
    AND autor_id = (SELECT id FROM public.get_my_pessoa())
  );

-- Registro diário — forçar pessoa_id = pessoa logada (diretor pode sobrescrever)
DROP POLICY IF EXISTS "registro_insert" ON public.registro_diario;
CREATE POLICY "registro_insert" ON public.registro_diario
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = public.my_org_id()
    AND public.my_papel() != 'convidado'
    AND (
      pessoa_id = (SELECT id FROM public.get_my_pessoa())
      OR public.my_papel() = 'diretor'
    )
  );

DROP POLICY IF EXISTS "registro_update" ON public.registro_diario;
CREATE POLICY "registro_update" ON public.registro_diario
  FOR UPDATE TO authenticated
  USING (
    org_id = public.my_org_id()
    AND (
      pessoa_id = (SELECT id FROM public.get_my_pessoa())
      OR public.my_papel() = 'diretor'
    )
  );
