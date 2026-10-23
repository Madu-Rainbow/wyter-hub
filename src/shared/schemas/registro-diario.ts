import { z } from "zod";
import { TREINAMENTO_DIRETORIA } from "../constants/index.js";

export const treinamentoDiretoriaSchema = z.enum(TREINAMENTO_DIRETORIA);

export const registroDiarioCreateSchema = z.object({
  pessoaId: z.string().uuid(),
  clienteId: z.string().uuid(),
  data: z.string(),
  oQueFiz: z.string().min(1),
  oQueSubi: z.string().optional(),
  oQueDescobri: z.string().optional(),
  pendencias: z.any().optional(),
  precisaAprovacao: z.boolean().default(false),
  treinamentoDiretoria: treinamentoDiretoriaSchema.optional(),
  trava: z.string().optional(),
  pedidoAoCliente: z.string().optional(),
  pilar: z.string().optional(),
});

export const registroDiarioResponseSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  pessoaId: z.string().uuid(),
  clienteId: z.string().uuid(),
  data: z.string(),
  oQueFiz: z.string(),
  oQueSubi: z.string().nullable(),
  oQueDescobri: z.string().nullable(),
  pendencias: z.any().nullable(),
  precisaAprovacao: z.boolean(),
  treinamentoDiretoria: treinamentoDiretoriaSchema.nullable(),
  trava: z.string().nullable(),
  pedidoAoCliente: z.string().nullable(),
  pilar: z.string().nullable(),
  publicado: z.boolean(),
  importado: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
