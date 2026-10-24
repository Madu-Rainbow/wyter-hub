import { sql } from "drizzle-orm";
import { db, queryClient } from "../drizzle.js";
import { seedAprovacoes } from "./aprovacoes.js";
import { seedClientes } from "./clientes.js";
import { seedContratos } from "./contratos.js";
import { seedDossie } from "./dossie.js";
import { ORG_ID, seedOrganizacao } from "./organizacao.js";
import { seedPessoas } from "./pessoas.js";
import { seedProjetos } from "./projetos.js";
import { seedRegistros } from "./registros.js";
import { seedTarefas } from "./tarefas.js";

async function main() {
  console.log("Limpando dados existentes...");
  await db.execute(sql`
    TRUNCATE
      dossie_cliente, registro_diario, escopo_extra, escopo, aditivo, contrato,
      aprovacao, comentario, anexo, evento, tarefa, projeto, contato_cliente,
      cliente, email_autorizado, pessoa, organizacao,
      "user", session, account, verification
    CASCADE
  `);

  console.log("Seed: organizacao");
  await seedOrganizacao();

  console.log("Seed: pessoas");
  const pessoas = await seedPessoas(ORG_ID);

  console.log("Seed: clientes");
  const clientes = await seedClientes(ORG_ID, pessoas);

  console.log("Seed: projetos");
  const projetos = await seedProjetos(ORG_ID, clientes, pessoas);

  console.log("Seed: tarefas");
  await seedTarefas(ORG_ID, projetos, pessoas);

  console.log("Seed: contratos");
  await seedContratos(ORG_ID, clientes);

  console.log("Seed: aprovacoes");
  await seedAprovacoes(ORG_ID, pessoas);

  console.log("Seed: registros diarios");
  await seedRegistros(ORG_ID, pessoas, clientes);

  console.log("Seed: dossie");
  await seedDossie(ORG_ID, clientes);

  console.log("Seed concluido com sucesso!");
  await queryClient.end();
}

main().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});
