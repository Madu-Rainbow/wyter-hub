import { char, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizacao } from "./organizacao.js";
import { pessoa } from "./pessoa.js";

export const clienteStatusEnum = pgEnum("cliente_status", ["ativo", "inativo", "arquivado"]);

export const cliente = pgTable("cliente", {
  id: uuid().primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizacao.id),
  razaoSocial: text("razao_social").notNull(),
  nomeFantasia: text("nome_fantasia"),
  segmento: text(),
  cidade: text(),
  uf: char({ length: 2 }),
  status: clienteStatusEnum().notNull().default("ativo"),
  responsavelId: uuid("responsavel_id").references(() => pessoa.id),
  tags: text().array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
