DO $$
DECLARE
  v_org uuid;
  v_cliente uuid;
  p record;
  v_projeto uuid;
  v_tarefa uuid;
BEGIN
  SELECT id INTO v_org FROM public.organizacao ORDER BY created_at LIMIT 1;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Nenhuma organização encontrada';
  END IF;

  SELECT id INTO v_cliente
  FROM public.cliente
  WHERE org_id = v_org AND razao_social = 'Workspace de Demonstração Wyter'
  LIMIT 1;

  IF v_cliente IS NULL THEN
    INSERT INTO public.cliente (
      org_id, razao_social, nome_fantasia, segmento, cidade, uf, status, tags
    ) VALUES (
      v_org, 'Workspace de Demonstração Wyter', 'Workspace Demo',
      'Demonstração', 'Cuiabá', 'MT', 'ativo', ARRAY['demo', 'teste']
    ) RETURNING id INTO v_cliente;
  END IF;

  FOR p IN
    SELECT id, org_id, nome
    FROM public.pessoa
    WHERE org_id = v_org AND ativo AND deleted_at IS NULL AND auth_user_id IS NOT NULL
  LOOP
    SELECT id INTO v_projeto
    FROM public.projeto
    WHERE org_id = v_org
      AND cliente_id = v_cliente
      AND responsavel_id = p.id
      AND nome = 'Primeiros passos no Wyter Hub'
    LIMIT 1;

    IF v_projeto IS NULL THEN
      INSERT INTO public.projeto (
        org_id, cliente_id, nome, tipo, frente, data_inicio, status, responsavel_id
      ) VALUES (
        v_org, v_cliente, 'Primeiros passos no Wyter Hub',
        'pontual', 'gestao', current_date - 2, 'em_andamento', p.id
      ) RETURNING id INTO v_projeto;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.tarefa
      WHERE projeto_id = v_projeto AND responsavel_id = p.id
        AND titulo = 'Conhecer o painel do Wyter Hub'
    ) THEN
      INSERT INTO public.tarefa (
        org_id, projeto_id, titulo, descricao, responsavel_id, prioridade, status,
        urgencia, esforco, categoria, data_prazo, origem
      ) VALUES (
        v_org, v_projeto, 'Conhecer o painel do Wyter Hub',
        'Explorar Meu dia, Trabalho, Arquivos e DataWare.',
        p.id, 'alta', 'em_andamento', 3, 2, 'onboarding',
        current_date + 1, 'ui'
      ) RETURNING id INTO v_tarefa;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.tarefa
      WHERE projeto_id = v_projeto AND responsavel_id = p.id
        AND titulo = 'Registrar a primeira atualização do dia'
    ) THEN
      INSERT INTO public.tarefa (
        org_id, projeto_id, titulo, descricao, responsavel_id, prioridade, status,
        urgencia, esforco, categoria, data_prazo, origem
      ) VALUES (
        v_org, v_projeto, 'Registrar a primeira atualização do dia',
        'Use esta tarefa para testar o fluxo de registro e relatório diário.',
        p.id, 'media', 'a_fazer', 2, 1, 'registro',
        current_date, 'ui'
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.registro_diario
      WHERE pessoa_id = p.id AND cliente_id = v_cliente AND data = current_date
    ) THEN
      INSERT INTO public.registro_diario (
        org_id, pessoa_id, cliente_id, data, o_que_fiz, o_que_subi,
        o_que_descobri, pendencias, publicado, precisa_aprovacao
      ) VALUES (
        v_org, p.id, v_cliente, current_date,
        'Explorei o Wyter Hub e organizei minhas próximas atividades.',
        'Primeiro registro demonstrativo do dia.',
        'O Meu dia reúne tarefas, atividades e relatório em um único contexto.',
        jsonb_build_array('Revisar a gaveta de arquivos'),
        true, false
      );
    END IF;
  END LOOP;
END;
$$;