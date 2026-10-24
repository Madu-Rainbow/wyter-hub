-- Modal da tarefa estilo Trello (FR-002-32..42): membros, etiquetas, datas, checklists multiplas,
-- anexos + capa, comentarios (resposta/edicao/mencao/reacao), seguir/votar, arquivar.
-- Eventos de tarefa via trigger (sem valores financeiros). RLS: org + convidado so le.

-- ---------------------------------------------------------------------------
-- 1. Colunas novas
-- ---------------------------------------------------------------------------
ALTER TABLE public.tarefa
  ADD COLUMN prazo_hora time,
  ADD COLUMN lembrete_em timestamptz,
  ADD COLUMN entregue_em timestamptz,
  ADD COLUMN arquivada_em timestamptz,
  ADD COLUMN capa_anexo_id uuid,
  ADD COLUMN n_anexos integer NOT NULL DEFAULT 0;

ALTER TABLE public.anexo
  ADD COLUMN autor_id uuid REFERENCES public.pessoa(id),
  ADD COLUMN eh_arquivo boolean NOT NULL DEFAULT false;
-- Link: so http/https. Arquivo: caminho no bucket "anexos".
ALTER TABLE public.anexo ADD CONSTRAINT anexo_link_http
  CHECK (eh_arquivo OR url_ou_caminho ~* '^https?://') NOT VALID;
ALTER TABLE public.anexo ADD CONSTRAINT anexo_tamanho_max
  CHECK (tamanho_bytes IS NULL OR tamanho_bytes <= 26214400);
CREATE INDEX anexo_entidade_idx ON public.anexo(entidade_tipo, entidade_id);

ALTER TABLE public.tarefa ADD CONSTRAINT tarefa_capa_fk
  FOREIGN KEY (capa_anexo_id) REFERENCES public.anexo(id) ON DELETE SET NULL;

ALTER TABLE public.comentario
  ADD COLUMN parent_id uuid REFERENCES public.comentario(id),
  ADD COLUMN editado_em timestamptz;

COMMENT ON COLUMN public.tarefa.checklist IS 'DEPRECATED: migrado para checklist/checklist_item (000012).';

-- ---------------------------------------------------------------------------
-- 2. Tabelas novas
-- ---------------------------------------------------------------------------
CREATE TABLE public.etiqueta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  projeto_id uuid REFERENCES public.projeto(id),
  nome text NOT NULL CHECK (length(btrim(nome)) > 0),
  cor text NOT NULL DEFAULT 'azul',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX etiqueta_org_idx ON public.etiqueta(org_id, projeto_id);

