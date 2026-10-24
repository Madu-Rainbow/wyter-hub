-- Log automatico de tarefa/comentario (FR-003-01..05) + geocodificacao de clientes (FR-006-10..12)

ALTER TYPE public.origem ADD VALUE IF NOT EXISTS 'sistema';
ALTER TYPE public.origem ADD VALUE IF NOT EXISTS 'importador';

ALTER TABLE public.evento ADD COLUMN IF NOT EXISTS contrato_id uuid REFERENCES public.contrato(id);
CREATE INDEX IF NOT EXISTS evento_contrato_quando_idx ON public.evento(contrato_id, quando);

-- Grava 1 evento. Autor = pessoa logada; sem autor => origem 'sistema' (quem = responsavel ou diretor mais antigo).
CREATE FUNCTION public.log_evento_tarefa(
  t public.tarefa, p_verbo text, p_antes jsonb, p_depois jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_quem uuid;
  v_origem public.origem;
  v_cliente uuid;
  v_contrato uuid;
BEGIN
  SELECT id INTO v_quem FROM public.pessoa
   WHERE auth_user_id = auth.uid() AND org_id = t.org_id AND deleted_at IS NULL LIMIT 1;
  IF v_quem IS NOT NULL THEN
    v_origem := CASE WHEN t.origem IN ('mcp', 'ia') AND p_verbo = 'criou' THEN 'mcp'
                     WHEN t.origem IN ('trello', 'email', 'drive') AND p_verbo = 'criou' THEN 'importador'
                     ELSE 'ui' END;
  ELSE
    v_origem := 'sistema';
    SELECT id INTO v_quem FROM public.pessoa WHERE id = t.responsavel_id;
    IF v_quem IS NULL THEN
      SELECT id INTO v_quem FROM public.pessoa
       WHERE org_id = t.org_id AND papel = 'diretor' AND deleted_at IS NULL ORDER BY created_at LIMIT 1;
    END IF;
  END IF;
  IF v_quem IS NULL THEN RETURN; END IF;

  SELECT pr.cliente_id, pr.contrato_id INTO v_cliente, v_contrato FROM public.projeto pr WHERE pr.id = t.projeto_id;

  INSERT INTO public.evento (org_id, quem_id, entidade, entidade_id, verbo, antes, depois, origem, cliente_id, projeto_id, contrato_id)
  VALUES (t.org_id, v_quem, 'tarefa', t.id, p_verbo, p_antes, p_depois, v_origem, v_cliente, t.projeto_id, v_contrato);
END;
$$;

CREATE FUNCTION public.trg_tarefa_evento() RETURNS trigger
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
      jsonb_strip_nulls(jsonb_build_object(
        'data_prazo', CASE WHEN NEW.data_prazo IS DISTINCT FROM OLD.data_prazo THEN OLD.data_prazo END,
        'data_inicio', CASE WHEN NEW.data_inicio IS DISTINCT FROM OLD.data_inicio THEN OLD.data_inicio END)),
      jsonb_strip_nulls(jsonb_build_object(
        'data_prazo', CASE WHEN NEW.data_prazo IS DISTINCT FROM OLD.data_prazo THEN NEW.data_prazo END,
        'data_inicio', CASE WHEN NEW.data_inicio IS DISTINCT FROM OLD.data_inicio THEN NEW.data_inicio END)));
  END IF;
  IF NEW.prioridade IS DISTINCT FROM OLD.prioridade THEN
    PERFORM public.log_evento_tarefa(NEW, 'repriorizou',
      jsonb_build_object('prioridade', OLD.prioridade), jsonb_build_object('prioridade', NEW.prioridade));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tarefa_evento AFTER INSERT OR UPDATE ON public.tarefa
  FOR EACH ROW EXECUTE FUNCTION public.trg_tarefa_evento();

CREATE FUNCTION public.trg_comentario_evento() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  tr public.tarefa;
  v_origem public.origem;
BEGIN
  SELECT * INTO tr FROM public.tarefa WHERE id = NEW.tarefa_id;
  v_origem := CASE WHEN EXISTS (SELECT 1 FROM public.pessoa WHERE auth_user_id = auth.uid()) THEN 'ui' ELSE 'sistema' END;
  INSERT INTO public.evento (org_id, quem_id, entidade, entidade_id, verbo, depois, origem, cliente_id, projeto_id, contrato_id)
  SELECT NEW.org_id, NEW.autor_id, 'tarefa', NEW.tarefa_id, 'comentou',
         jsonb_build_object('texto', left(NEW.texto, 200)), v_origem, pr.cliente_id, tr.projeto_id, pr.contrato_id
    FROM public.projeto pr WHERE pr.id = tr.projeto_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER comentario_evento AFTER INSERT ON public.comentario
  FOR EACH ROW EXECUTE FUNCTION public.trg_comentario_evento();

