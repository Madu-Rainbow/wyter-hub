import { z } from "zod";
import { ORIGENS } from "../constants/index.js";

export const origemEventoSchema = z.enum(ORIGENS);

export const eventoCreateSchema = z.object({
  quemId: z.string().uuid(),
  entidade: z.string().min(1),
  entidadeId: z.string().uuid(),
  verbo: z.string().min(1),
  antes: z.any().optional(),
  depois: z.any().optional(),
  origem: origemEventoSchema.default("ui"),
  clienteId: z.string().uuid().optional(),
});

export const eventoResponseSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  quemId: z.string().uuid(),
  quando: z.coerce.date(),
  entidade: z.string(),
  entidadeId: z.string().uuid(),
  verbo: z.string(),
  antes: z.any().nullable(),
  depois: z.any().nullable(),
  origem: origemEventoSchema,
  clienteId: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
});
