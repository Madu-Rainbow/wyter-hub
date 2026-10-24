-- Spec 007: vinculo projeto -> contrato e situacao de andamento derivada.
ALTER TABLE public.projeto ADD COLUMN contrato_id uuid REFERENCES public.contrato(id);
CREATE INDEX idx_projeto_contrato_id ON public.projeto(contrato_id);

CREATE VIEW public.contrato_andamento WITH (security_invoker = true) AS
WITH agg AS (
  SELECT
    c.id AS contrato_id,
    c.org_id,
    c.cliente_id,
    c.vigencia_fim,
    (SELECT count(*) FROM public.projeto p
       WHERE p.contrato_id = c.id AND p.deleted_at IS NULL) AS total_projetos,
    (SELECT count(*) FROM public.tarefa t
       JOIN public.projeto p ON p.id = t.projeto_id
       WHERE p.contrato_id = c.id AND p.deleted_at IS NULL AND t.deleted_at IS NULL) AS total_tarefas,
    (SELECT count(*) FROM public.tarefa t
       JOIN public.projeto p ON p.id = t.projeto_id
       WHERE p.contrato_id = c.id AND p.deleted_at IS NULL AND t.deleted_at IS NULL
         AND t.status IN ('concluida', 'cancelada')) AS tarefas_entregues
  FROM public.contrato c
  WHERE c.deleted_at IS NULL
)
SELECT
  contrato_id, org_id, cliente_id,
  total_projetos::int AS total_projetos,
  total_tarefas::int AS total_tarefas,
  tarefas_entregues::int AS tarefas_entregues,
  CASE
    WHEN vigencia_fim < current_date THEN 'encerrado'
    WHEN total_projetos = 0 THEN 'sem_projeto'
    WHEN total_tarefas > tarefas_entregues THEN 'em_andamento'
    ELSE 'entregue'
  END AS situacao
FROM agg;

GRANT SELECT ON public.contrato_andamento TO authenticated;
