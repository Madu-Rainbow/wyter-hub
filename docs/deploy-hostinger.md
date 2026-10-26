# Deploy na Hostinger

O projeto usa Next.js com servidor Node.js. O pacote para publicação é gerado em
`hostinger/`.

## Gerar o pacote

```bash
pnpm install --frozen-lockfile
pnpm deploy:prepare
```

O comando executa o build e copia para `hostinger/` o servidor standalone, os
arquivos de `public/` e os assets estáticos de `.next/`.

## Publicar

Envie o conteúdo de `hostinger/` para a aplicação Node da Hostinger. Configure:

- arquivo de inicialização: `server.js`
- variável `PORT`: fornecida pela Hostinger
- `HOSTNAME`: `0.0.0.0`
- variáveis de ambiente do projeto, incluindo as chaves públicas do Supabase e
  os segredos exclusivamente do servidor

Não envie `.env`, `.env.local` ou chaves `service_role` para o navegador.

O processo de inicialização equivalente é:

```bash
HOSTNAME=0.0.0.0 node server.js
```
