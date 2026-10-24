# Feature Specification: Núcleo — Modelo de Dados, Auth e Permissões

**Feature Branch**: `001-nucleo`

**Created**: 2026-10-23

**Status**: Draft

**Input**: Modelo de dados completo do Wyter Hub, autenticação com Google OAuth via Better Auth, sistema de papéis e permissões (diretor/consultor/analista/convidado), log de eventos append-only, dossiê do cliente.

## User Scenarios & Testing

### User Story 1 — Login com Google (Priority: P1)

Um membro da Wyter acessa o sistema pela primeira vez. Clica em "Entrar com Google", autentica com seu e-mail corporativo, e é redirecionado para a tela "Minhas Tarefas". Apenas e-mails autorizados da Wyter conseguem entrar.

**Why this priority**: Sem autenticação, nada mais funciona. É a porta de entrada do sistema.

**Independent Test**: Pode ser testado isoladamente acessando /login, autenticando com Google e verificando que a sessão é criada e o papel atribuído.

**Acceptance Scenarios**:

1. **Given** um e-mail autorizado da Wyter, **When** o usuário faz login com Google, **Then** é autenticado e redirecionado para /minhas-tarefas com seu papel correto.
2. **Given** um e-mail NÃO autorizado, **When** tenta fazer login, **Then** recebe mensagem "Acesso restrito a membros da Wyter" e não é criada sessão.
3. **Given** um usuário já autenticado, **When** acessa qualquer rota, **Then** o middleware verifica a sessão e permite acesso conforme o papel.

---

### User Story 2 — Cadastro de clientes e projetos (Priority: P1)

Um consultor cadastra um novo cliente no sistema com razão social, nome fantasia, segmento, cidade/UF e responsável Wyter. Depois cria um projeto vinculado ao cliente com nome, tipo (contínuo/pontual), frente/categoria e responsável.

**Why this priority**: Clientes e projetos são a base de tudo — tarefas, contratos, registros, dossiê.

**Independent Test**: Criar cliente via formulário, verificar que aparece na árvore lateral, criar projeto vinculado e verificar vínculo.

**Acceptance Scenarios**:

1. **Given** o formulário de novo cliente, **When** preenche os campos obrigatórios e salva, **Then** o cliente aparece na lista e um evento "cliente_criado" é registrado no log.
2. **Given** um cliente existente, **When** cria um projeto vinculado, **Then** o projeto aparece na árvore do cliente e um evento "projeto_criado" é registrado.
3. **Given** um analista, **When** tenta criar um cliente, **Then** o sistema permite (analistas podem criar, mas não excluir).

---

### User Story 3 — Eventos imutáveis (Priority: P1)

Toda ação relevante (criar, editar, mover, comentar, aprovar) gera um evento no log append-only com quem, quando, o quê, antes/depois e origem. Eventos nunca são apagados ou alterados.

**Why this priority**: Princípio constitucional II — registro é cidadão de primeira classe. Base para relatórios, dossiê e auditoria.

**Independent Test**: Realizar ações (criar cliente, editar tarefa) e verificar que cada uma gerou evento com campos corretos. Tentar deletar evento deve falhar.

**Acceptance Scenarios**:

1. **Given** qualquer ação de CRUD no sistema, **When** é executada, **Then** um evento é gravado com quem, quando, entidade, id, verbo, antes/depois (JSON), origem e cliente_id.
2. **Given** um evento existente, **When** alguém tenta deletar ou alterar via API, **Then** a operação é rejeitada.
3. **Given** o painel de eventos, **When** filtra por pessoa+dia ou cliente+dia, **Then** retorna os eventos corretos em ordem cronológica.

---

### User Story 4 — Permissões por papel (Priority: P2)

O diretor vê e faz tudo. O consultor vê todos os clientes e pode criar/editar tarefas, projetos, registros. O analista vê os clientes aos quais está atribuído e pode criar/editar tarefas e registros dos seus projetos. O convidado tem acesso somente leitura a projetos específicos.

**Why this priority**: Segurança e privacidade — sem permissões, dados sensíveis ficam expostos.

**Independent Test**: Logar com cada papel e verificar que vê apenas o que deve ver e só consegue executar ações permitidas.

**Acceptance Scenarios**:

