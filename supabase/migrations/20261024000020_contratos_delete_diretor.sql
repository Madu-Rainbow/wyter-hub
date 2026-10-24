-- Consultor escreve (insert/update) contrato, aditivo e escopo; DELETE fisico so diretor.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['contrato', 'aditivo', 'escopo'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_write', t);
    EXECUTE format($f$CREATE POLICY %I ON public.%I FOR INSERT TO authenticated
      WITH CHECK (org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor'))$f$, t || '_insert', t);
    EXECUTE format($f$CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated
      USING (org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor'))
      WITH CHECK (org_id = public.my_org_id() AND public.my_papel() IN ('diretor', 'consultor'))$f$, t || '_update', t);
    EXECUTE format($f$CREATE POLICY %I ON public.%I FOR DELETE TO authenticated
      USING (org_id = public.my_org_id() AND public.my_papel() = 'diretor')$f$, t || '_delete', t);
  END LOOP;
END $$;
