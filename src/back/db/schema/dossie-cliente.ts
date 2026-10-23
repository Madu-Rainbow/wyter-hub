import { date, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { cliente } from "./cliente.js";
import { evento } from "./evento.js";
import { organizacao } from "./organizacao.js";

export const dossieTipoEnum = pgEnum("dossie_tipo", [
  "fato",
  "decisao",
  "restricao",
  "sistema",
  "glossario",
  "pessoa_chave",
]);

export const dossieConfiancaEnum = pgEnum("dossie_confianca", ["fato", "a_confirmar"]);

export const dossieCliente = pgTable("dossie_cliente", {
  id: uuid().primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizacao.id),
  clienteId: uuid("cliente_id")
    .notNull()
    .references(() => cliente.id),
  tipo: dossieTipoEnum().notNull(),
  conteudo: text().notNull(),
  fonte: text(),
  dataReferencia: date("data_referencia"),
  confianca: dossieConfiancaEnum().notNull().default("a_confirmar"),
  eventoOrigemId: uuid("evento_origem_id").references(() => evento.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