CREATE TABLE public.tarefa_etiqueta (
  tarefa_id uuid NOT NULL REFERENCES public.tarefa(id) ON DELETE CASCADE,
  etiqueta_id uuid NOT NULL REFERENCES public.etiqueta(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  PRIMARY KEY (tarefa_id, etiqueta_id)
);

CREATE TABLE public.tarefa_membro (
  tarefa_id uuid NOT NULL REFERENCES public.tarefa(id) ON DELETE CASCADE,
  pessoa_id uuid NOT NULL REFERENCES public.pessoa(id),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  PRIMARY KEY (tarefa_id, pessoa_id)
);
CREATE INDEX tarefa_membro_pessoa_idx ON public.tarefa_membro(pessoa_id);

CREATE TABLE public.tarefa_seguidor (
  tarefa_id uuid NOT NULL REFERENCES public.tarefa(id) ON DELETE CASCADE,
  pessoa_id uuid NOT NULL REFERENCES public.pessoa(id),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  PRIMARY KEY (tarefa_id, pessoa_id)
);

CREATE TABLE public.tarefa_voto (
  tarefa_id uuid NOT NULL REFERENCES public.tarefa(id) ON DELETE CASCADE,
  pessoa_id uuid NOT NULL REFERENCES public.pessoa(id),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  PRIMARY KEY (tarefa_id, pessoa_id)
);

CREATE TABLE public.comentario_reacao (
  comentario_id uuid NOT NULL REFERENCES public.comentario(id) ON DELETE CASCADE,
  pessoa_id uuid NOT NULL REFERENCES public.pessoa(id),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  emoji text NOT NULL CHECK (length(emoji) BETWEEN 1 AND 16),
  PRIMARY KEY (comentario_id, pessoa_id, emoji)
);

CREATE TABLE public.comentario_mencao (
  comentario_id uuid NOT NULL REFERENCES public.comentario(id) ON DELETE CASCADE,
  pessoa_id uuid NOT NULL REFERENCES public.pessoa(id),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  PRIMARY KEY (comentario_id, pessoa_id)
);
CREATE INDEX comentario_mencao_pessoa_idx ON public.comentario_mencao(pessoa_id);

CREATE TABLE public.checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  tarefa_id uuid NOT NULL REFERENCES public.tarefa(id) ON DELETE CASCADE,
  titulo text NOT NULL DEFAULT 'Checklist',
  pos integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX checklist_tarefa_idx ON public.checklist(tarefa_id);

CREATE TABLE public.checklist_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizacao(id),
  checklist_id uuid NOT NULL REFERENCES public.checklist(id) ON DELETE CASCADE,
  texto text NOT NULL CHECK (length(btrim(texto)) > 0),
  feito boolean NOT NULL DEFAULT false,
  responsavel_id uuid REFERENCES public.pessoa(id),
  prazo date,
  pos integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX checklist_item_cl_idx ON public.checklist_item(checklist_id);

-- Migra o jsonb antigo (tarefa.checklist) para uma checklist "Checklist" por tarefa (antes dos triggers de evento).
INSERT INTO public.checklist (id, org_id, tarefa_id, titulo)
SELECT gen_random_uuid(), t.org_id, t.id, 'Checklist'
  FROM public.tarefa t
 WHERE jsonb_typeof(t.checklist) = 'array' AND jsonb_array_length(t.checklist) > 0;

INSERT INTO public.checklist_item (org_id, checklist_id, texto, feito, pos)
SELECT c.org_id, c.id, btrim(e.item->>'texto'), COALESCE((e.item->>'feito')::boolean, false), (e.n - 1)::int
  FROM public.checklist c
  JOIN public.tarefa t ON t.id = c.tarefa_id
  CROSS JOIN LATERAL jsonb_array_elements(t.checklist) WITH ORDINALITY AS e(item, n)
 WHERE length(btrim(COALESCE(e.item->>'texto', ''))) > 0;

-- ---------------------------------------------------------------------------
-- 3. Mesmo org (referencias) e consistencia
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.checar_mesmo_org_modal() RETURNS trigger
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
  IF TG_TABLE_NAME = 'anexo' AND NEW.entidade_tipo = 'tarefa' AND NOT EXISTS (
    SELECT 1 FROM public.tarefa WHERE id = NEW.entidade_id AND org_id = NEW.org_id) THEN
    RAISE EXCEPTION 'Tarefa do anexo pertence a outra organização';
  END IF;
  -- capa deve ser anexo da propria tarefa
  IF TG_TABLE_NAME = 'tarefa' AND NEW.capa_anexo_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.anexo WHERE id = NEW.capa_anexo_id AND org_id = NEW.org_id
      AND entidade_tipo = 'tarefa' AND entidade_id = NEW.id) THEN
    RAISE EXCEPTION 'Capa deve ser um anexo da própria tarefa';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['etiqueta','tarefa_etiqueta','tarefa_membro','tarefa_seguidor','tarefa_voto',
    'comentario_reacao','comentario_mencao','comentario','checklist','checklist_item','anexo','tarefa']
  LOOP
    EXECUTE format('CREATE TRIGGER trg_org_modal BEFORE INSERT OR UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.checar_mesmo_org_modal()', t);
  END LOOP;
END $$;

-- Contador de anexos da tarefa.
CREATE FUNCTION public.trg_anexo_contador() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.entidade_tipo = 'tarefa' THEN
    UPDATE public.tarefa SET n_anexos = n_anexos + 1 WHERE id = NEW.entidade_id;
  ELSIF TG_OP = 'DELETE' AND OLD.entidade_tipo = 'tarefa' THEN
    UPDATE public.tarefa SET n_anexos = GREATEST(n_anexos - 1, 0) WHERE id = OLD.entidade_id;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
