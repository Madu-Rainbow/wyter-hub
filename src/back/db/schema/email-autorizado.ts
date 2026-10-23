import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizacao } from "./organizacao.js";
import { pessoa } from "./pessoa.js";

export const emailAutorizado = pgTable("email_autorizado", {
  id: uuid().primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizacao.id),
  email: text().notNull(),
  adicionadoPorId: uuid("adicionado_por_id").references(() => pessoa.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
