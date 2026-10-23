import { z } from "zod";
import { ORIGENS, PRIORIDADES, TAREFA_STATUS } from "../constants/index.js";

export const prioridadeSchema = z.enum(PRIORIDADES);
export const tarefaStatusSchema = z.enum(TAREFA_STATUS);
export const origemSchema = z.enum(ORIGENS);

export const tarefaCreateSchema = z.object({
  projetoId: z.string().uuid(),
  titulo: z.string().min(1),
  descricao: z.string().optional(),
  responsavelId: z.string().uuid().optional(),
  categoria: z.string().optional(),
  prioridade: prioridadeSchema.default("media"),
  urgencia: z.number().int().min(1).max(5).default(3),
  esforco: z.number().int().min(1).max(5).default(3),
  estimativaHoras: z.string().optional(),
  dataInicio: z.string().optional(),
  dataPrazo: z.string().optional(),
  bloqueadaPorId: z.string().uuid().optional(),
  checklist: z.any().optional(),
  origem: origemSchema.default("ui"),
  linkExterno: z.string().url().optional(),
});

export const tarefaResponseSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  projetoId: z.string().uuid(),
  titulo: z.string(),
  descricao: z.string().nullable(),
  responsavelId: z.string().uuid().nullable(),
  categoria: z.string().nullable(),
  prioridade: prioridadeSchema,
  urgencia: z.number(),
  esforco: z.number(),
  estimativaHoras: z.string().nullable(),
  dataInicio: z.string().nullable(),
  dataPrazo: z.string().nullable(),
  status: tarefaStatusSchema,
  bloqueadaPorId: z.string().uuid().nullable(),
  checklist: z.any().nullable(),
  origem: origemSchema,
  linkExterno: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
