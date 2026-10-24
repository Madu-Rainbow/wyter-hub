export type ProjetoItem = {
  id: string;
  nome: string;
  status: string;
  tipo: string;
  frente: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  cliente: string;
  responsavel: string | null;
  feitas: number;
  total: number;
};

export const STATUS_PROJETO: [string, string][] = [
  ["planejado", "Planejado"],
  ["em_andamento", "Em andamento"],
  ["pausado", "Pausado"],
  ["concluido", "Concluído"],
  ["cancelado", "Cancelado"],
];
