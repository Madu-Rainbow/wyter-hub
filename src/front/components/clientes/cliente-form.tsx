"use client";

import { useRef } from "react";

const UFS = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
];

type Pessoa = { id: string; nome: string };
type Cliente = {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  segmento: string | null;
  cidade: string | null;
  uf: string | null;
  responsavel_id: string | null;
  tags: string[] | null;
};

export function ClienteForm({
  action,
  pessoas,
  cliente,
}: {
  action: (formData: FormData) => Promise<void>;
  pessoas: Pessoa[];
  cliente?: Cliente;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputClass =
    "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none";
  const labelClass = "mb-1 block text-sm font-medium text-text";

  return (
    <form ref={formRef} action={action} className="space-y-4">
      {cliente && <input type="hidden" name="id" value={cliente.id} />}

      <div>
        <label htmlFor="razao_social" className={labelClass}>
          Razão social *
        </label>
        <input
          id="razao_social"
          name="razao_social"
          required
          defaultValue={cliente?.razao_social ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="nome_fantasia" className={labelClass}>
          Nome fantasia
        </label>
        <input
          id="nome_fantasia"
          name="nome_fantasia"
          defaultValue={cliente?.nome_fantasia ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="segmento" className={labelClass}>
          Segmento
        </label>
        <input
          id="segmento"
          name="segmento"
          placeholder="Ex: Farmácia, Advocacia, Indústria"
          defaultValue={cliente?.segmento ?? ""}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="cidade" className={labelClass}>
            Cidade
          </label>
          <input
            id="cidade"
            name="cidade"
            defaultValue={cliente?.cidade ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="uf" className={labelClass}>
            UF
          </label>
          <select id="uf" name="uf" defaultValue={cliente?.uf ?? ""} className={inputClass}>
            <option value="">—</option>
            {UFS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="responsavel_id" className={labelClass}>
          Responsável Wyter
        </label>
        <select
          id="responsavel_id"
          name="responsavel_id"
          defaultValue={cliente?.responsavel_id ?? ""}
          className={inputClass}
        >
          <option value="">Nenhum</option>
          {pessoas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="tags" className={labelClass}>
          Tags
        </label>
        <input
          id="tags"
          name="tags"
          placeholder="Separadas por vírgula"
          defaultValue={cliente?.tags?.join(", ") ?? ""}
          className={inputClass}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          {cliente ? "Salvar" : "Criar cliente"}
        </button>
      </div>
    </form>
  );
}
