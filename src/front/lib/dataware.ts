export type TipoNo =
  | "cliente"
  | "contrato"
  | "projeto"
  | "tarefa"
  | "subtarefa"
  | "pessoa"
  | "evento"
  | "dossie"
  | "aditivo"
  | "escopo"
  | "aprovacao";

export type DwNo = {
  id: string;
  tipo: TipoNo;
  rotulo: string;
  org_id: string;
  cliente_id: string | null;
  status: string | null;
  atributos: Record<string, unknown>;
};
export type DwAresta = { origem: string; destino: string; relacao: string };
export type DwGrafo = { nos: DwNo[]; arestas: DwAresta[] };

export const TIPOS: { tipo: TipoNo; label: string; cor: string }[] = [
  { tipo: "cliente", label: "Cliente", cor: "#1d3557" },
  { tipo: "contrato", label: "Contrato", cor: "#2a78d6" },
  { tipo: "projeto", label: "Projeto", cor: "#2a9d8f" },
  { tipo: "tarefa", label: "Tarefa", cor: "#e9a23b" },
  { tipo: "subtarefa", label: "Subtarefa", cor: "#c98a1f" },
  { tipo: "pessoa", label: "Pessoa", cor: "#8e5ea2" },
  { tipo: "evento", label: "Log", cor: "#8a94a6" },
  { tipo: "dossie", label: "Dossiê", cor: "#b5533c" },
  { tipo: "aditivo", label: "Aditivo", cor: "#5f7a9c" },
  { tipo: "escopo", label: "Escopo", cor: "#7a9c5f" },
  { tipo: "aprovacao", label: "Aprovação", cor: "#c4527a" },
];
export const COR: Record<string, string> = Object.fromEntries(TIPOS.map((t) => [t.tipo, t.cor]));
export const TIPO_LABEL: Record<string, string> = Object.fromEntries(
  TIPOS.map((t) => [t.tipo, t.label]),
);

/** Unico ponto que mapeia nó -> rota da tela do registro (rotas podem migrar para /trabalho). */
export function rotaDoNo(n: Pick<DwNo, "id" | "tipo" | "atributos">): string | null {
  switch (n.tipo) {
    case "cliente":
      return `/clientes/${n.id}`;
    case "contrato":
      return `/contratos/${n.id}`;
    case "projeto":
      return `/projetos/${n.id}`;
    case "tarefa":
    case "subtarefa":
      return typeof n.atributos.chave === "string" ? `/tarefas/${n.atributos.chave}` : null;
    case "pessoa":
      return `/equipe/${n.id}`;
    default:
      return null;
  }
}

/** Colunas dw_no podem vir como Json do supabase-js. */
export function paraNo(r: {
  id: string | null;
  tipo: string | null;
  rotulo: string | null;
  org_id: string | null;
  cliente_id: string | null;
  status: string | null;
  atributos: unknown;
}): DwNo {
  return {
    id: r.id ?? "",
    tipo: (r.tipo ?? "cliente") as TipoNo,
    rotulo: r.rotulo ?? "",
    org_id: r.org_id ?? "",
    cliente_id: r.cliente_id,
    status: r.status,
    atributos: (r.atributos ?? {}) as Record<string, unknown>,
  };
}
