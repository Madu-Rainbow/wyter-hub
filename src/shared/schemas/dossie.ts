import { z } from "zod";
import { DOSSIE_CONFIANCA, DOSSIE_TIPOS } from "../constants/index.js";

export const dossieTipoSchema = z.enum(DOSSIE_TIPOS);
export const dossieConfiancaSchema = z.enum(DOSSIE_CONFIANCA);

export const dossieCreateSchema = z.object({
  clienteId: z.string().uuid(),
  tipo: dossieTipoSchema,
  conteudo: z.string().min(1),
  fonte: z.string().optional(),
  dataReferencia: z.string().optional(),
  confianca: dossieConfiancaSchema.default("a_confirmar"),
  eventoOrigemId: z.string().uuid().optional(),
});

export const dossieResponseSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  clienteId: z.string().uuid(),
  tipo: dossieTipoSchema,
  conteudo: z.string(),
  fonte: z.string().nullable(),
  dataReferencia: z.string().nullable(),
  confianca: dossieConfiancaSchema,
  eventoOrigemId: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
