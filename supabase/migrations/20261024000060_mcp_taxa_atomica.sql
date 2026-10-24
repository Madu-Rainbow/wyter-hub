-- Limite de taxa do MCP atomico: contador por token com lock de linha (substitui mcp_checar_taxa).
CREATE TABLE public.token_mcp_taxa (
  token_id uuid PRIMARY KEY REFERENCES public.token_mcp(id) ON DELETE CASCADE,
  min_inicio timestamptz NOT NULL DEFAULT now(),
  min_n integer NOT NULL DEFAULT 0,
  dia_inicio timestamptz NOT NULL DEFAULT now(),
  dia_n integer NOT NULL DEFAULT 0
);
ALTER TABLE public.token_mcp_taxa ENABLE ROW LEVEL SECURITY; -- sem policy: so service_role/definer
REVOKE ALL ON public.token_mcp_taxa FROM PUBLIC, anon, authenticated;

-- Reserva p_n vagas (60/min, 2000/dia). Devolve false sem consumir se estourar.
CREATE FUNCTION public.mcp_reservar_taxa(p_token uuid, p_n integer)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE r public.token_mcp_taxa;
BEGIN
  IF p_n IS NULL OR p_n < 1 THEN RETURN true; END IF;
  INSERT INTO public.token_mcp_taxa (token_id) VALUES (p_token) ON CONFLICT DO NOTHING;
  SELECT * INTO r FROM public.token_mcp_taxa WHERE token_id = p_token FOR UPDATE;
  IF r.min_inicio <= now() - interval '1 minute' THEN r.min_inicio := now(); r.min_n := 0; END IF;
  IF r.dia_inicio <= now() - interval '1 day' THEN r.dia_inicio := now(); r.dia_n := 0; END IF;
  IF r.min_n + p_n > 60 OR r.dia_n + p_n > 2000 THEN RETURN false; END IF;
  UPDATE public.token_mcp_taxa SET min_inicio = r.min_inicio, min_n = r.min_n + p_n,
    dia_inicio = r.dia_inicio, dia_n = r.dia_n + p_n WHERE token_id = p_token;
  RETURN true;
END $$;

REVOKE ALL ON FUNCTION public.mcp_reservar_taxa(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_reservar_taxa(uuid, integer) TO service_role;
DROP FUNCTION public.mcp_checar_taxa(uuid);
