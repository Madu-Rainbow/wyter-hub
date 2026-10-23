import type { AppRole } from "@shared/types/index.js";
import { headers } from "next/headers";
import { auth } from "./config.js";

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("Não autenticado");
  }
  return session;
}

export async function requireRole(minRole: AppRole) {
  const session = await requireSession();
  const papel = (session.user as Record<string, unknown>).papel as AppRole | undefined;
  const hierarchy: AppRole[] = ["diretor", "consultor", "analista", "convidado"];
  const userLevel = hierarchy.indexOf(papel ?? "convidado");
  const requiredLevel = hierarchy.indexOf(minRole);

  if (userLevel > requiredLevel) {
    throw new Error(`Acesso negado: requer papel ${minRole} ou superior`);
  }

  return session;
}
