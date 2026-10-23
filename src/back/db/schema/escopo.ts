import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { contrato } from "./contrato.js";
import { organizacao } from "./organizacao.js";

export const escopo = pgTable("escopo", {
  id: uuid().primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizacao.id),
  contratoId: uuid("contrato_id")
    .notNull()
    .references(() => contrato.id),
  descricao: text().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
