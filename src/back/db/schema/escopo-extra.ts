import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { cliente } from "./cliente.js";
import { contrato } from "./contrato.js";
import { organizacao } from "./organizacao.js";
import { pessoa } from "./pessoa.js";

export const escopoExtraStatusEnum = pgEnum("escopo_extra_status", [
  "proposto",
  "aprovado",
  "recusado",
  "faturado",
]);

export const escopoExtra = pgTable("escopo_extra", {
  id: uuid().primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizacao.id),
  contratoId: uuid("contrato_id").references(() => contrato.id),
  clienteId: uuid("cliente_id")
    .notNull()
    .references(() => cliente.id),
  descricao: text().notNull(),
  status: escopoExtraStatusEnum().notNull().default("proposto"),
  aprovadoPorId: uuid("aprovado_por_id").references(() => pessoa.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
