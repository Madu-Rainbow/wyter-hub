import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { integracao } from "./integracao.js";
import { organizacao } from "./organizacao.js";

export const sincronizacao = pgTable("sincronizacao", {
  id: uuid().primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizacao.id),
  integracaoId: uuid("integracao_id")
    .notNull()
    .references(() => integracao.id),
  entidadeInterna: text("entidade_interna").notNull(),
  idInterno: uuid("id_interno").notNull(),
  idExterno: text("id_externo").notNull(),
  ultimaSync: timestamp("ultima_sync", { withTimezone: true }).notNull().defaultNow(),
  erros: jsonb(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
