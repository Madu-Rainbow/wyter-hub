import {
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { organizacao } from "./organizacao.js";
import { pessoa } from "./pessoa.js";
import { projeto } from "./projeto.js";

export const prioridadeEnum = pgEnum("prioridade", ["critica", "alta", "media", "baixa"]);

export const tarefaStatusEnum = pgEnum("tarefa_status", [
  "backlog",
  "a_fazer",
  "em_andamento",
  "aguardando",
  "revisao",
  "concluida",
  "cancelada",
]);

export const origemEnum = pgEnum("origem", ["ui", "trello", "email", "drive", "mcp", "ia"]);

export const tarefa = pgTable("tarefa", {
  id: uuid().primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizacao.id),
  projetoId: uuid("projeto_id")
    .notNull()
    .references(() => projeto.id),
  titulo: text().notNull(),
  descricao: text(),
  responsavelId: uuid("responsavel_id").references(() => pessoa.id),
  categoria: text(),
  prioridade: prioridadeEnum().notNull().default("media"),
  urgencia: integer().notNull().default(3),
  esforco: integer().notNull().default(3),
  estimativaHoras: numeric("estimativa_horas"),
  dataInicio: date("data_inicio"),
  dataPrazo: date("data_prazo"),
  status: tarefaStatusEnum().notNull().default("backlog"),
  bloqueadaPorId: uuid("bloqueada_por_id"),
  checklist: jsonb(),
  origem: origemEnum().notNull().default("ui"),
  linkExterno: text("link_externo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
