# Spec 010 — Gaveta de arquivos por cliente

Estado: **PARCIAL**. A base da gaveta está implementada; os itens abaixo distinguem o que já funciona do que ainda falta. Documento vivo.

## Estado atual — 2026-10-26

### FEITO

- Gaveta contextual por cliente e Drive geral na sidebar.
- Hierarquia automática Cliente → Contrato → Projeto, com preenchimento de pastas existentes.
- Pastas, subpastas, upload por botão, upload múltiplo e bucket privado de 25 MB.
- Metadados de arquivos e primeira versão em `gaveta_versao`.
- Preview de PDF/imagens e download por URL assinada de curta duração.
- Integração de pastas e arquivos no DataWare.
- Realtime da plataforma, incluindo tabelas da gaveta.
- Sem permissões granulares por cliente nesta etapa: o acesso segue o papel da organização, conforme decisão do usuário.

### EM VALIDAÇÃO

- Rollback completo quando uma etapa do upload falha.
- RLS e Storage com sessões reais de diretor, consultor, analista e convidado.
- Upload de todos os tipos permitidos e comportamento de arquivos grandes.

### FALTA

- Arrastar e soltar, renomear, mover, lixeira e restauração.
- Reenvio do mesmo arquivo criando nova versão e restauração de versão anterior.
- Auditoria completa das operações da gaveta.
- Busca por nome/conteúdo e marcação de arquivo sensível.
- Editores de planilhas e documentos.
- Vínculos opcionais de arquivo com contrato/projeto e preview/navegação completa pelo DataWare.
- Varredura por magic bytes e serviço antivírus.

## Visão

Cada cliente tem uma gaveta de arquivos: pastas, arquivos enviados, planilhas editáveis e documentos de texto editáveis. Tudo fica ligado ao cliente, aos contratos e projetos, e aparece como nós no DataWare (spec 008), para consulta e, depois, para agentes de IA (spec 004).

## Requisitos

