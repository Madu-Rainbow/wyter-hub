import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizacao } from "./organizacao.js";

export const anexo = pgTable("anexo", {
  id: uuid().primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizacao.id),
  entidadeTipo: text("entidade_tipo").notNull(),
  entidadeId: uuid("entidade_id").notNull(),
  nomeArquivo: text("nome_arquivo").notNull(),
  urlOuCaminho: text("url_ou_caminho").notNull(),
  tipoArquivo: text("tipo_arquivo"),
  tamanhoBytes: integer("tamanho_bytes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
