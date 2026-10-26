DO $$
DECLARE
  v_org uuid;
  v_pessoa uuid;
  v_cliente uuid;
  v_projeto uuid;
  v_tarefa uuid;
BEGIN
  SELECT org_id, id INTO v_org, v_pessoa
  FROM public.pessoa
  WHERE lower(email) = 'admin@gmail.com' AND deleted_at IS NULL
  ORDER BY created_at
  LIMIT 1;

  IF v_pessoa IS NULL THEN
    RAISE EXCEPTION 'Usuário de desenvolvimento admin@gmail.com não encontrado';
  END IF;

  SELECT id INTO v_cliente
  FROM public.cliente
  WHERE org_id = v_org AND razao_social = 'Cliente Demonstração Wyter'
  LIMIT 1;

  IF v_cliente IS NULL THEN
    INSERT INTO public.cliente (
      org_id, razao_social, nome_fantasia, segmento, cidade, uf, status, responsavel_id, tags
    ) VALUES (
      v_org, 'Cliente Demonstração Wyter', 'Cliente Demo', 'Operações e Dados',
      'Cuiabá', 'MT', 'ativo', v_pessoa, ARRAY['demo', 'dados', 'mcp']
    ) RETURNING id INTO v_cliente;
  END IF;

  SELECT id INTO v_projeto
  FROM public.projeto
  WHERE cliente_id = v_cliente AND nome = 'Implantação do Hub'
  LIMIT 1;

  IF v_projeto IS NULL THEN
    INSERT INTO public.projeto (
      org_id, cliente_id, nome, tipo, frente, data_inicio, status, responsavel_id
    ) VALUES (
      v_org, v_cliente, 'Implantação do Hub', 'pontual', 'gestao',
      current_date - 14, 'em_andamento', v_pessoa
    ) RETURNING id INTO v_projeto;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tarefa
    WHERE projeto_id = v_projeto AND titulo = 'Revisar indicadores do painel'
  ) THEN
    INSERT INTO public.tarefa (
      org_id, projeto_id, titulo, descricao, responsavel_id, prioridade, status,
      urgencia, esforco, categoria, data_prazo, origem
    ) VALUES (
      v_org, v_projeto, 'Revisar indicadores do painel',
      'Validar os indicadores principais e registrar os próximos ajustes.',
      v_pessoa, 'alta', 'em_andamento', 4, 3, 'gestao',
      current_date + 2, 'ui'
    ) RETURNING id INTO v_tarefa;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tarefa
    WHERE projeto_id = v_projeto AND titulo = 'Preparar atualização para a diretoria'
  ) THEN
    INSERT INTO public.tarefa (
      org_id, projeto_id, titulo, descricao, responsavel_id, prioridade, status,
      urgencia, esforco, categoria, data_prazo, origem
    ) VALUES (
      v_org, v_projeto, 'Preparar atualização para a diretoria',
      'Consolidar avanços, riscos e decisões da semana.',
      v_pessoa, 'media', 'a_fazer', 3, 2, 'relatorio',
      current_date + 4, 'ui'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.registro_diario
    WHERE pessoa_id = v_pessoa AND cliente_id = v_cliente AND data = current_date
  ) THEN
    INSERT INTO public.registro_diario (
      org_id, pessoa_id, cliente_id, data, o_que_fiz, o_que_subi,
      o_que_descobri, pendencias, publicado, precisa_aprovacao
    ) VALUES (
      v_org, v_pessoa, v_cliente, current_date,
      'Organizei o contexto do cliente e revisei os indicadores do Hub.',
      'Atualização do painel e estrutura inicial da gaveta de arquivos.',
      'Os principais gargalos estão concentrados na organização dos documentos.',
      jsonb_build_array('Validar documentos pendentes', 'Revisar permissões do time'),
      true, false
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.evento
    WHERE quem_id = v_pessoa AND entidade = 'atividade_demo' AND cliente_id = v_cliente
  ) THEN
    INSERT INTO public.evento (
      org_id, quem_id, entidade, entidade_id, verbo, depois,
      origem, cliente_id, projeto_id
    ) VALUES (
      v_org, v_pessoa, 'atividade_demo', coalesce(v_tarefa, v_projeto),
      'registrou atividade de demonstração',
      jsonb_build_object('descricao', 'Dados demonstrativos do usuário de desenvolvimento'),
      'ui', v_cliente, v_projeto
    );
  END IF;
END;
$$;