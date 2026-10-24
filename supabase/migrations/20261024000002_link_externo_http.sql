-- Seguranca: link_externo so aceita http(s) (evita javascript: em href).
UPDATE public.tarefa SET link_externo = NULL WHERE link_externo !~* '^https?://';
ALTER TABLE public.tarefa ADD CONSTRAINT tarefa_link_externo_http
  CHECK (link_externo IS NULL OR link_externo ~* '^https?://');
