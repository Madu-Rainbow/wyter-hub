"use client";

import { Button } from "@front/components/ui/button";
import { useActionState } from "react";

type Props = {
  action: (prev: unknown, formData: FormData) => Promise<{ error?: string }>;
  clientes: { id: string; label: string }[];
  contrato?: {
    cliente_id: string;
    tipo: string;
    numero: string | null;
    valor: number | null;
    forma_pagamento: string | null;
    vigencia_inicio: string;
    vigencia_fim: string | null;
  };
  submitLabel: string;
};

const input =
  "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none";
const label = "mb-1 block text-sm font-medium text-text";

export function ContratoForm({ action, clientes, contrato, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, { error: undefined });
  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="rounded-md border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
          {state.error}
        </div>
      )}
      <div>
        <label htmlFor="cliente_id" className={label}>
          Cliente *
        </label>
        <select
          id="cliente_id"
          name="cliente_id"
          required
          defaultValue={contrato?.cliente_id ?? ""}
          className={input}
        >
          <option value="">Selecione...</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="tipo" className={label}>
            Tipo *
          </label>
          <input
            id="tipo"
            name="tipo"
            required
            defaultValue={contrato?.tipo ?? ""}
            placeholder="Ex: Honorários Contábeis"
            className={input}
          />
        </div>
        <div>
          <label htmlFor="numero" className={label}>
            Número
          </label>
          <input
            id="numero"
            name="numero"
            defaultValue={contrato?.numero ?? ""}
            className={input}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="vigencia_inicio" className={label}>
            Início da vigência *
          </label>
          <input
            id="vigencia_inicio"
            name="vigencia_inicio"
            type="date"
            required
            defaultValue={contrato?.vigencia_inicio ?? ""}
            className={input}
          />
        </div>
        <div>
          <label htmlFor="vigencia_fim" className={label}>
            Fim da vigência
          </label>
          <input
            id="vigencia_fim"
            name="vigencia_fim"
            type="date"
            defaultValue={contrato?.vigencia_fim ?? ""}
            className={input}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="valor" className={label}>
            Valor (R$)
          </label>
          <input
            id="valor"
            name="valor"
            type="number"
            step="0.01"
            min="0"
            defaultValue={contrato?.valor ?? ""}
            className={input}
          />
        </div>
        <div>
          <label htmlFor="forma_pagamento" className={label}>
            Forma de pagamento
          </label>
          <input
            id="forma_pagamento"
            name="forma_pagamento"
            defaultValue={contrato?.forma_pagamento ?? ""}
            className={input}
          />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
