import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizacao } from "./organizacao.js";

export const integracao = pgTable("integracao", {
  id: uuid().primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizacao.id),
  servico: text().notNull(),
  config: jsonb(),
  ultimoCursor: text("ultimo_cursor"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
