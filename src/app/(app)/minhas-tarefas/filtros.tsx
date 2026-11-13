"use client";

import { Button } from "@front/components/ui/button";
import { Combobox, type ComboboxOption } from "@front/components/ui/combobox";
import { Input } from "@front/components/ui/input";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  statusOpcoes: ComboboxOption[];
  prioridadeOpcoes: ComboboxOption[];
  clienteOpcoes: ComboboxOption[];
  projetoOpcoes: ComboboxOption[];
};

const CHAVES = ["status", "prioridade", "cliente", "projeto", "de", "ate", "atrasadas"];

/** Filtros da lista: estado na URL (mesmos parâmetros que o painel envia), aplicados no servidor. */
export function Filtros({ statusOpcoes, prioridadeOpcoes, clienteOpcoes, projetoOpcoes }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const ativos = CHAVES.some((c) => sp.get(c));

  function set(chave: string, valor: string | null) {
    const u = new URLSearchParams(sp.toString());
    if (valor) u.set(chave, valor);
    else u.delete(chave);
    const s = u.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-2">
      <Combobox
        aria-label="Status"
        placeholder="Todos os status"
        clearable
        className="w-44"
        options={statusOpcoes}
        value={sp.get("status") ?? ""}
        onValueChange={(v) => set("status", v || null)}
      />
      <Combobox
        aria-label="Prioridade"
        placeholder="Todas as prioridades"
        clearable
        className="w-44"
        options={prioridadeOpcoes}
        value={sp.get("prioridade") ?? ""}
        onValueChange={(v) => set("prioridade", v || null)}
      />
      <Combobox
        aria-label="Cliente"
        placeholder="Todos os clientes"
        searchPlaceholder="Buscar cliente"
        clearable
        className="w-52"
        options={clienteOpcoes}
        value={sp.get("cliente") ?? ""}
        onValueChange={(v) => set("cliente", v || null)}
      />
      <Combobox
        aria-label="Projeto"
        placeholder="Todos os projetos"
        searchPlaceholder="Buscar projeto"
        clearable
        className="w-52"
        options={projetoOpcoes}
        value={sp.get("projeto") ?? ""}
        onValueChange={(v) => set("projeto", v || null)}
      />
      <Input
        type="date"
        aria-label="Prazo a partir de"
        className="w-40"
        value={sp.get("de") ?? ""}
        onChange={(e) => set("de", e.target.value || null)}
      />
      <Input
        type="date"
        aria-label="Prazo até"
        className="w-40"
        value={sp.get("ate") ?? ""}
        onChange={(e) => set("ate", e.target.value || null)}
      />
      <Button
        variant={sp.get("atrasadas") ? "primary" : "secondary"}
        aria-pressed={!!sp.get("atrasadas")}
        onClick={() => set("atrasadas", sp.get("atrasadas") ? null : "1")}
      >
        Atrasadas
      </Button>
      {ativos && (
        <Button variant="ghost" onClick={() => router.replace(pathname, { scroll: false })}>
          Limpar
        </Button>
      )}
    </div>
  );
}
