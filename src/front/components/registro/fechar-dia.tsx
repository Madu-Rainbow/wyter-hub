"use client";

import { Button } from "@front/components/ui/button";
import { Check, Copy } from "lucide-react";
import { useState, useTransition } from "react";
import { salvarRegistro } from "./acoes";

export type RegistroCliente = {
  cliente_id: string;
  nome: string;
  texto: string;
  salvo: boolean;
};

/** Rascunho editável por cliente; salvar grava em registro_diario, copiar vai para a área de transferência. Nunca envia. */
export function FecharDia({ data, itens }: { data: string; itens: RegistroCliente[] }) {
  const [textos, setTextos] = useState(() =>
    Object.fromEntries(itens.map((i) => [i.cliente_id, i.texto])),
  );
  const [estado, setEstado] = useState<Record<string, string>>(() =>
    Object.fromEntries(itens.filter((i) => i.salvo).map((i) => [i.cliente_id, "Salvo"])),
  );
  const [pendente, start] = useTransition();

  const msg = (id: string, m: string) => setEstado((e) => ({ ...e, [id]: m }));

  if (itens.length === 0)
    return (
      <p className="p-4 text-sm text-text-muted">Sem atividade nem tarefas abertas neste dia.</p>
    );

  return (
    <div className="space-y-4">
      {itens.map((i) => (
        <section key={i.cliente_id} className="rounded-md border border-border bg-surface p-3">
          <h3 className="mb-2 font-title text-base text-text">{i.nome}</h3>
          <textarea
            aria-label={`Relatório de ${i.nome}`}
            value={textos[i.cliente_id] ?? ""}
            onChange={(e) => {
              setTextos((t) => ({ ...t, [i.cliente_id]: e.target.value }));
              msg(i.cliente_id, "");
            }}
            rows={12}
            className="w-full resize-y rounded-md border border-input bg-bg p-2 font-mono text-xs text-text outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          <div className="mt-2 flex items-center gap-2">
            <Button
              size="sm"
              disabled={pendente}
              onClick={() =>
                start(async () => {
                  const r = await salvarRegistro({
                    cliente_id: i.cliente_id,
                    data,
                    texto: textos[i.cliente_id] ?? "",
                  });
                  msg(i.cliente_id, r.erro ?? "Salvo");
                })
              }
            >
              <Check className="size-4" /> Salvar rascunho
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(textos[i.cliente_id] ?? "");
                  msg(i.cliente_id, "Copiado");
                } catch {
                  msg(i.cliente_id, "Não foi possível copiar");
                }
              }}
            >
              <Copy className="size-4" /> Copiar texto
            </Button>
            <span role="status" className="text-xs text-text-muted">
              {estado[i.cliente_id]}
            </span>
          </div>
        </section>
      ))}
    </div>
  );
}
