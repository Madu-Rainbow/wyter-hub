import { z } from "zod";
import { PROJETO_STATUS, PROJETO_TIPOS } from "../constants/index.js";

export const projetoTipoSchema = z.enum(PROJETO_TIPOS);
export const projetoStatusSchema = z.enum(PROJETO_STATUS);

export const projetoCreateSchema = z.object({
  clienteId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  nome: z.string().min(1),
  tipo: projetoTipoSchema.default("pontual"),
  frente: z.string().optional(),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  responsavelId: z.string().uuid().optional(),
});

export const projetoResponseSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  clienteId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  nome: z.string(),
  tipo: projetoTipoSchema,
  frente: z.string().nullable(),
  dataInicio: z.string().nullable(),
  dataFim: z.string().nullable(),
  status: projetoStatusSchema,
  responsavelId: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
