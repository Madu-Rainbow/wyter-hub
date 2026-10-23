import { date, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { cliente } from "./cliente.js";
import { organizacao } from "./organizacao.js";

export const contrato = pgTable("contrato", {
  id: uuid().primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizacao.id),
  clienteId: uuid("cliente_id")
    .notNull()
    .references(() => cliente.id),
  tipo: text().notNull(),
  vigenciaInicio: date("vigencia_inicio").notNull(),
  vigenciaFim: date("vigencia_fim"),
  valor: numeric(),
  formaPagamento: text("forma_pagamento"),
  numero: text(),
  arquivoUrl: text("arquivo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
