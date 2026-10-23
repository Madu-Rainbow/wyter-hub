import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { cliente } from "./cliente.js";
import { organizacao } from "./organizacao.js";

export const papelNoClienteEnum = pgEnum("papel_no_cliente", [
  "decisor",
  "operacional",
  "fornecedor",
  "contador",
  "advogado",
]);

export const contatoCliente = pgTable("contato_cliente", {
  id: uuid().primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizacao.id),
  clienteId: uuid("cliente_id")
    .notNull()
    .references(() => cliente.id),
  nome: text().notNull(),
  papelNoCliente: papelNoClienteEnum("papel_no_cliente"),
  email: text(),
  telefone: text(),
  canalPreferido: text("canal_preferido"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
