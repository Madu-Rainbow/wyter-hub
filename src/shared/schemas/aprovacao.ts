import { z } from "zod";
import { APROVACAO_STATUS } from "../constants/index.js";

export const aprovacaoStatusSchema = z.enum(APROVACAO_STATUS);

export const aprovacaoCreateSchema = z.object({
  tarefaId: z.string().uuid().optional(),
  escopoExtraId: z.string().uuid().optional(),
  solicitanteId: z.string().uuid(),
  aprovadorId: z.string().uuid(),
  situacaoAtual: z.string().min(1),
  riscoSeNaoFizer: z.string().min(1),
  manutencaoFutura: z.string().min(1),
  custo: z.string().optional(),
});

export const aprovacaoResponseSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  tarefaId: z.string().uuid().nullable(),
  escopoExtraId: z.string().uuid().nullable(),
  solicitanteId: z.string().uuid(),
  aprovadorId: z.string().uuid(),
  situacaoAtual: z.string(),
  riscoSeNaoFizer: z.string(),
  manutencaoFutura: z.string(),
  custo: z.string().nullable(),
  status: aprovacaoStatusSchema,
  decisaoComentario: z.string().nullable(),
  decididaEm: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
