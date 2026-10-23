import { numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizacao } from "./organizacao.js";
import { pessoa } from "./pessoa.js";
import { tarefa } from "./tarefa.js";

export const aprovacaoStatusEnum = pgEnum("aprovacao_status", ["pendente", "aprovada", "recusada"]);

export const aprovacao = pgTable("aprovacao", {
  id: uuid().primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizacao.id),
  tarefaId: uuid("tarefa_id").references(() => tarefa.id),
  escopoExtraId: uuid("escopo_extra_id"),
  solicitanteId: uuid("solicitante_id")
    .notNull()
    .references(() => pessoa.id),
  aprovadorId: uuid("aprovador_id")
    .notNull()
    .references(() => pessoa.id),
  situacaoAtual: text("situacao_atual").notNull(),
  riscoSeNaoFizer: text("risco_se_nao_fizer").notNull(),
  manutencaoFutura: text("manutencao_futura").notNull(),
  custo: numeric(),
  status: aprovacaoStatusEnum().notNull().default("pendente"),
  decisaoComentario: text("decisao_comentario"),
  decididaEm: timestamp("decidida_em", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