REVOKE ALL ON FUNCTION public.log_evento_tarefa(public.tarefa, text, jsonb, jsonb),
  public.trg_tarefa_evento(), public.trg_comentario_evento() FROM PUBLIC, anon, authenticated;

-- Geo ---------------------------------------------------------------------
ALTER TABLE public.cliente ADD COLUMN IF NOT EXISTS latitude numeric, ADD COLUMN IF NOT EXISTS longitude numeric;

CREATE TABLE public.municipio_geo (
  uf char(2) NOT NULL,
  nome text NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  PRIMARY KEY (uf, nome)
);
ALTER TABLE public.municipio_geo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "municipio_geo_select" ON public.municipio_geo FOR SELECT TO authenticated USING (true);
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.municipio_geo FROM anon, authenticated;

-- nome ja normalizado (minusculo, sem acento)
CREATE FUNCTION public.geo_norm(s text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$ SELECT lower(btrim(translate(s, 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç', 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'))) $$;

INSERT INTO public.municipio_geo (uf, nome, lat, lng) SELECT uf, public.geo_norm(nome), lat, lng FROM (VALUES
  ('AC','Rio Branco',-9.9747,-67.8100),('AL','Maceió',-9.6658,-35.7353),('AP','Macapá',0.0349,-51.0694),
  ('AM','Manaus',-3.1190,-60.0217),('BA','Salvador',-12.9714,-38.5014),('CE','Fortaleza',-3.7319,-38.5267),
  ('DF','Brasília',-15.7939,-47.8828),('ES','Vitória',-20.3155,-40.3128),('GO','Goiânia',-16.6869,-49.2648),
  ('MA','São Luís',-2.5307,-44.3068),('MT','Cuiabá',-15.6014,-56.0979),('MS','Campo Grande',-20.4697,-54.6201),
  ('MG','Belo Horizonte',-19.9167,-43.9345),('PA','Belém',-1.4558,-48.4902),('PB','João Pessoa',-7.1195,-34.8450),
  ('PR','Curitiba',-25.4284,-49.2733),('PE','Recife',-8.0476,-34.8770),('PI','Teresina',-5.0892,-42.8019),
  ('RJ','Rio de Janeiro',-22.9068,-43.1729),('RN','Natal',-5.7945,-35.2110),('RS','Porto Alegre',-30.0346,-51.2177),
  ('RO','Porto Velho',-8.7612,-63.9039),('RR','Boa Vista',2.8235,-60.6758),('SC','Florianópolis',-27.5954,-48.5480),
  ('SP','São Paulo',-23.5505,-46.6333),('SE','Aracaju',-10.9472,-37.0731),('TO','Palmas',-10.1689,-48.3317),
  ('MT','Várzea Grande',-15.6467,-56.1326),('MT','Rondonópolis',-16.4673,-54.6372),('MT','Sinop',-11.8642,-55.5025),
  ('MT','Sorriso',-12.5425,-55.7211),('MT','Lucas do Rio Verde',-13.0500,-55.9042),('MT','Tangará da Serra',-14.6229,-57.4933),
  ('MT','Cáceres',-16.0764,-57.6818),('SP','Campinas',-22.9099,-47.0626),('SP','Santos',-23.9608,-46.3336),
  ('SP','Ribeirão Preto',-21.1775,-47.8103),('MG','Uberlândia',-18.9186,-48.2772),('PR','Londrina',-23.3045,-51.1696),
  ('SC','Joinville',-26.3045,-48.8487)
) AS v(uf, nome, lat, lng);

CREATE FUNCTION public.trg_cliente_geo() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF (NEW.latitude IS NULL OR NEW.longitude IS NULL) AND NEW.cidade IS NOT NULL AND NEW.uf IS NOT NULL THEN
    SELECT g.lat, g.lng INTO NEW.latitude, NEW.longitude FROM public.municipio_geo g
     WHERE g.uf = upper(NEW.uf) AND g.nome = public.geo_norm(NEW.cidade);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.trg_cliente_geo() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER cliente_geo BEFORE INSERT OR UPDATE ON public.cliente
  FOR EACH ROW EXECUTE FUNCTION public.trg_cliente_geo();

-- backfill (dispara a trigger)
UPDATE public.cliente SET cidade = cidade WHERE latitude IS NULL;
