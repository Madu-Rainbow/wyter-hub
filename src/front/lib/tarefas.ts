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
