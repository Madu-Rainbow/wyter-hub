-- Recreate the financial views explicitly so the Data API schema is refreshed
-- after the restricted column grants on contrato and aditivo.
CREATE OR REPLACE VIEW public.contrato_financeiro
WITH (security_invoker = false) AS
SELECT c.id AS contrato_id, c.org_id, c.valor, c.forma_pagamento
FROM public.contrato AS c
WHERE c.org_id = public.my_org_id()
  AND public.my_papel() IN ('diretor', 'consultor');

CREATE OR REPLACE VIEW public.aditivo_financeiro
WITH (security_invoker = false) AS
SELECT a.id AS aditivo_id, a.contrato_id, a.org_id, a.impacto_valor
FROM public.aditivo AS a
WHERE a.org_id = public.my_org_id()
  AND public.my_papel() IN ('diretor', 'consultor');

REVOKE ALL ON public.contrato_financeiro, public.aditivo_financeiro FROM PUBLIC, anon;
GRANT SELECT ON public.contrato_financeiro, public.aditivo_financeiro TO authenticated;

NOTIFY pgrst, 'reload schema';