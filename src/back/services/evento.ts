import { db } from "@back/db/drizzle.js";
import { evento } from "@back/db/schema/evento.js";

type RegistrarEventoParams = {
  orgId: string;
  quemId: string;
  entidade: string;
  entidadeId: string;
  verbo: string;
  antes?: unknown;
  depois?: unknown;
  origem: "ui" | "trello" | "email" | "drive" | "mcp" | "ia";
  clienteId?: string;
};

export async function registrarEvento(params: RegistrarEventoParams) {
  const [row] = await db
    .insert(evento)
    .values({
      orgId: params.orgId,
      quemId: params.quemId,
      entidade: params.entidade,
      entidadeId: params.entidadeId,
      verbo: params.verbo,
      antes: params.antes ?? null,
      depois: params.depois ?? null,
      origem: params.origem,
      clienteId: params.clienteId ?? null,
    })
    .returning();

  return row;
}