CREATE TRIGGER anexo_contador AFTER INSERT OR DELETE ON public.anexo
  FOR EACH ROW EXECUTE FUNCTION public.trg_anexo_contador();

-- Mencoes: extrai @[Nome](pessoa:UUID) do texto do comentario.
CREATE FUNCTION public.trg_comentario_mencao() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.texto IS NOT DISTINCT FROM OLD.texto THEN RETURN NEW; END IF;
    DELETE FROM public.comentario_mencao WHERE comentario_id = NEW.id;
  END IF;
  INSERT INTO public.comentario_mencao (comentario_id, pessoa_id, org_id)
  SELECT DISTINCT NEW.id, p.id, NEW.org_id
    FROM regexp_matches(NEW.texto, '\(pessoa:([0-9a-fA-F-]{36})\)', 'g') AS m(a)
    JOIN public.pessoa p ON p.id::text = lower(m.a[1]) AND p.org_id = NEW.org_id
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER comentario_mencao AFTER INSERT OR UPDATE OF texto ON public.comentario
  FOR EACH ROW EXECUTE FUNCTION public.trg_comentario_mencao();

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['etiqueta','tarefa_etiqueta','tarefa_membro','checklist','checklist_item']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (org_id = public.my_org_id())', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated
      USING (org_id = public.my_org_id() AND public.my_papel() != ''convidado'')
      WITH CHECK (org_id = public.my_org_id() AND public.my_papel() != ''convidado'')', t || '_write', t);
  END LOOP;
  -- Proprias (seguir, votar, reagir): so a propria pessoa, nao convidado.
  FOREACH t IN ARRAY ARRAY['tarefa_seguidor','tarefa_voto','comentario_reacao']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (org_id = public.my_org_id())', t || '_select', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated
      USING (org_id = public.my_org_id() AND public.my_papel() != ''convidado''
             AND pessoa_id = (SELECT id FROM public.get_my_pessoa()))
      WITH CHECK (org_id = public.my_org_id() AND public.my_papel() != ''convidado''
             AND pessoa_id = (SELECT id FROM public.get_my_pessoa()))', t || '_write', t);
  END LOOP;
END $$;

ALTER TABLE public.comentario_mencao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comentario_mencao_select" ON public.comentario_mencao
  FOR SELECT TO authenticated USING (org_id = public.my_org_id());
-- insert/update/delete so pelo trigger (SECURITY DEFINER).

-- Comentario: autor edita/exclui (soft) o proprio.
CREATE POLICY "comentario_update_autor" ON public.comentario
  FOR UPDATE TO authenticated
  USING (org_id = public.my_org_id() AND autor_id = (SELECT id FROM public.get_my_pessoa()))
  WITH CHECK (org_id = public.my_org_id() AND autor_id = (SELECT id FROM public.get_my_pessoa()));

-- Anexo: delete por nao-convidado da org.
CREATE POLICY "anexo_delete" ON public.anexo
  FOR DELETE TO authenticated
  USING (org_id = public.my_org_id() AND public.my_papel() != 'convidado');

-- ---------------------------------------------------------------------------
-- 5. Storage: bucket privado "anexos" (25 MB, tipos comuns), caminho {org_id}/{tarefa_id}/{arquivo}
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('anexos', 'anexos', false, 26214400, ARRAY[
  'image/png','image/jpeg','image/gif','image/webp','application/pdf','text/plain','text/csv',
  'application/zip','application/msword','application/vnd.ms-excel','application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "anexos_obj_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'anexos' AND (storage.foldername(name))[1] = public.my_org_id()::text);
CREATE POLICY "anexos_obj_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'anexos' AND (storage.foldername(name))[1] = public.my_org_id()::text
              AND public.my_papel() != 'convidado');
CREATE POLICY "anexos_obj_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'anexos' AND (storage.foldername(name))[1] = public.my_org_id()::text
         AND public.my_papel() != 'convidado');

