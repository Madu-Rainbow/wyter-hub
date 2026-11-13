-- F-09: reagendou com prazo anterior nulo gravava antes = {} (jsonb_strip_nulls removia a chave).
-- Agora a chave do campo alterado sempre existe, mesmo com valor null.

CREATE OR REPLACE FUNCTION public.trg_tarefa_evento() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_evento_tarefa(NEW, 'criou', NULL,
      jsonb_build_object('titulo', NEW.titulo, 'status', NEW.status));
    RETURN NEW;
  END IF;

  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    PERFORM public.log_evento_tarefa(NEW, 'excluiu', jsonb_build_object('titulo', OLD.titulo), NULL);
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.log_evento_tarefa(NEW,
      CASE WHEN NEW.status = 'concluida' THEN 'concluiu'
           WHEN OLD.status = 'concluida' THEN 'reabriu'
           ELSE 'moveu' END,
      jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status));
  END IF;
  IF NEW.responsavel_id IS DISTINCT FROM OLD.responsavel_id THEN
    PERFORM public.log_evento_tarefa(NEW, 'reatribuiu',
      jsonb_build_object('responsavel_id', OLD.responsavel_id), jsonb_build_object('responsavel_id', NEW.responsavel_id));
  END IF;
  IF NEW.data_prazo IS DISTINCT FROM OLD.data_prazo OR NEW.data_inicio IS DISTINCT FROM OLD.data_inicio THEN
    PERFORM public.log_evento_tarefa(NEW, 'reagendou',
      (CASE WHEN NEW.data_prazo IS DISTINCT FROM OLD.data_prazo
            THEN jsonb_build_object('data_prazo', OLD.data_prazo) ELSE '{}'::jsonb END)
      || (CASE WHEN NEW.data_inicio IS DISTINCT FROM OLD.data_inicio
            THEN jsonb_build_object('data_inicio', OLD.data_inicio) ELSE '{}'::jsonb END),
      (CASE WHEN NEW.data_prazo IS DISTINCT FROM OLD.data_prazo
            THEN jsonb_build_object('data_prazo', NEW.data_prazo) ELSE '{}'::jsonb END)
      || (CASE WHEN NEW.data_inicio IS DISTINCT FROM OLD.data_inicio
            THEN jsonb_build_object('data_inicio', NEW.data_inicio) ELSE '{}'::jsonb END));
  END IF;
  IF NEW.prioridade IS DISTINCT FROM OLD.prioridade THEN
    PERFORM public.log_evento_tarefa(NEW, 'repriorizou',
      jsonb_build_object('prioridade', OLD.prioridade), jsonb_build_object('prioridade', NEW.prioridade));
  END IF;
  RETURN NEW;
END;
$$;
