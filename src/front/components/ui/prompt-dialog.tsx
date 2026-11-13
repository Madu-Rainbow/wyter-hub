"use client";

import { Button } from "@front/components/ui/button";
import { Input } from "@front/components/ui/input";
import { Dialog } from "radix-ui";
import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from "react";

export type PromptOpcoes = {
  titulo: string;
  descricao?: ReactNode;
  valorInicial?: string;
  confirmarLabel?: string;
  cancelarLabel?: string;
};

type Fn = (o: PromptOpcoes) => Promise<string | null>;
const Ctx = createContext<Fn | null>(null);

/** Valor aparado, ou null se vazio. */
export function validarTexto(v: string): string | null {
  const t = v.trim();
  return t ? t : null;
}

/** Substitui window.prompt: devolve texto aparado ou null (cancelou). */
export function usePrompt(): Fn {
  const fn = useContext(Ctx);
  if (!fn) throw new Error("usePrompt fora de PromptProvider");
  return fn;
}

export function PromptProvider({ children }: { children: ReactNode }) {
  const [op, setOp] = useState<PromptOpcoes | null>(null);
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState(false);
  const resolver = useRef<((v: string | null) => void) | null>(null);

  const pedir = useCallback<Fn>((o) => {
    resolver.current?.(null);
    setValor(o.valorInicial ?? "");
    setErro(false);
    setOp(o);
    return new Promise<string | null>((res) => {
      resolver.current = res;
    });
  }, []);

  function fechar(v: string | null) {
    resolver.current?.(v);
    resolver.current = null;
    setOp(null);
  }

  function enviar() {
    const t = validarTexto(valor);
    if (!t) return setErro(true);
    fechar(t);
  }

  return (
    <Ctx.Provider value={pedir}>
      {children}
      <Dialog.Root open={!!op} onOpenChange={(o) => !o && fechar(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/50" />
          <Dialog.Content
            data-dialogo-plataforma
            className="fixed top-1/2 left-1/2 z-[100] max-h-[90dvh] w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border border-border bg-surface p-5 shadow-lg"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                enviar();
              }}
            >
              <Dialog.Title className="font-title text-lg text-text">{op?.titulo}</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm text-text-muted">
                {op?.descricao ?? "Informe o valor."}
              </Dialog.Description>
              <Input
                className="mt-3"
                value={valor}
                autoFocus
                aria-label={op?.titulo}
                aria-invalid={erro}
                onChange={(e) => {
                  setValor(e.target.value);
                  setErro(false);
                }}
                onFocus={(e) => e.currentTarget.select()}
              />
              {erro && (
                <p role="alert" className="mt-1 text-xs text-danger">
                  Preencha este campo.
                </p>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => fechar(null)}>
                  {op?.cancelarLabel ?? "Cancelar"}
                </Button>
                <Button type="submit">{op?.confirmarLabel ?? "Salvar"}</Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Ctx.Provider>
  );
}
