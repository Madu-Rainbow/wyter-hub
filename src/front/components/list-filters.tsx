import { Button } from "@front/components/ui/button";
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
  const sel =
    "h-9 rounded-md border border-border bg-surface px-2 text-sm text-text focus-visible:outline-2 focus-visible:outline-accent";
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
        <select
          key={c.name}
          name={c.name}
          defaultValue={c.value ?? ""}
          aria-label={c.label}
          className={sel}
        >
          <option value="">{c.label}: todos</option>
          {c.options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      ))}
      <Button type="submit" size="sm" variant="outline">
        Filtrar
      </Button>
      {ativo && (
        <Button variant="ghost" size="sm" className="text-text-muted" asChild>
          <Link href={hidden.visao ? `${basePath}?visao=${hidden.visao}` : basePath}>Limpar</Link>
        </Button>
      )}
    </form>
  );
}

/** Remove caracteres que quebram o filtro .or() do PostgREST. */
export const limparBusca = (q?: string) => (q ?? "").replace(/[,()%*\\]/g, " ").trim();
