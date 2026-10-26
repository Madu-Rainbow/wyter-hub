DO $$
DECLARE
  tabela text;
BEGIN
  FOREACH tabela IN ARRAY ARRAY[
    'cliente', 'contrato', 'projeto', 'tarefa', 'registro_diario',
    'evento', 'dossie_cliente', 'gaveta_pasta', 'gaveta_arquivo',
    'gaveta_versao', 'repositorio_item', 'aprovacao'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tabela
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tabela);
    END IF;
  END LOOP;
END;
$$;