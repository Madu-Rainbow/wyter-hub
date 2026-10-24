import { date, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { contrato } from "./contrato.js";
import { organizacao } from "./organizacao.js";

export const aditivo = pgTable("aditivo", {
  id: uuid().primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizacao.id),
  contratoId: uuid("contrato_id")
    .notNull()
    .references(() => contrato.id),
  data: date().notNull(),
  motivo: text().notNull(),
  impactoValor: text("impacto_valor"),
  impactoPrazo: text("impacto_prazo"),
  impactoEscopo: text("impacto_escopo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
