"use client";

import { Columns3, LayoutGrid, List } from "lucide-react";
import Link from "next/link";

const VISOES = [
  { key: "cards", label: "Cards", icon: LayoutGrid },
  { key: "lista", label: "Lista", icon: List },
  { key: "kanban", label: "Kanban", icon: Columns3 },
];

export function VisaoSwitch({
  atual,
  params,
}: {
  atual: string;
  params: Record<string, string | undefined>;
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
      {VISOES.map(({ key, label, icon: Icon }) => {
        const sp = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
        sp.set("visao", key);
        return (
          <Link
            key={key}
            href={`/projetos?${sp}`}
            aria-current={atual === key ? "true" : undefined}
            onClick={() => {
              try {
                // biome-ignore lint/suspicious/noDocumentCookie: preferência simples, sem Cookie Store API
                document.cookie = `projetos_visao=${key}; path=/; max-age=31536000; samesite=lax`;
              } catch {}
            }}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-accent ${atual === key ? "bg-accent text-primary-foreground" : "text-text-muted hover:text-text"}`}
          >
            <Icon className="size-3.5" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