1. **Given** um diretor logado, **When** acessa qualquer tela, **Then** vê todos os dados de todos os clientes.
2. **Given** um analista atribuído ao Cliente A, **When** tenta acessar dados do Cliente B, **Then** recebe 403.
3. **Given** um convidado, **When** tenta criar tarefa, **Then** recebe 403.

---

### User Story 5 — Dossiê do cliente (Priority: P2)

O consultor acessa o dossiê de um cliente e vê fatos, decisões, restrições, sistemas usados, glossário e pessoas-chave. Cada item tem fonte rastreável, data e nível de confiança (fato / a confirmar).

**Why this priority**: Base de conhecimento do cliente — alimenta IA, skills e onboarding de novos membros.

**Independent Test**: Adicionar fatos ao dossiê de um cliente de seed, verificar que aparecem com metadados corretos.

**Acceptance Scenarios**:

1. **Given** o dossiê de um cliente, **When** adiciona um fato com fonte e confiança, **Then** o fato aparece no dossiê e um evento é registrado.
2. **Given** um fato existente, **When** é corrigido, **Then** o original permanece e uma nova entrada "retificação" é criada.
3. **Given** o MCP (futuro), **When** consulta o dossiê, **Then** retorna Markdown estruturado com os fatos.

---

### Edge Cases

- O que acontece quando um membro é removido da Wyter? → Desativa a conta, mas preserva histórico de eventos e registros.
- O que acontece se o Google OAuth estiver fora do ar? → Mensagem clara de erro, sem fallback de senha.
- O que acontece com dados de um cliente excluído? → Clientes não são excluídos, apenas arquivados (soft delete).
- O que acontece se dois usuários editam o mesmo registro simultaneamente? → Last-write-wins com evento de conflito registrado.

## Requirements

### Functional Requirements

- **FR-001**: Sistema DEVE autenticar usuários via Google OAuth restrito a e-mails autorizados.
- **FR-002**: Sistema DEVE atribuir papel (diretor/consultor/analista/convidado) a cada usuário no cadastro.
- **FR-003**: Sistema DEVE aplicar controle de acesso em todas as rotas de API e páginas baseado no papel do usuário.
- **FR-004**: Sistema DEVE criar evento imutável para toda ação de CRUD com campos: quem, quando, entidade, id, verbo, antes/depois, origem, cliente_id.
- **FR-005**: Sistema DEVE impedir exclusão ou alteração de eventos.
- **FR-006**: Sistema DEVE permitir CRUD de clientes com campos: razão social, nome fantasia, segmento, cidade/UF, status, responsável Wyter, tags.
- **FR-007**: Sistema DEVE permitir CRUD de projetos vinculados a clientes com campos: nome, tipo, frente/categoria, datas, status, responsável.
- **FR-008**: Sistema DEVE manter dossiê do cliente com fatos rastreáveis (fonte, data, confiança).
- **FR-009**: Sistema DEVE suportar contatos do cliente com papel (decisor/operacional/fornecedor/contador/advogado) e canal preferido.
- **FR-010**: Sistema DEVE usar soft delete para todas as entidades principais (nunca apagar dados).
- **FR-011**: Sistema DEVE preparar multi-tenant por org_id sem implementar a troca de organização na MVP.
- **FR-012**: Sistema DEVE criptografar campos sensíveis de clientes de clientes (CPF, endereço, dados processuais) no banco.
- **FR-013**: Sistema DEVE registrar trilha de auditoria para acesso a dados sensíveis.

### Key Entities

