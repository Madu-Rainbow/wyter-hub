import { boolean, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizacao } from "./organizacao.js";

export const papelEnum = pgEnum("papel", ["diretor", "consultor", "analista", "convidado"]);

export const pessoa = pgTable("pessoa", {
  id: uuid().primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizacao.id),
  nome: text().notNull(),
  email: text().notNull(),
  papel: papelEnum().notNull().default("analista"),
  cargo: text(),
  capacidadeSemanalHoras: integer("capacidade_semanal_horas"),
  ativo: boolean().notNull().default(true),
  betterAuthUserId: text("better_auth_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
