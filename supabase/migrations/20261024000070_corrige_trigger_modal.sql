-- C-08: checar_mesmo_org_modal lia NEW.entidade_tipo / capa_anexo_id / id em tabelas que nao tem essas colunas
-- (400 em POST/PATCH de tarefa, comentario e checklist). Agora le via to_jsonb(NEW): chave ausente vira NULL.

CREATE OR REPLACE FUNCTION public.checar_mesmo_org_modal() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  j jsonb := to_jsonb(NEW);
  r record;
  ok boolean;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('etiqueta','projeto_id','projeto'),
      ('tarefa_etiqueta','tarefa_id','tarefa'), ('tarefa_etiqueta','etiqueta_id','etiqueta'),
      ('tarefa_membro','tarefa_id','tarefa'), ('tarefa_membro','pessoa_id','pessoa'),
      ('tarefa_seguidor','tarefa_id','tarefa'), ('tarefa_seguidor','pessoa_id','pessoa'),
      ('tarefa_voto','tarefa_id','tarefa'), ('tarefa_voto','pessoa_id','pessoa'),
      ('comentario_reacao','comentario_id','comentario'), ('comentario_reacao','pessoa_id','pessoa'),
      ('comentario_mencao','comentario_id','comentario'), ('comentario_mencao','pessoa_id','pessoa'),
      ('comentario','parent_id','comentario'),
      ('checklist','tarefa_id','tarefa'),
      ('checklist_item','checklist_id','checklist'), ('checklist_item','responsavel_id','pessoa'),
      ('anexo','autor_id','pessoa')
    ) AS t(tab, col, ref) WHERE t.tab = TG_TABLE_NAME
  LOOP
    IF j->>r.col IS NOT NULL THEN
      EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE id = $1 AND org_id = $2)', r.ref)
        INTO ok USING (j->>r.col)::uuid, NEW.org_id;
      IF NOT ok THEN
        RAISE EXCEPTION 'Referência % em % pertence a outra organização', r.col, TG_TABLE_NAME;
      END IF;
    END IF;
  END LOOP;
  -- anexo polimorfico: so entidade 'tarefa' por ora.
  IF TG_TABLE_NAME = 'anexo' AND j->>'entidade_tipo' = 'tarefa' AND NOT EXISTS (
    SELECT 1 FROM public.tarefa WHERE id = (j->>'entidade_id')::uuid AND org_id = NEW.org_id) THEN
    RAISE EXCEPTION 'Tarefa do anexo pertence a outra organização';
  END IF;
  -- capa deve ser anexo da propria tarefa
  IF TG_TABLE_NAME = 'tarefa' AND j->>'capa_anexo_id' IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.anexo WHERE id = (j->>'capa_anexo_id')::uuid AND org_id = NEW.org_id
      AND entidade_tipo = 'tarefa' AND entidade_id = (j->>'id')::uuid) THEN
    RAISE EXCEPTION 'Capa deve ser um anexo da própria tarefa';
  END IF;
  RETURN NEW;
END;
$$;