- **Organização**: tenant (Wyter na MVP); todas as entidades têm org_id.
- **Pessoa**: membro da Wyter — nome, email, papel, cargo, capacidade semanal (horas).
- **Cliente**: empresa atendida — razão social, fantasia, segmento, cidade/UF, status, responsável, tags.
- **Contato do cliente**: pessoa no lado do cliente — nome, papel, canal preferido.
- **Projeto**: unidade de trabalho dentro de um cliente — nome, tipo (contínuo/pontual), frente, datas, status, responsável. Hierárquico: um projeto pode ter sub-projetos (parent_id).
- **Tarefa**: item de trabalho dentro de um projeto — título, responsável(eis), prioridade, urgência×esforço, estimativa, prazo, status, checklist, origem.
- **Aprovação**: pedido com 3 campos obrigatórios (situação, risco, manutenção) + custo, status, decisão.
- **Comentário**: vinculado a tarefa — texto, autor, data.
- **Anexo**: arquivo local ou link do Drive, vinculado a tarefa/projeto/cliente.
- **Evento**: log append-only — quem, quando, entidade, id, verbo, antes/depois (JSON), origem, cliente_id.
- **Registro diário**: entrada estruturada por pessoa, cliente e data — modelo oficial da Seção 1.
- **Dossiê do cliente**: base de conhecimento — fatos, decisões, restrições, sistemas, glossário, pessoas-chave.
- **Contrato**: tipo, vigência, valor, pagamento, número, arquivo.
- **Aditivo**: extensão do contrato — data, motivo, impacto.
- **Escopo**: itens contratados.
- **Escopo extra**: item fora do contrato — status (proposto/aprovado/recusado/faturado), aprovador.
- **Integração/Sincronização**: mapa de IDs externos↔internos, cursor, erros.

## Revisão: Administração de Usuários (substitui "E-mails autorizados")

- **FR-014**: A tela `/admin/emails` DEVE ser substituída por `/admin/usuarios` ("Usuários"), visível só ao diretor. Uma única lista unifica pessoas e convites: cada linha é um usuário com nome, e-mail, papel, cargo, capacidade semanal, estado (Ativo / Convidado, ainda não entrou / Inativo) e último acesso.
- **FR-015**: **Convidar** usuário informando e-mail e papel (e cargo/capacidade opcionais): cria o registro autorizado e a `pessoa` pré-vinculada pelo e-mail; no primeiro login com Google o vínculo `auth_user_id` é feito automaticamente (trigger existente). Convite pendente pode ser reenviado (copiar link de acesso) ou revogado.
- **FR-016**: Diretor pode, na própria linha: alterar papel, cargo e capacidade; desativar/reativar (preserva histórico, bloqueia o login imediatamente); remover convite pendente. Nunca excluir usuário com histórico. O sistema impede desativar ou rebaixar o último diretor ativo e que o diretor remova o próprio acesso.
- **FR-017**: Busca por nome/e-mail, filtros por papel e estado, e contadores no topo (ativos, convidados, inativos). Alteração de papel, ativação e convite geram evento de auditoria.
- **FR-018**: O texto da interface usa "Usuários" e "Convidar usuário" (nunca "e-mails autorizados"); `email_autorizado` permanece como tabela de apoio do convite, sem tela própria.
- **FR-019**: Todas as regras respeitam RLS por org e papel, e e-mail único entre organizações (índice `lower(email)`).

## Success Criteria

### Measurable Outcomes

- **SC-001**: Login com Google completa em menos de 3 segundos após redirecionamento.
- **SC-002**: Toda ação de CRUD gera evento no log em menos de 50ms adicionais de latência.
- **SC-003**: Consulta de eventos por pessoa+dia retorna em menos de 200ms com 10.000 eventos no banco.
- **SC-004**: Acesso negado (403) retorna em menos de 50ms para rotas não autorizadas.
- **SC-005**: Schema de todas as entidades validado por Zod e compartilhado entre API, UI e MCP.
- **SC-006**: Seed com 3 clientes, 5 pessoas, 8 projetos, ~150 tarefas roda em menos de 10 segundos.
- **SC-007**: Nenhum campo sensível visível em texto claro no banco de dados.

## Assumptions

- Google OAuth é o único método de autenticação (sem senha, sem magic link).
- A lista de e-mails autorizados é gerenciada por um diretor na tela de configuração (tabela no banco).
- Na MVP, existe apenas uma organização (Wyter). O org_id está presente em todas as tabelas mas não há tela de troca.
- Desenvolvimento local com Postgres nativo; produção em Supabase. Código compatível com ambos.
- Criptografia de campos sensíveis por coluna na aplicação (chave em .env), portável para Supabase.
- Sem custo/hora por pessoa na MVP (removido do modelo).
- Projetos são hierárquicos (parent_id) em vez de relação N:N. Um cliente tem N projetos, um projeto pode ter sub-projetos.
- Contratos e escopos extras são criados nesta spec mas a UI completa vem na spec 007.
- O modelo de dados da tarefa é criado aqui mas as visões (kanban, gantt, etc.) vêm na spec 002.
- O registro diário é modelado aqui mas o fluxo "Fechar o dia" vem na spec 003.
