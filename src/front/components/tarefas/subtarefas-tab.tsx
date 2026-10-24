"use client";

import { trabalhoHref } from "@front/lib/trabalho";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { atualizarTarefa, criarTarefa } from "./acoes";
import type { Ctx, Tarefa } from "./shared";

export function SubtarefasTab({ mae, filhas, ctx }: { mae: Tarefa; filhas: Tarefa[]; ctx: Ctx }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [titulo, setTitulo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const feitas = filhas.filter((f) => f.status === "concluida").length;

  function alterna(f: Tarefa) {
    start(async () => {
      const e = await atualizarTarefa(
        ctx,
        f,
        { status: f.status === "concluida" ? "a_fazer" : "concluida" },
        f.status === "concluida" ? "reabriu" : "concluiu",
      );
      setErro(e);
      router.refresh();
    });
  }

  function adiciona() {
    const t = titulo.trim();
    if (!t) return;
    start(async () => {
      const e = await criarTarefa(ctx, {
        titulo: t,
        parent_id: mae.id,
        projeto_id: mae.projeto_id,
        responsavel_id: mae.responsavel_id,
      });
      setErro(e);
      if (!e) setTitulo("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {filhas.length > 0 && (
        <div>
          <div className="h-1.5 overflow-hidden rounded bg-secondary">
            <div
              className="h-full bg-accent"
              style={{ width: `${(feitas / filhas.length) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-xs tabular-nums text-text-muted">
            {feitas}/{filhas.length} concluídas
          </p>
        </div>
      )}
      <ul className="space-y-1">
        {filhas.map((f) => (
          <li key={f.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              aria-label={`Concluir ${f.titulo}`}
              checked={f.status === "concluida"}
              disabled={ctx.readOnly}
              onChange={() => alterna(f)}
            />
            <Link
              href={trabalhoHref({ projeto: f.projeto_id, tarefa: f.chave })}
              className="shrink-0 text-xs tabular-nums text-text-muted hover:underline"
            >
              {f.chave}
            </Link>
            <span
              className={f.status === "concluida" ? "text-text-muted line-through" : "text-text"}
            >
              {f.titulo}
            </span>
          </li>
        ))}
        {filhas.length === 0 && <li className="text-sm text-text-muted">Nenhuma subtarefa.</li>}
      </ul>
      {!ctx.readOnly && (
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            adiciona();
          }}
          placeholder="Nova subtarefa e Enter"
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      )}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  );
}
