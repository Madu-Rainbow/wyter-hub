import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { cliente } from "./cliente.js";
import { organizacao } from "./organizacao.js";
import { pessoa } from "./pessoa.js";
import { origemEnum } from "./tarefa.js";

export const evento = pgTable(
  "evento",
  {
    id: uuid().primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizacao.id),
    quemId: uuid("quem_id")
      .notNull()
      .references(() => pessoa.id),
    quando: timestamp({ withTimezone: true }).notNull().defaultNow(),
    entidade: text().notNull(),
    entidadeId: uuid("entidade_id").notNull(),
    verbo: text().notNull(),
    antes: jsonb(),
    depois: jsonb(),
    origem: origemEnum().notNull().default("ui"),
    clienteId: uuid("cliente_id").references(() => cliente.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("evento_quem_quando_idx").on(table.quemId, table.quando),
    index("evento_cliente_quando_idx").on(table.clienteId, table.quando),
  ],
);
