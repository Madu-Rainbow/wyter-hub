-- Fix: proteger aprovador_id, decidida_em, decisao_comentario contra manipulação
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

  -- aprovador_id imutável (só diretor pode reatribuir)
  IF NEW.aprovador_id IS DISTINCT FROM OLD.aprovador_id AND meu_papel IS DISTINCT FROM 'diretor' THEN
    RAISE EXCEPTION 'Somente diretor pode alterar o aprovador';
  END IF;

  -- status só pode ser alterado pelo aprovador designado ou diretor
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF meu_id IS NULL OR (meu_id IS DISTINCT FROM OLD.aprovador_id AND meu_papel IS DISTINCT FROM 'diretor') THEN
      RAISE EXCEPTION 'Somente o aprovador designado ou diretor pode alterar o status';
    END IF;
    IF NEW.status != 'pendente' AND NEW.decidida_em IS NULL THEN
      NEW.decidida_em := now();
    END IF;
  END IF;

  -- decidida_em e decisao_comentario protegidos da mesma forma
  IF (NEW.decidida_em IS DISTINCT FROM OLD.decidida_em OR NEW.decisao_comentario IS DISTINCT FROM OLD.decisao_comentario)
     AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    IF meu_id IS NULL OR (meu_id IS DISTINCT FROM OLD.aprovador_id AND meu_papel IS DISTINCT FROM 'diretor') THEN
      RAISE EXCEPTION 'Somente o aprovador designado ou diretor pode alterar decisão';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Reforçar insert: aprovador obrigatório e diferente do solicitante
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
    AND aprovador_id IS NOT NULL
    AND aprovador_id != solicitante_id
  );
