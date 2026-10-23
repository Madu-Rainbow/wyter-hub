import type { InferSelectModel } from "drizzle-orm";
import type {
  aditivo,
  anexo,
  aprovacao,
  cliente,
  comentario,
  contatoCliente,
  contrato,
  dossieCliente,
  emailAutorizado,
  escopo,
  escopoExtra,
  evento,
  integracao,
  organizacao,
  pessoa,
  projeto,
  registroDiario,
  sincronizacao,
  tarefa,
} from "../../back/db/schema/index.js";

export type Organizacao = InferSelectModel<typeof organizacao>;
export type Pessoa = InferSelectModel<typeof pessoa>;
export type EmailAutorizado = InferSelectModel<typeof emailAutorizado>;
export type Cliente = InferSelectModel<typeof cliente>;
export type ContatoCliente = InferSelectModel<typeof contatoCliente>;
export type Projeto = InferSelectModel<typeof projeto>;
export type Tarefa = InferSelectModel<typeof tarefa>;
export type Aprovacao = InferSelectModel<typeof aprovacao>;
export type Comentario = InferSelectModel<typeof comentario>;
export type Anexo = InferSelectModel<typeof anexo>;
export type Evento = InferSelectModel<typeof evento>;
export type RegistroDiario = InferSelectModel<typeof registroDiario>;
export type DossieCliente = InferSelectModel<typeof dossieCliente>;
export type Contrato = InferSelectModel<typeof contrato>;
export type Aditivo = InferSelectModel<typeof aditivo>;
export type Escopo = InferSelectModel<typeof escopo>;
export type EscopoExtra = InferSelectModel<typeof escopoExtra>;
export type Integracao = InferSelectModel<typeof integracao>;
export type Sincronizacao = InferSelectModel<typeof sincronizacao>;

export type AppRole = "diretor" | "consultor" | "analista" | "convidado";
