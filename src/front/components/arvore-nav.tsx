"use client";

import type { NoCliente } from "@front/lib/arvore";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const LS = "arvore_abertos";

function Contador({ n }: { n: number }) {
  return <span className="ml-auto shrink-0 pl-2 text-xs tabular-nums text-text-muted">{n}</span>;
}

/** Arvore Cliente > Contrato > Projeto; estado de expansao em localStorage. */
export function ArvoreNav({ clientes }: { clientes: NoCliente[] }) {
  const params = useSearchParams();
  const ativo = {
    cliente: params.get("cliente"),
    contrato: params.get("contrato"),
    projeto: params.get("projeto"),
  };
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState("");

  useEffect(() => {
    try {
      setAbertos(new Set(JSON.parse(localStorage.getItem(LS) ?? "[]")));
    } catch {}
  }, []);

  function alterna(id: string) {
    setAbertos((s) => {
      const n = new Set(s);
      if (!n.delete(id)) n.add(id);
      try {
        localStorage.setItem(LS, JSON.stringify([...n]));
      } catch {}
      return n;
    });
  }

  const q = busca.trim().toLowerCase();
  const casa = (t: string) => t.toLowerCase().includes(q);
  const linha = (on: boolean) =>
    `flex min-w-0 flex-1 items-center rounded px-1.5 py-1 text-sm hover:bg-secondary focus-visible:outline-2 focus-visible:outline-accent ${on ? "bg-secondary font-medium text-text" : "text-text"}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative px-2 pb-2">
        <Search className="pointer-events-none absolute left-4 top-2 size-3.5 text-text-muted" />
        <input
          aria-label="Buscar na árvore"
          placeholder="Buscar"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full rounded-md border border-border bg-bg py-1.5 pl-7 pr-2 text-sm text-text focus:border-accent focus:outline-none"
        />
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
        {clientes.map((c) => {
          const cliOk = !q || casa(c.nome);
          const contratos = c.contratos
            .map((k) => ({
              ...k,
              projetos: k.projetos.filter(
                (p) => cliOk || casa(k.nome) || casa(p.nome) || casa(p.chave),
              ),
            }))
            .filter((k) => cliOk || casa(k.nome) || k.projetos.length > 0);
          if (!cliOk && contratos.length === 0) return null;
          const aberto = !!q || abertos.has(c.id);
          return (
            <li key={c.id}>
              <div className="flex items-center">
                <button
                  type="button"
                  aria-label={aberto ? "Recolher" : "Expandir"}
                  aria-expanded={aberto}
                  onClick={() => alterna(c.id)}
                  className="p-1 text-text-muted"
                >
                  {aberto ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronRight className="size-3.5" />
                  )}
                </button>
                <Link
                  href={`/tarefas?cliente=${c.id}`}
                  className={linha(ativo.cliente === c.id && !ativo.contrato && !ativo.projeto)}
                >
                  <span className="truncate">{c.nome}</span>
                  <Contador n={c.abertas} />
                </Link>
              </div>
              {aberto && (
                <ul className="ml-3 border-l border-border pl-1">
                  {contratos.map((k) => {
                    const semContrato = k.id === "_sem";
                    const kAberto = !!q || abertos.has(`${c.id}:${k.id}`);
                    return (
                      <li key={k.id}>
                        <div className="flex items-center">
                          <button
                            type="button"
                            aria-label={kAberto ? "Recolher" : "Expandir"}
                            aria-expanded={kAberto}
                            onClick={() => alterna(`${c.id}:${k.id}`)}
                            className="p-1 text-text-muted"
                          >
                            {kAberto ? (
                              <ChevronDown className="size-3.5" />
                            ) : (
                              <ChevronRight className="size-3.5" />
                            )}
                          </button>
                          {semContrato ? (
                            <span className="flex min-w-0 flex-1 items-center px-1.5 py-1 text-sm italic text-text-muted">
                              <span className="truncate">{k.nome}</span>
                              <Contador n={k.abertas} />
                            </span>
                          ) : (
                            <Link
                              href={`/tarefas?contrato=${k.id}`}
                              className={linha(ativo.contrato === k.id && !ativo.projeto)}
                            >
                              <span className="truncate">{k.nome}</span>
                              <Contador n={k.abertas} />
                            </Link>
                          )}
                        </div>
                        {kAberto && (
                          <ul className="ml-3 border-l border-border pl-1">
                            {k.projetos.map((p) => (
                              <li key={p.id}>
                                <Link
                                  href={`/tarefas?projeto=${p.id}`}
                                  className={linha(ativo.projeto === p.id)}
                                >
                                  <span className="truncate">{p.nome}</span>
                                  <Contador n={p.abertas} />
                                </Link>
                              </li>
                            ))}
                            {k.projetos.length === 0 && (
                              <li className="px-1.5 py-1 text-xs text-text-muted">Sem projetos</li>
                            )}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                  {contratos.length === 0 && (
                    <li className="px-1.5 py-1 text-xs text-text-muted">Sem projetos</li>
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
