import { format, parse, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const TZ = "America/Cuiaba";

function toTz(date: Date): Date {
  const str = date.toLocaleString("en-US", { timeZone: TZ });
  return new Date(str);
}

export function formataBR(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(toTz(d), "dd/MM/yyyy", { locale: ptBR });
}

export function formataHoraBR(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(toTz(d), "dd/MM/yyyy HH:mm", { locale: ptBR });
}

export function parseBR(dateStr: string): Date {
  return parse(dateStr, "dd/MM/yyyy", new Date(), { locale: ptBR });
}
