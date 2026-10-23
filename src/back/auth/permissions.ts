import type { AppRole } from "@shared/types/index.js";

type Action = "criar" | "ler" | "editar" | "excluir" | "aprovar" | "admin";

type Resource =
  | "cliente"
  | "projeto"
  | "tarefa"
  | "aprovacao"
  | "contrato"
  | "registro"
  | "dossie"
  | "pessoa"
  | "email_autorizado"
  | "painel";

const permissions: Record<AppRole, Partial<Record<Resource, Action[]>>> = {
  diretor: {
    cliente: ["criar", "ler", "editar", "excluir", "admin"],
    projeto: ["criar", "ler", "editar", "excluir"],
    tarefa: ["criar", "ler", "editar", "excluir"],
    aprovacao: ["criar", "ler", "editar", "aprovar"],
    contrato: ["criar", "ler", "editar", "excluir"],
    registro: ["criar", "ler", "editar"],
    dossie: ["criar", "ler", "editar"],
    pessoa: ["criar", "ler", "editar", "excluir", "admin"],
    email_autorizado: ["criar", "ler", "excluir", "admin"],
    painel: ["ler"],
  },
  consultor: {
    cliente: ["criar", "ler", "editar"],
    projeto: ["criar", "ler", "editar"],
    tarefa: ["criar", "ler", "editar"],
    aprovacao: ["criar", "ler"],
    contrato: ["ler"],
    registro: ["criar", "ler", "editar"],
    dossie: ["criar", "ler", "editar"],
    pessoa: ["ler"],
    painel: ["ler"],
  },
  analista: {
    cliente: ["ler"],
    projeto: ["ler"],
    tarefa: ["criar", "ler", "editar"],
    aprovacao: ["criar", "ler"],
    registro: ["criar", "ler", "editar"],
    dossie: ["criar", "ler"],
    pessoa: ["ler"],
  },
  convidado: {
    cliente: ["ler"],
    projeto: ["ler"],
    tarefa: ["ler"],
    registro: ["ler"],
    dossie: ["ler"],
  },
};

export function temPermissao(papel: AppRole, recurso: Resource, acao: Action): boolean {
  const allowed = permissions[papel]?.[recurso];
  return allowed?.includes(acao) ?? false;
}

export function verificarPermissao(papel: AppRole, recurso: Resource, acao: Action): void {
  if (!temPermissao(papel, recurso, acao)) {
    throw new Error(`Acesso negado: ${papel} não pode ${acao} ${recurso}`);
  }
}
