"use client";

import { Button } from "@front/components/ui/button";
import { useState } from "react";
import { Markdown } from "./markdown";
import { inputCls, Secao } from "./modal-ui";

export function DescricaoSec({
  valor,
  readOnly,
  onSave,
}: {
  valor: string | null;
  readOnly: boolean;
  onSave: (v: string | null) => void;
}) {
  const [edit, setEdit] = useState(false);
  const [txt, setTxt] = useState(valor ?? "");
  const [prev, setPrev] = useState(false);

  return (
    <Secao
      titulo="Descrição"
      extra={
        !readOnly &&
        !edit &&
        valor && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setTxt(valor);
              setEdit(true);
            }}
          >
            Editar
          </Button>
        )
      }
    >
      {edit ? (
        <div className="space-y-2">
          <div className="flex gap-1" role="tablist">
            {[
              [false, "Editar"],
              [true, "Pré-visualizar"],
            ].map(([v, l]) => (
              <button
                key={String(l)}
                type="button"
                role="tab"
                aria-selected={prev === v}
                onClick={() => setPrev(v as boolean)}
                className={`rounded px-2 py-1 text-xs ${prev === v ? "bg-secondary font-medium" : "text-text-muted"}`}
              >
                {l as string}
              </button>
            ))}
          </div>
          {prev ? (
            <div className="min-h-24 rounded-md border border-border bg-bg p-2">
              {txt.trim() ? (
                <Markdown texto={txt} />
              ) : (
                <p className="text-sm text-text-muted">Nada a mostrar.</p>
              )}
            </div>
          ) : (
            <textarea
              aria-label="Descrição em Markdown"
              rows={6}
              value={txt}
              onChange={(e) => setTxt(e.target.value)}
              placeholder="Markdown: **negrito**, *itálico*, listas, `código`, [link](https://...)"
              className={inputCls}
            />
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                onSave(txt.trim() || null);
                setEdit(false);
                setPrev(false);
              }}
            >
              Salvar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEdit(false);
                setPrev(false);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : valor ? (
        <Markdown texto={valor} />
      ) : readOnly ? (
        <p className="text-sm text-text-muted">Sem descrição.</p>
      ) : (
        <button
          type="button"
          onClick={() => {
            setTxt("");
            setEdit(true);
          }}
          className="w-full rounded-md bg-secondary/60 px-3 py-4 text-left text-sm text-text-muted hover:bg-secondary"
        >
          Adicionar uma descrição mais detalhada...
        </button>
      )}
    </Secao>
  );
}
