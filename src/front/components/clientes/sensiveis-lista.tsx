"use client";

import { Button } from "@front/components/ui/button";
import { Input } from "@front/components/ui/input";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { revelarSensivel } from "../../../app/(app)/clientes/[id]/actions";

const CAMPOS: Record<string, string> = {
  cpf: "CPF",
  endereco: "Endereço",
  dado_processual: "Dado processual",
};

export function SensiveisLista({
  itens,
  gravar,
}: {
  itens: { id: string; campo: string; created_at: string }[];
  gravar: (fd: FormData) => Promise<{ ok?: string; erro?: string }>;
}) {
  const [vistos, setVistos] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const revelar = (id: string) => {
    if (!confirm("Revelar o dado? O acesso será registrado na auditoria.")) return;
    start(async () => {
      const r = await revelarSensivel(id);
      if (r.erro) return setErro(r.erro);
      setErro(null);
      setVistos((v) => ({ ...v, [id]: r.valor ?? "" }));
    });
  };

  return (
    <section className="lg:col-span-2">
      <h2 className="mb-3 font-title text-lg text-text">Dados sensíveis (cifrados)</h2>
      <ul className="divide-y divide-border rounded-md border border-border bg-surface text-sm">
        {itens.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="text-text-muted">{CAMPOS[i.campo] ?? i.campo}</span>
            <span className="min-w-0 flex-1 break-words text-text">
              {vistos[i.id] ?? "••••••••"}
            </span>
            {vistos[i.id] === undefined ? (
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => revelar(i.id)}>
                Revelar
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setVistos((v) => {
                    const { [i.id]: _, ...resto } = v;
                    return resto;
                  })
                }
              >
                Ocultar
              </Button>
            )}
          </li>
        ))}
        {!itens.length && <li className="px-3 py-3 text-text-muted">Nenhum dado sensível.</li>}
      </ul>
      <form
        className="mt-2 flex flex-wrap gap-2"
        action={(fd) =>
          start(async () => {
            const r = await gravar(fd);
            setErro(r.erro ?? null);
            if (!r.erro) router.refresh();
          })
        }
      >
        <select
          name="campo"
          aria-label="Campo"
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
        >
          {Object.entries(CAMPOS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <Input
          name="valor"
          required
          autoComplete="off"
          aria-label="Valor"
          className="min-w-48 flex-1"
        />
        <Button type="submit" size="sm" disabled={pending}>
          Salvar
        </Button>
      </form>
      {erro && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {erro}
        </p>
      )}
    </section>
  );
}
