import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const organizacao = pgTable("organizacao", {
  id: uuid().primaryKey().defaultRandom(),
  nome: text().notNull(),
  slug: text().notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
