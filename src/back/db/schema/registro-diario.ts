import { boolean, date, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { cliente } from "./cliente.js";
import { organizacao } from "./organizacao.js";
import { pessoa } from "./pessoa.js";

export const treinamentoEnum = pgEnum("treinamento_diretoria", [
  "nao_iniciado",
  "em_andamento",
  "concluido",
]);

export const registroDiario = pgTable("registro_diario", {
  id: uuid().primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizacao.id),
  pessoaId: uuid("pessoa_id")
    .notNull()
    .references(() => pessoa.id),
  clienteId: uuid("cliente_id")
    .notNull()
    .references(() => cliente.id),
  data: date().notNull(),
  oQueFiz: text("o_que_fiz").notNull(),
  oQueSubi: text("o_que_subi"),
  oQueDescobri: text("o_que_descobri"),
  pendencias: jsonb(),
  precisaAprovacao: text("precisa_aprovacao"),
  treinamentoDiretoria: treinamentoEnum("treinamento_diretoria"),
  trava: text(),
  pedidoAoCliente: text("pedido_ao_cliente"),
  pilar: text(),
  publicado: boolean().notNull().default(false),
  importado: boolean().notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
