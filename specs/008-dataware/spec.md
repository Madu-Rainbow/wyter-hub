# Spec 008 — DataWare (grafo da base de dados)

Aba `/dataware`: visualização em grafo, estilo Obsidian, de toda a base. Também é a camada de conhecimento que os agentes de IA (spec 004) vão consultar.

## Modelo do grafo

- **Nós**: Cliente, Contrato, Projeto, Tarefa, Subtarefa, Pessoa, Evento (log), Dossiê, Aditivo, Escopo, Aprovação.
- **Arestas**: Cliente > Contrato > Projeto > Tarefa > Subtarefa; Pessoa responsável por Cliente/Projeto/Tarefa; Evento ligado à Pessoa (autor) e à entidade afetada; Dossiê, Aditivo, Escopo e Aprovação ligados ao pai.
- **FR-008-01**: Nó = `{ id, tipo, rotulo, org_id, cliente_id, status, atributos }`. Aresta = `{ origem, destino, relacao }`.

## Supabase / GraphQL

- **FR-008-02**: Habilitar a extensão `pg_graphql` (migration) e expor o grafo pelo endpoint GraphQL do Supabase (`/graphql/v1`).
- **FR-008-03**: Views `dw_no` e `dw_aresta` (`security_invoker = true`) unificam as tabelas em nós e arestas; respeitam RLS por org e papel (analista só vê seus clientes). Convidado não acessa.
- **FR-008-04**: Dados sensíveis (CPF, endereço, dados processuais) NÃO entram em `atributos`; campos criptografados ficam fora. Princípio LGPD: mascarar antes de qualquer envio a IA.
- **FR-008-05**: Eventos são carregados sob demanda (por pessoa, cliente ou janela de tempo), nunca todos de uma vez.
- **FR-008-06**: Consulta de vizinhança: dado um nó e profundidade (1 a 3), retornar nós e arestas ao redor (função SQL `dw_vizinhanca`, exposta no GraphQL). Agentes de IA usam a mesma consulta.

## Interface

- **FR-008-07**: Item "DataWare" na barra lateral, rota `/dataware`. Grafo interativo em canvas (zoom, arrastar, fixar nó), nós coloridos por tipo, tamanho por grau de conexão, legenda.
- **FR-008-08**: Clicar em um nó abre painel lateral com seus dados (atributos, status, responsável, datas), lista de conexões clicáveis, e link "Abrir" para a tela do registro. Clicar em um vizinho navega pelo grafo.
- **FR-008-09**: Barra de pesquisa: busca por texto em rótulos e atributos; resultado destaca e centraliza o nó, com lista de resultados.
- **FR-008-10**: Filtros: tipo de nó, cliente, contrato, projeto, pessoa, status, período (para logs). Filtros e busca atenuam o que não casa, sem remover o contexto. Opção "só vizinhança do nó selecionado" com profundidade 1 a 3.
- **FR-008-11**: Carga progressiva: abre mostrando Clientes > Contratos > Projetos; Tarefas e Logs aparecem ao expandir um nó, para suportar milhares de nós sem travar.
- **FR-008-12**: Layout fluido, sem rolar a página, mesmo padrão responsivo da spec 002.
- **FR-008-13**: Somente leitura. Nenhuma edição de dados pelo grafo.

## Critérios de aceite

1. `/dataware` mostra clientes, contratos e projetos ligados, com cores por tipo.
2. Clicar no nó de uma tarefa mostra seus dados e o caminho Cliente > Contrato > Projeto.
3. Buscar o nome de uma pessoa centraliza o nó e destaca suas ligações.
4. Filtrar por um cliente esmaece todo o resto.
5. Consulta GraphQL de `dw_vizinhanca` retorna só dados permitidos pelo papel de quem pergunta.
