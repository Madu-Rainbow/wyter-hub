"use client";

import { Button } from "@front/components/ui/button";
import { Combobox } from "@front/components/ui/combobox";
import { useActionState, useState } from "react";

type Option = { id: string; label: string };

type Props = {
  action: (prev: unknown, formData: FormData) => Promise<{ error?: string }>;
  clientes: Option[];
  pessoas: Option[];
  projetos: Option[];
  contratos: (Option & { cliente_id: string })[];
  defaults?: {
    nome?: string;
    cliente_id?: string;
    tipo?: string;
    frente?: string;
    data_inicio?: string;
    data_fim?: string;
    status?: string;
    responsavel_id?: string;
    parent_id?: string;
    contrato_id?: string;
    chave?: string;
  };
  submitLabel: string;
};

const TIPOS = [
  { value: "pontual", label: "Pontual" },
  { value: "continuo", label: "Contínuo" },
];

const STATUS = [
  { value: "planejado", label: "Planejado" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "pausado", label: "Pausado" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
];

export function ProjetoForm({
  action,
  clientes,
  pessoas,
  projetos,
  contratos,
  defaults = {},
  submitLabel,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, { error: undefined });
  const [clienteId, setClienteId] = useState(defaults.cliente_id ?? "");

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-md border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="nome" className="mb-1 block text-sm font-medium text-text">
          Nome <span className="text-danger">*</span>
        </label>
        <input
          id="nome"
          name="nome"
          required
          defaultValue={defaults.nome}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="chave" className="mb-1 block text-sm font-medium text-text">
          Chave
        </label>
        <input
          id="chave"
          name="chave"
          defaultValue={defaults.chave}
          maxLength={6}
          pattern="[A-Za-z0-9]{2,6}"
          placeholder="Automática (ex.: FARM)"
          title="2 a 6 letras ou números"
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm uppercase text-text placeholder:normal-case placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
        <p className="mt-1 text-xs text-text-muted">
          Prefixo das tarefas (FARM-12). Única na organização.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cliente_id" className="mb-1 block text-sm font-medium text-text">
            Cliente <span className="text-danger">*</span>
          </label>
          <Combobox
            id="cliente_id"
            name="cliente_id"
            required
            aria-label="Cliente"
            placeholder="Selecione..."
            value={clienteId}
            onValueChange={setClienteId}
            options={clientes.map((c) => ({ value: c.id, label: c.label }))}
          />
        </div>

        <div>
          <label htmlFor="tipo" className="mb-1 block text-sm font-medium text-text">
            Tipo
          </label>
          <Combobox
            id="tipo"
            name="tipo"
            aria-label="Tipo"
            defaultValue={defaults.tipo ?? "pontual"}
            options={TIPOS}
          />
        </div>
      </div>

      <div>
        <label htmlFor="frente" className="mb-1 block text-sm font-medium text-text">
          Frente / Categoria
        </label>
        <input
          id="frente"
          name="frente"
          defaultValue={defaults.frente}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="data_inicio" className="mb-1 block text-sm font-medium text-text">
            Data início
          </label>
          <input
            id="data_inicio"
            name="data_inicio"
            type="date"
            defaultValue={defaults.data_inicio}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="data_fim" className="mb-1 block text-sm font-medium text-text">
            Data fim
          </label>
          <input
            id="data_fim"
            name="data_fim"
            type="date"
            defaultValue={defaults.data_fim}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="status" className="mb-1 block text-sm font-medium text-text">
            Status
          </label>
          <Combobox
            id="status"
            name="status"
            aria-label="Status"
            defaultValue={defaults.status ?? "planejado"}
            options={STATUS}
          />
        </div>

        <div>
          <label htmlFor="responsavel_id" className="mb-1 block text-sm font-medium text-text">
            Responsável
          </label>
          <Combobox
            id="responsavel_id"
            name="responsavel_id"
            aria-label="Responsável"
            placeholder="Nenhum"
            clearable
            defaultValue={defaults.responsavel_id}
            options={pessoas.map((p) => ({ value: p.id, label: p.label }))}
          />
        </div>
      </div>

      <div>
        <label htmlFor="parent_id" className="mb-1 block text-sm font-medium text-text">
          Projeto pai (opcional)
        </label>
        <Combobox
          id="parent_id"
          name="parent_id"
          aria-label="Projeto pai"
          placeholder="Nenhum"
          clearable
          defaultValue={defaults.parent_id}
          options={projetos.map((p) => ({ value: p.id, label: p.label }))}
        />
      </div>

      <div>
        <label htmlFor="contrato_id" className="mb-1 block text-sm font-medium text-text">
          Contrato <span className="text-danger">*</span>
        </label>
        <Combobox
          key={clienteId}
          id="contrato_id"
          name="contrato_id"
          required
          aria-label="Contrato"
          placeholder="Selecione..."
          defaultValue={defaults.contrato_id}
          options={contratos
            .filter((c) => c.cliente_id === clienteId)
            .map((c) => ({ value: c.id, label: c.label }))}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={isPending}>
          {isPending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
