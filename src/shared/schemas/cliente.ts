import { z } from "zod";
import { CLIENTE_STATUS } from "../constants/index.js";

export const clienteStatusSchema = z.enum(CLIENTE_STATUS);

export const clienteCreateSchema = z.object({
  razaoSocial: z.string().min(1),
  nomeFantasia: z.string().optional(),
  segmento: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().length(2).optional(),
  responsavelId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
});

export const clienteResponseSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  razaoSocial: z.string(),
  nomeFantasia: z.string().nullable(),
  segmento: z.string().nullable(),
  cidade: z.string().nullable(),
  uf: z.string().nullable(),
  status: clienteStatusSchema,
  responsavelId: z.string().uuid().nullable(),
  tags: z.array(z.string()).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
