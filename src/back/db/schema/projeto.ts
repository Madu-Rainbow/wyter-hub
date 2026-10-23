import { date, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { cliente } from "./cliente.js";
import { organizacao } from "./organizacao.js";
import { pessoa } from "./pessoa.js";

export const projetoTipoEnum = pgEnum("projeto_tipo", ["continuo", "pontual"]);

export const projetoStatusEnum = pgEnum("projeto_status", [
  "planejado",
  "em_andamento",
  "pausado",
  "concluido",
  "cancelado",
]);

export const projeto = pgTable("projeto", {
  id: uuid().primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizacao.id),
  clienteId: uuid("cliente_id")
    .notNull()
    .references(() => cliente.id),
  parentId: uuid("parent_id"),
  nome: text().notNull(),
  tipo: projetoTipoEnum().notNull().default("pontual"),
  frente: text(),
  dataInicio: date("data_inicio"),
  dataFim: date("data_fim"),
  status: projetoStatusEnum().notNull().default("planejado"),
  responsavelId: uuid("responsavel_id").references(() => pessoa.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