- **FR-010-01**: Cada cliente tem uma gaveta própria (raiz `/clientes/[id]/gaveta`, aba "Arquivos" no detalhe do cliente e em `/trabalho`, nível Cliente).
- **FR-010-02**: Pastas aninhadas (até 8 níveis), criar, renomear, mover (arrastar e soltar), excluir (soft delete, com lixeira e restauração). Nome único por pasta.
- **FR-010-03**: Enviar arquivos por botão e por arrastar-e-soltar, múltiplos, com barra de progresso. Limite de 25 MB por arquivo. Tipos permitidos por lista: PDF, imagens (png, jpg, webp), Office (docx, xlsx, pptx), CSV, TXT, MD, ZIP. Bloquear executáveis e HTML/SVG servidos inline.
- **FR-010-04**: **Planilhas editáveis**: abrir `.xlsx` e `.csv` num editor de grade no navegador (células, fórmulas simples, ordenar, filtrar, colar do Excel), salvar como nova versão do mesmo arquivo. Exportar `.xlsx` e `.csv`. Criar planilha nova em branco.
- **FR-010-05**: **Documentos editáveis**: criar e editar documentos de texto com formatação básica (títulos, negrito, itálico, listas, tabelas simples, links https), salvos como Markdown ou HTML sanitizado. Exportar PDF (impressão). Criar documento novo em branco.
- **FR-010-06**: **Versões**: toda gravação de planilha ou documento cria versão (quem, quando, tamanho). Restaurar versão anterior gera nova versão (nunca apaga histórico). Arquivos enviados têm nova versão ao reenviar com o mesmo nome.
- **FR-010-07**: **Pré-visualização** no navegador para PDF e imagens; download para os demais. Link de compartilhamento interno (só usuários da org), nunca link público.
- **FR-010-08**: **Acesso por papel** (RLS e Storage): diretor e consultor leem e escrevem; analista lê e escreve só nos clientes em que atua; convidado lê apenas o que for marcado como compartilhado com ele. Todo acesso passa por RLS, nunca só por esconder botão.
- **FR-010-09**: **Bucket privado** no Supabase Storage (`gaveta`), caminho `{org_id}/{cliente_id}/{pasta_id}/{arquivo_id}`. URLs assinadas de curta duração (até 5 minutos), geradas no servidor após checagem de papel.
- **FR-010-10**: **Metadados no banco**: tabelas `gaveta_pasta` (org_id, cliente_id, pai_id, nome, deleted_at), `gaveta_arquivo` (org_id, cliente_id, pasta_id, nome, tipo_mime, tamanho, sha256, storage_path, versao_atual, deleted_at, criado_por), `gaveta_versao` (arquivo_id, numero, storage_path, tamanho, sha256, criado_por, criado_em). Triggers de mesmo `org_id` e de `cliente_id` coerente com a pasta.
- **FR-010-11**: **Auditoria**: enviar, criar, editar, mover, excluir, restaurar e baixar geram evento em `evento` (origem `ui`, `mcp` ou `sistema`), com quem, quando, arquivo, pasta, cliente e versão. Sem conteúdo do arquivo no evento.
- **FR-010-12**: **Sensíveis (LGPD)**: arquivo marcado como sensível (ex.: contrato com CPF, dados processuais) fica fora de buscas e do MCP/IA por padrão; baixar exige papel diretor/consultor e gera evento `acessou_sensivel` (spec 001). Conteúdo nunca vai para IA sem mascaramento (spec 008/004).
- **FR-010-13**: **Busca** por nome e, para `.md`, `.csv` e `.txt`, por conteúdo (texto extraído e indexado no momento da gravação, sem índice para PDF nesta versão).
- **FR-010-14**: **DataWare (spec 008)**: cada cliente liga a sua gaveta; pastas e arquivos entram como nós (`pasta`, `arquivo`) com arestas para o cliente, contrato e projeto que os referenciam. Arquivo ligado a um contrato aparece como aresta do contrato. Clicar no nó abre a pré-visualização e a pasta. Respeita o mesmo RLS do item FR-010-08.
- **FR-010-15**: **Vínculo a contrato e projeto** opcional: arquivo pode ser associado a um contrato ou projeto do mesmo cliente (coluna `contrato_id` / `projeto_id` com checagem de mesmo cliente e org).
- **FR-010-16**: Layout cabe na viewport (FR-002-00): árvore de pastas à esquerda, lista do conteúdo à direita, editor ocupando a área disponível com rolagem interna. Botões padronizados (FR-002-00c), diálogos próprios (FR-002-00d), combobox pesquisável (FR-002-00b).
- **FR-010-17**: Editor de planilha e documento funcionam sem sair da página e sem recarregar; salvamento automático com indicador "salvo às HH:MM" e aviso ao fechar com alterações não salvas (diálogo próprio).
- **FR-010-18**: Limites e segurança de upload: verificação de tipo real (magic bytes) além da extensão, nome sanitizado, nunca usar o nome original como caminho no Storage, antivírus fora de escopo nesta versão (registrar como risco aceito até haver serviço de varredura).

## Fora de escopo nesta versão
- Edição colaborativa em tempo real.
- Indexação de PDF e OCR.
- Upload para Google Drive (fica para importadores, spec 005).

## Critérios de aceite

1. Criar pasta "Contratos" dentro do cliente A, enviar um PDF, e o arquivo aparece no DataWare ligado ao cliente A.
2. Analista atribuído ao cliente B não lista nem baixa arquivos do cliente A (teste de RLS e de URL assinada).
3. Editar uma planilha xlsx, salvar, e ver duas versões; restaurar a primeira gera a terceira com o conteúdo antigo.
4. Excluir pasta move para a lixeira; restaurar devolve tudo; nada some do banco.
5. Arquivo com extensão `.html` ou `.exe` é recusado, mesmo renomeado.
6. Baixar arquivo sensível como analista é recusado; como diretor gera `acessou_sensivel`.

## Riscos e decisões em aberto

- **Editor de planilha**: escolher biblioteca com licença compatível (avaliar SheetJS community para leitura/gravação e uma grade leve própria). Decisão registrada na implementação.
- **Editor de documento**: Markdown com pré-visualização, ou editor rico (Tiptap). Preferência inicial: Markdown para simplicidade e para IA.
- **Antivírus**: não existe na stack; risco aceito e registrado na spec 009.
- **Cota de armazenamento**: definir limite por org (sugestão 5 GB no plano atual) e monitorar.
