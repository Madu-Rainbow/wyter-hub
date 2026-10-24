"use client";

import { Button } from "@front/components/ui/button";
import { Input } from "@front/components/ui/input";
import { Label } from "@front/components/ui/label";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Resultado = { ok?: string; erro?: string };

const papeis = [
  ["decisor", "Decisor"],
  ["operacional", "Operacional"],
  ["fornecedor", "Fornecedor"],
  ["contador", "Contador"],
  ["advogado", "Advogado"],
];

export function ContatoForm({ action }: { action: (fd: FormData) => Promise<Resultado> }) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!aberto)
    return (
      <Button
        variant="ghost"
        size="sm"
        className="gap-1 text-text-muted"
        onClick={() => setAberto(true)}
      >
        <Plus className="size-3.5" />
        Adicionar
      </Button>
    );

  return (
    <form
      className="mb-3 w-full space-y-2 rounded-md border border-border bg-surface p-3"
      action={(fd) =>
        start(async () => {
          const r = await action(fd);
          if (r.erro) return setErro(r.erro);
          setErro(null);
          setAberto(false);
          router.refresh();
        })
      }
    >
      <div className="space-y-1">
        <Label htmlFor="c-nome">Nome</Label>
        <Input id="c-nome" name="nome" required />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="c-email">E-mail</Label>
          <Input id="c-email" name="email" type="email" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="c-tel">Telefone</Label>
          <Input id="c-tel" name="telefone" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="c-papel">Papel no cliente</Label>
        <select
          id="c-papel"
          name="papel_no_cliente"
          className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
        >
          <option value="">—</option>
          {papeis.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      {erro && (
        <p role="alert" className="text-sm text-danger">
          {erro}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
