# Wyter Hub Constitution

## Core Principles

### I. Visão Única
Qualquer pessoa vê, numa tela, tudo o que é dela, de qualquer cliente. O diretor vê tudo de todos. Nenhuma informação relevante deve exigir trocar de ferramenta ou abrir múltiplas telas para ser encontrada.

### II. Registro é Cidadão de Primeira Classe
Toda ação relevante gera um evento imutável (append-only). Nada some; correções são novos eventos com referência ao original. O log de eventos é a fonte de verdade auditável do sistema.

### III. Pronto para IA desde o Dia 1
Eventos, logs, registros diários e o dossiê do cliente têm estrutura estável e legível por máquina (schemas Zod compartilhados). Toda entidade exposta por MCP e por UI usa os mesmos schemas. O sistema alimenta relatórios e agentes sem transformação manual.

### IV. Sem Ruptura
Até o corte final, Trello, Drive e Gmail continuam funcionando. O Hub convive em 3 fases: Espelho (importa e mostra) → Escrita Dupla (nasce no Hub, replica para ferramentas) → Hub é a Verdade (ferramentas externas em somente leitura/arquivadas). O corte de cada cliente é decisão do diretor.

### V. Aprovação Explícita
O que depende do diretor passa por um fluxo de aprovação com 3 campos obrigatórios: (1) situação atual que justifica, (2) risco se não fizer, (3) exige manutenção futura? O sistema nunca envia e-mail sozinho — só cria rascunhos. Nada é decidido sem o Wender.

### VI. Privacidade (LGPD)
Dados pessoais de clientes de clientes (CPF, endereço, dados de processos) ficam criptografados em coluna, com acesso controlado por papel e trilha de auditoria de quem viu/exportou. Nunca vão para IA sem mascaramento prévio.

### VII. Leve e Rápido
Código mínimo (YAGNI), poucas dependências. Server Components por padrão, JavaScript de cliente só onde há interação. Listas virtualizadas. LCP < 2s, INP < 200ms com 1.000 tarefas. Orçamento de ~200KB de JS por rota.

### VIII. Parecer de Banco, Não de IA
Design sóbrio: fundo off-white #F7F7F5, texto quase-preto #0E1726, acento azul-marinho. Sem gradientes, glassmorphism, emojis na UI, ícones de brilho/estrela. Tipografia serifada nos títulos, sans nos dados com algarismos tabulares. Microtexto direto e profissional.

## Regras de Negócio do Diretor

- Nada é decidido sem o Wender; o que depende dele vira pedido de aprovação.
- Priorização "fruta do pé mais próxima": o mais urgente e mais fácil de colher primeiro.
- Backup antes de qualquer configuração de software/hardware no cliente.
- O que depende do cliente é alinhado primeiro com o Wender.
- Todo pedido de investimento precisa das 3 respostas da aprovação + custo.

## Localização e Padrões

- Fuso: America/Cuiaba. Moeda: BRL. Datas: DD/MM/AAAA na UI, ISO no banco.
- Idioma: PT-BR na interface. Commits em inglês (Conventional Commits), descrição PT-BR.
- Papéis: diretor > consultor > analista > convidado (futuro: cliente).
- Multi-tenant simples por org_id (preparar, não implementar completo na MVP).

## Segurança e Operação

- Segredos só em .env (nunca no git). OAuth com escopos mínimos.
- Gmail: somente leitura + criação de rascunho. Drive: leitura + escrita só nos logs.
- Backups do Postgres diários.
- Classificar e criptografar campos sensíveis (LGPD).
- Mascarar dados antes de enviar qualquer coisa para IA.

## Governance

- Esta constituição é inegociável e sobrepõe qualquer outra decisão de implementação.
- Alterações requerem aprovação do Ariel (consultor) e do Wender (diretor).
- Toda spec e toda PR devem verificar aderência a estes princípios.
- Em caso de dúvida, o princípio mais restritivo prevalece.

**Version**: 1.0.0 | **Ratified**: 2026-10-23 | **Last Amended**: 2026-10-23
