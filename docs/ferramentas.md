# Ferramentas instaladas — Wyter Hub

Atualizado em: 23/10/2026

## Pré-requisitos

| Ferramenta | Versão | Instalação |
|---|---|---|
| Git | 2.43.0 | já instalado |
| Node.js | 22.23.4 | `nvm install 22` |
| pnpm | 10.4.1 | corepack |
| Python | 3.12.3 | já instalado |
| uv | 0.13.5 | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Docker | pendente | `sudo apt install docker.io docker-compose-v2` |
| gh (GitHub CLI) | pendente | `sudo apt install gh` |

## Economia de tokens

| Ferramenta | Versão | Função |
|---|---|---|
| Spec Kit | 1.2.4.dev0 | Desenvolvimento guiado por especificação |
| Caveman | plugin | Respostas telegráficas (-65% tokens de saída) |
| Ponytail | plugin (modo lite) | YAGNI — só código mínimo necessário |
| RTK | 1.0.1 | Filtra/deduplica saída de Bash |

## Plugins do Claude Code

| Plugin | Fonte | Função |
|---|---|---|
| caveman | JuliusBrussee/caveman | Respostas concisas |
| ponytail | DietrichGebert/ponytail | Minimalismo de código |
| frontend-design | oficial | Guia UI/UX |
| typescript-lsp | oficial | LSP TypeScript |
| security-guidance | oficial | Revisão de segurança automática |
| commit-commands | oficial | Workflow git simplificado |
| context7 | oficial (MCP) | Docs atualizadas de bibliotecas |
| playwright | oficial (MCP) | Testes E2E e automação de browser |

## MCP Servers (futuro — spec 004)

| Servidor | Função | Quando |
|---|---|---|
| wyter-hub (próprio) | API MCP do sistema | spec 004 |
