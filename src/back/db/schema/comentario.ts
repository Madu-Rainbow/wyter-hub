import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizacao } from "./organizacao.js";
import { pessoa } from "./pessoa.js";
import { tarefa } from "./tarefa.js";

export const comentario = pgTable("comentario", {
  id: uuid().primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizacao.id),
  tarefaId: uuid("tarefa_id")
    .notNull()
    .references(() => tarefa.id),
  autorId: uuid("autor_id")
    .notNull()
    .references(() => pessoa.id),
  texto: text().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
