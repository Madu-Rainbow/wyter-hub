-- Spec 002 (FR-002-16..22): subtarefas (profundidade 1), chave do projeto e numero sequencial da tarefa.

ALTER TABLE public.tarefa ADD COLUMN parent_id uuid REFERENCES public.tarefa(id);
CREATE INDEX idx_tarefa_parent_id ON public.tarefa(parent_id) WHERE parent_id IS NOT NULL;

ALTER TABLE public.projeto ADD COLUMN chave text;
ALTER TABLE public.tarefa ADD COLUMN numero integer;

-- Prefixo curto (2-6 A-Z/0-9) derivado do nome, unico por org entre os ja existentes.
CREATE FUNCTION public.gerar_chave_projeto(p_nome text, p_org uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  base text;
  cand text;
  i int := 1;
BEGIN
  base := upper(regexp_replace(translate(p_nome,
    'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç',
    'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc'), '[^A-Za-z0-9]', '', 'g'));
  base := left(base, 4);
  IF length(base) < 2 THEN base := rpad(base, 2, 'X'); END IF;
  cand := base;
  WHILE EXISTS (SELECT 1 FROM public.projeto WHERE org_id = p_org AND chave = cand) LOOP
    i := i + 1;
    cand := left(base, 4) || i::text;
  END LOOP;
  RETURN cand;
END $$;

UPDATE public.projeto p SET chave = public.gerar_chave_projeto(p.nome, p.org_id)
WHERE p.chave IS NULL;

ALTER TABLE public.projeto ALTER COLUMN chave SET NOT NULL;
ALTER TABLE public.projeto ADD CONSTRAINT projeto_chave_formato CHECK (chave ~ '^[A-Z0-9]{2,6}$');
CREATE UNIQUE INDEX projeto_org_chave_uniq ON public.projeto(org_id, chave);

CREATE FUNCTION public.projeto_chave_default()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.chave IS NULL OR NEW.chave = '' THEN
    NEW.chave := public.gerar_chave_projeto(NEW.nome, NEW.org_id);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER projeto_chave_default BEFORE INSERT ON public.projeto
  FOR EACH ROW EXECUTE FUNCTION public.projeto_chave_default();
-- chave NOT NULL com insert sem chave: o trigger BEFORE preenche antes da checagem.

-- Backfill numero por projeto, ordem de criacao.
UPDATE public.tarefa t SET numero = s.rn
FROM (SELECT id, row_number() OVER (PARTITION BY projeto_id ORDER BY created_at, id) AS rn
      FROM public.tarefa) s
WHERE s.id = t.id;
ALTER TABLE public.tarefa ALTER COLUMN numero SET NOT NULL;
CREATE UNIQUE INDEX tarefa_projeto_numero_uniq ON public.tarefa(projeto_id, numero);

-- SECURITY DEFINER: o max() precisa enxergar todas as tarefas do projeto, nao so as visiveis via RLS.
CREATE FUNCTION public.tarefa_numero_seq()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.projeto_id IS NOT DISTINCT FROM OLD.projeto_id THEN
    NEW.numero := OLD.numero;
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(NEW.projeto_id::text));
  SELECT coalesce(max(numero), 0) + 1 INTO NEW.numero
  FROM public.tarefa WHERE projeto_id = NEW.projeto_id;
  RETURN NEW;
END $$;
CREATE TRIGGER tarefa_numero_seq BEFORE INSERT OR UPDATE OF projeto_id, numero ON public.tarefa
  FOR EACH ROW EXECUTE FUNCTION public.tarefa_numero_seq();

-- Profundidade maxima 1: mae nao pode ser filha; filha tem mesmo projeto da mae; quem tem filhas nao vira filha.
CREATE FUNCTION public.tarefa_check_parent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  pai record;
BEGIN
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'Tarefa não pode ser subtarefa de si mesma';
  END IF;
  SELECT parent_id, projeto_id INTO pai FROM public.tarefa WHERE id = NEW.parent_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tarefa mãe não encontrada'; END IF;
  IF pai.parent_id IS NOT NULL THEN
    RAISE EXCEPTION 'Subtarefa não pode ter subtarefas (profundidade máxima 1)';
  END IF;
  IF pai.projeto_id <> NEW.projeto_id THEN
    RAISE EXCEPTION 'Subtarefa deve pertencer ao mesmo projeto da tarefa mãe';
  END IF;
  IF EXISTS (SELECT 1 FROM public.tarefa WHERE parent_id = NEW.id) THEN
    RAISE EXCEPTION 'Tarefa com subtarefas não pode virar subtarefa';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tarefa_check_parent BEFORE INSERT OR UPDATE OF parent_id, projeto_id ON public.tarefa
  FOR EACH ROW EXECUTE FUNCTION public.tarefa_check_parent();

-- Mover a mae de projeto leva as subtarefas junto (ficam com novo numero via tarefa_numero_seq).
CREATE FUNCTION public.tarefa_move_filhas()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.tarefa SET projeto_id = NEW.projeto_id WHERE parent_id = NEW.id;
  RETURN NULL;
END $$;
CREATE TRIGGER tarefa_move_filhas AFTER UPDATE OF projeto_id ON public.tarefa
  FOR EACH ROW WHEN (OLD.projeto_id IS DISTINCT FROM NEW.projeto_id)
  EXECUTE FUNCTION public.tarefa_move_filhas();

-- Mae que e movida com filhas: o check_parent das filhas roda apos a mae ja estar no novo projeto (ok).
-- Quem muda de projeto e filha sem a mae e rejeitado por check_parent (projeto diferente da mae).
