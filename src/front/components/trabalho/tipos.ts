import type { TrabalhoParams } from "@front/lib/trabalho";

export type Scope = { cliente?: string; contrato?: string; projeto?: string };
export type Cont = Map<string, { feitas: number; total: number }>;
/** Parâmetros de URL já normalizados da página. */
export type Params = TrabalhoParams;

export const somar = (cont: Cont, ids: string[]) =>
  ids.reduce(
    (a, id) => {
      const c = cont.get(id);
      return { feitas: a.feitas + (c?.feitas ?? 0), total: a.total + (c?.total ?? 0) };
    },
    { feitas: 0, total: 0 },
  );

export const fmtISO = (d: string) => {
  const [y, m, dd] = d.slice(0, 10).split("-");
  return `${dd}/${m}/${y}`;
};

export const STATUS_COR: Record<string, string> = {
  em_andamento: "bg-blue-50 text-blue-700",
  planejado: "bg-gray-50 text-gray-600",
  pausado: "bg-amber-50 text-amber-700",
  concluido: "bg-green-50 text-green-700",
  cancelado: "bg-red-50 text-red-600",
};