-- ---------------------------------------------------------------------------
-- 6. Eventos (append-only em public.evento) via trigger. Sem valores financeiros.
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.log_evento_tarefa_id(p_tarefa uuid, p_verbo text, p_antes jsonb, p_depois jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE t public.tarefa;
BEGIN
  SELECT * INTO t FROM public.tarefa WHERE id = p_tarefa;
  IF t.id IS NOT NULL THEN PERFORM public.log_evento_tarefa(t, p_verbo, p_antes, p_depois); END IF;
END;
$$;

-- Edicoes extras da tarefa (titulo, descricao, hora, lembrete, entrega, arquivo, capa, projeto).
CREATE FUNCTION public.trg_tarefa_evento_modal() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.titulo IS DISTINCT FROM OLD.titulo THEN
    PERFORM public.log_evento_tarefa(NEW, 'editou',
      jsonb_build_object('titulo', OLD.titulo), jsonb_build_object('titulo', NEW.titulo));
  END IF;
  IF NEW.descricao IS DISTINCT FROM OLD.descricao THEN
    PERFORM public.log_evento_tarefa(NEW, 'editou', NULL, jsonb_build_object('campo', 'descricao'));
  END IF;
  IF NEW.prazo_hora IS DISTINCT FROM OLD.prazo_hora THEN
    PERFORM public.log_evento_tarefa(NEW, 'reagendou',
      jsonb_build_object('prazo_hora', OLD.prazo_hora), jsonb_build_object('prazo_hora', NEW.prazo_hora));
  END IF;
  IF NEW.lembrete_em IS DISTINCT FROM OLD.lembrete_em THEN
    PERFORM public.log_evento_tarefa(NEW, CASE WHEN NEW.lembrete_em IS NULL THEN 'removeu_lembrete' ELSE 'definiu_lembrete' END,
      NULL, jsonb_build_object('lembrete_em', NEW.lembrete_em));
  END IF;
  IF NEW.entregue_em IS DISTINCT FROM OLD.entregue_em THEN
    PERFORM public.log_evento_tarefa(NEW, CASE WHEN NEW.entregue_em IS NULL THEN 'desmarcou_entrega' ELSE 'marcou_entrega' END, NULL, NULL);
  END IF;
  IF NEW.arquivada_em IS DISTINCT FROM OLD.arquivada_em THEN
    PERFORM public.log_evento_tarefa(NEW, CASE WHEN NEW.arquivada_em IS NULL THEN 'restaurou' ELSE 'arquivou' END, NULL, NULL);
  END IF;
  IF NEW.capa_anexo_id IS DISTINCT FROM OLD.capa_anexo_id THEN
    PERFORM public.log_evento_tarefa(NEW, CASE WHEN NEW.capa_anexo_id IS NULL THEN 'removeu_capa' ELSE 'definiu_capa' END, NULL, NULL);
  END IF;
  IF NEW.projeto_id IS DISTINCT FROM OLD.projeto_id THEN
    PERFORM public.log_evento_tarefa(NEW, 'moveu_projeto',
      jsonb_build_object('projeto_id', OLD.projeto_id), jsonb_build_object('projeto_id', NEW.projeto_id));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER tarefa_evento_modal AFTER UPDATE ON public.tarefa
  FOR EACH ROW EXECUTE FUNCTION public.trg_tarefa_evento_modal();

-- Membro / etiqueta.
CREATE FUNCTION public.trg_tarefa_rel_evento() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE r jsonb := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END; v_nome text; v_ins boolean := TG_OP = 'INSERT';
BEGIN
  IF TG_TABLE_NAME = 'tarefa_membro' THEN
    SELECT nome INTO v_nome FROM public.pessoa WHERE id = (r->>'pessoa_id')::uuid;
    PERFORM public.log_evento_tarefa_id((r->>'tarefa_id')::uuid,
      CASE WHEN v_ins THEN 'adicionou_membro' ELSE 'removeu_membro' END, NULL, jsonb_build_object('membro', v_nome));
  ELSE
    SELECT nome INTO v_nome FROM public.etiqueta WHERE id = (r->>'etiqueta_id')::uuid;
    PERFORM public.log_evento_tarefa_id((r->>'tarefa_id')::uuid,
      CASE WHEN v_ins THEN 'aplicou_etiqueta' ELSE 'removeu_etiqueta' END, NULL, jsonb_build_object('etiqueta', v_nome));
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
CREATE TRIGGER tarefa_membro_evento AFTER INSERT OR DELETE ON public.tarefa_membro
  FOR EACH ROW EXECUTE FUNCTION public.trg_tarefa_rel_evento();
CREATE TRIGGER tarefa_etiqueta_evento AFTER INSERT OR DELETE ON public.tarefa_etiqueta
  FOR EACH ROW EXECUTE FUNCTION public.trg_tarefa_rel_evento();

-- Anexo (nome do arquivo; sem URL).
CREATE FUNCTION public.trg_anexo_evento() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE a public.anexo;
BEGIN
  IF TG_OP = 'DELETE' THEN a := OLD; ELSE a := NEW; END IF;
  IF a.entidade_tipo = 'tarefa' THEN
    PERFORM public.log_evento_tarefa_id(a.entidade_id,
      CASE WHEN TG_OP = 'INSERT' THEN 'anexou' ELSE 'removeu_anexo' END, NULL,
      jsonb_build_object('arquivo', left(a.nome_arquivo, 120)));
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
CREATE TRIGGER anexo_evento AFTER INSERT OR DELETE ON public.anexo
  FOR EACH ROW EXECUTE FUNCTION public.trg_anexo_evento();

-- Checklist e itens (marcar/desmarcar).
CREATE FUNCTION public.trg_checklist_evento() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- tarefa pode estar sendo removida em cascata: log_evento_tarefa_id ignora se nao existir.
    PERFORM public.log_evento_tarefa_id(OLD.tarefa_id, 'removeu_checklist', NULL, jsonb_build_object('checklist', OLD.titulo));
    RETURN OLD;
  END IF;
  PERFORM public.log_evento_tarefa_id(NEW.tarefa_id, 'criou_checklist', NULL, jsonb_build_object('checklist', NEW.titulo));
  RETURN NEW;
END;
$$;
CREATE TRIGGER checklist_evento AFTER INSERT OR DELETE ON public.checklist
  FOR EACH ROW EXECUTE FUNCTION public.trg_checklist_evento();

CREATE FUNCTION public.trg_checklist_item_evento() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_tarefa uuid;
BEGIN
  SELECT tarefa_id INTO v_tarefa FROM public.checklist WHERE id = NEW.checklist_id;
  IF v_tarefa IS NOT NULL THEN
    PERFORM public.log_evento_tarefa_id(v_tarefa,
      CASE WHEN NEW.feito THEN 'marcou_item' ELSE 'desmarcou_item' END, NULL,
      jsonb_build_object('item', left(NEW.texto, 120)));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER checklist_item_evento AFTER UPDATE OF feito ON public.checklist_item
  FOR EACH ROW WHEN (NEW.feito IS DISTINCT FROM OLD.feito)
  EXECUTE FUNCTION public.trg_checklist_item_evento();

-- Comentario: edicao e exclusao (o 'comentou' ja existe em 000006).
CREATE FUNCTION public.trg_comentario_evento_mod() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    PERFORM public.log_evento_tarefa_id(NEW.tarefa_id, 'excluiu_comentario', NULL, NULL);
  ELSIF NEW.editado_em IS DISTINCT FROM OLD.editado_em THEN
    PERFORM public.log_evento_tarefa_id(NEW.tarefa_id, 'editou_comentario', NULL, NULL);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER comentario_evento_mod AFTER UPDATE ON public.comentario
  FOR EACH ROW EXECUTE FUNCTION public.trg_comentario_evento_mod();

REVOKE ALL ON FUNCTION public.log_evento_tarefa_id(uuid, text, jsonb, jsonb),
  public.trg_tarefa_evento_modal(), public.trg_tarefa_rel_evento(), public.trg_anexo_evento(),
  public.trg_checklist_evento(), public.trg_checklist_item_evento(), public.trg_comentario_evento_mod(),
  public.trg_anexo_contador(), public.trg_comentario_mencao(), public.checar_mesmo_org_modal()
  FROM PUBLIC, anon, authenticated;
