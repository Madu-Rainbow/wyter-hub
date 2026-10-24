import { db } from "../drizzle.js";
import { organizacao } from "../schema/organizacao.js";

export const ORG_ID = "00000000-0000-4000-8000-000000000001";

export async function seedOrganizacao() {
  await db.insert(organizacao).values({
    id: ORG_ID,
    nome: "Wyter Consultoria",
    slug: "wyter",
  });
}
