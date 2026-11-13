-- Comentario feito via MCP saia como 'ui': trg_comentario_evento ignorava x-wyter-origem.
-- Mesmo cabecalho usado por log_evento_tarefa (000040). So 'mcp' ou 'ui' vem do cabecalho; default 'ui'.
-- Rotulo apenas: nao altera permissoes.
CREATE OR REPLACE FUNCTION public.trg_comentario_evento() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  tr public.tarefa;
  v_origem public.origem;
  v_hdr text;
BEGIN
  BEGIN
    v_hdr := current_setting('request.headers', true)::json ->> 'x-wyter-origem';
  EXCEPTION WHEN OTHERS THEN v_hdr := NULL;
  END;
  SELECT * INTO tr FROM public.tarefa WHERE id = NEW.tarefa_id;
  v_origem := CASE WHEN NOT EXISTS (SELECT 1 FROM public.pessoa WHERE auth_user_id = auth.uid()) THEN 'sistema'
                   WHEN v_hdr = 'mcp' THEN 'mcp'
                   ELSE 'ui' END;
  INSERT INTO public.evento (org_id, quem_id, entidade, entidade_id, verbo, depois, origem, cliente_id, projeto_id, contrato_id)
  SELECT NEW.org_id, NEW.autor_id, 'tarefa', NEW.tarefa_id, 'comentou',
         jsonb_build_object('texto', left(NEW.texto, 200)), v_origem, pr.cliente_id, tr.projeto_id, pr.contrato_id
    FROM public.projeto pr WHERE pr.id = tr.projeto_id;
  RETURN NEW;
END;
$$;
