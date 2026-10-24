import { Button } from "@front/components/ui/button";
import { Combobox } from "@front/components/ui/combobox";
import { Search } from "lucide-react";
import Link from "next/link";

type Campo = { name: string; label: string; value?: string; options: [string, string][] };

/** Formulário GET (funciona sem JS): filtros viram searchParams. `hidden` preserva ex. ?visao=. */
export function ListFilters({
  basePath,
  q,
  campos,
  hidden = {},
}: {
  basePath: string;
  q?: string;
  campos: Campo[];
  hidden?: Record<string, string | undefined>;
}) {
  const ativo = !!q || campos.some((c) => c.value);
  const hp = new URLSearchParams();
  for (const [k, v] of Object.entries(hidden)) if (v) hp.set(k, v);
  const limpar = hp.size ? `${basePath}?${hp}` : basePath;
  return (
    <form method="get" action={basePath} className="mb-4 flex flex-wrap items-end gap-2">
      {Object.entries(hidden).map(
        ([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />,
      )}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-text-muted" />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar..."
          aria-label="Buscar"
          className="h-9 w-56 rounded-md border border-border bg-surface pl-8 pr-2 text-sm text-text placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-accent"
        />
      </div>
      {campos.map((c) => (
        <Combobox
          key={c.name}
          name={c.name}
          defaultValue={c.value ?? ""}
          aria-label={c.label}
          placeholder={`${c.label}: todos`}
          clearable
          className="w-48"
          options={c.options.map(([value, label]) => ({ value, label }))}
        />
      ))}
      <Button type="submit" variant="secondary">
        Filtrar
      </Button>
      {ativo && (
        <Button variant="ghost" size="sm" className="text-text-muted" asChild>
          <Link href={limpar}>Limpar</Link>
        </Button>
      )}
    </form>
  );
}

/** Remove caracteres que quebram o filtro .or() do PostgREST. */
export const limparBusca = (q?: string) => (q ?? "").replace(/[,()%*\\]/g, " ").trim();
