export const TZ = "America/Cuiaba";
export const ABERTAS = ["backlog", "a_fazer", "em_andamento", "aguardando", "revisao"] as (
  | "backlog"
  | "a_fazer"
  | "em_andamento"
  | "aguardando"
  | "revisao"
)[];

export const statusLabels: Record<string, string> = {
  backlog: "Backlog",
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  aguardando: "Aguardando",
  revisao: "Revisão",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

/** Data de hoje (YYYY-MM-DD) no fuso de Cuiabá. */
export function hojeISO(offsetDias = 0) {
  const d = new Date(Date.now() + offsetDias * 86400000);
  return d.toLocaleDateString("sv-SE", { timeZone: TZ });
}

export function formatDataISO(d: string) {
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
}

/** Texto sem acento e minusculo (busca). */
export const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** So http/https; qualquer outra coisa (javascript:, data:...) vira null. Use antes de qualquer href. */
export function urlSegura(u: string | null | undefined): string | null {
  if (!u) return null;
  try {
    const x = new URL(u.trim());
    return x.protocol === "https:" || x.protocol === "http:" ? x.href : null;
  } catch {
    return null;
  }
}

export const fmtBytes = (n: number | null) =>
  n == null
    ? ""
    : n < 1048576
      ? `${Math.max(1, Math.round(n / 1024))} KB`
      : `${(n / 1048576).toFixed(1)} MB`;
