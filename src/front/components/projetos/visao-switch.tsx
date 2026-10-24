"use client";

import { type TrabalhoParams, trabalhoHref } from "@front/lib/trabalho";
import { Columns3, LayoutGrid, List } from "lucide-react";
import Link from "next/link";

const VISOES = [
  { key: "cards", label: "Cards", icon: LayoutGrid },
  { key: "lista", label: "Lista", icon: List },
  { key: "kanban", label: "Kanban", icon: Columns3 },
];

/** Alterna `?visao=` dentro de /trabalho preservando escopo, aba e filtros. */
export function VisaoSwitch({
  atual,
  params,
  chaves = ["cards", "lista", "kanban"],
}: {
  atual: string;
  params: TrabalhoParams;
  chaves?: string[];
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
      {VISOES.filter((v) => chaves.includes(v.key)).map(({ key, label, icon: Icon }) => (
        <Link
          key={key}
          href={trabalhoHref({ ...params, visao: key })}
          aria-current={atual === key ? "true" : undefined}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-accent ${atual === key ? "bg-accent text-primary-foreground" : "text-text-muted hover:text-text"}`}
        >
          <Icon className="size-3.5" />
          {label}
        </Link>
      ))}
    </div>
  );
}
