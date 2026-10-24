export type Usuario = {
  /** null: convite legado (e-mail autorizado sem pessoa vinculada). */
  id: string | null;
  nome: string;
  email: string;
  papel: string;
  cargo: string | null;
  capacidade: number | null;
  estado: "ativo" | "convidado" | "inativo";
  ultimoAcesso: string | null;
  souEu: boolean;
};

export const PAPEIS = [
  ["diretor", "Diretor"],
  ["consultor", "Consultor"],
  ["analista", "Analista"],
  ["convidado", "Convidado"],
] as const;

export const ESTADOS = { ativo: "Ativo", convidado: "Convidado", inativo: "Inativo" } as const;
