-- Spec 007 FR-007-07: consultor tambem escreve contrato, aditivo e escopo.
DROP POLICY IF EXISTS "contrato_write" ON public.contrato;
CREATE POLICY "contrato_write" ON public.contrato
  FOR ALL TO authenticated
  USING (org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor'))
  WITH CHECK (org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor'));

DROP POLICY IF EXISTS "aditivo_write" ON public.aditivo;
CREATE POLICY "aditivo_write" ON public.aditivo
  FOR ALL TO authenticated
  USING (org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor'))
  WITH CHECK (org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor'));

DROP POLICY IF EXISTS "escopo_write" ON public.escopo;
CREATE POLICY "escopo_write" ON public.escopo
  FOR ALL TO authenticated
  USING (org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor'))
  WITH CHECK (org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor'));

-- Evento: cliente, projeto, contrato e quem referenciados devem ser da mesma org da linha.
CREATE OR REPLACE FUNCTION public.checar_org_evento()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.cliente_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.cliente WHERE id = NEW.cliente_id AND org_id = NEW.org_id) THEN
    RAISE EXCEPTION 'cliente_id de outra organizacao';
  END IF;
  IF NEW.projeto_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.projeto WHERE id = NEW.projeto_id AND org_id = NEW.org_id) THEN
    RAISE EXCEPTION 'projeto_id de outra organizacao';
  END IF;
  IF NEW.contrato_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.contrato WHERE id = NEW.contrato_id AND org_id = NEW.org_id) THEN
    RAISE EXCEPTION 'contrato_id de outra organizacao';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_org_evento ON public.evento;
CREATE TRIGGER trg_org_evento BEFORE INSERT ON public.evento
  FOR EACH ROW EXECUTE FUNCTION public.checar_org_evento();
