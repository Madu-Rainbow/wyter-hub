"use client";

import { Button } from "@front/components/ui/button";
import { AlertDialog } from "radix-ui";
import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from "react";

export type ConfirmOpcoes = {
  titulo: string;
  descricao?: ReactNode;
  confirmarLabel?: string;
  cancelarLabel?: string;
  variante?: "destructive" | "primary";
};

type Fn = (o: ConfirmOpcoes) => Promise<boolean>;
const Ctx = createContext<Fn | null>(null);

/** Substitui window.confirm: `if (!(await confirmar({...}))) return;` */
export function useConfirm(): Fn {
  const fn = useContext(Ctx);
  if (!fn) throw new Error("useConfirm fora de ConfirmProvider");
  return fn;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [op, setOp] = useState<ConfirmOpcoes | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirmar = useCallback<Fn>((o) => {
    resolver.current?.(false); // chamada anterior pendente: cancela
    setOp(o);
    return new Promise<boolean>((res) => {
      resolver.current = res;
    });
  }, []);

  function fechar(v: boolean) {
    resolver.current?.(v);
    resolver.current = null;
    setOp(null);
  }

  return (
    <Ctx.Provider value={confirmar}>
      {children}
      <AlertDialog.Root open={!!op} onOpenChange={(o) => !o && fechar(false)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[90] bg-black/50" />
          <AlertDialog.Content
            data-dialogo-plataforma
            onKeyDown={(e) => {
              if (e.key === "Enter" && !(e.target as HTMLElement).closest("button")) {
                e.preventDefault();
                fechar(true);
              }
            }}
            className="fixed top-1/2 left-1/2 z-[100] max-h-[90dvh] w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border border-border bg-surface p-5 shadow-lg"
          >
            <AlertDialog.Title className="font-title text-lg text-text">
              {op?.titulo}
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-text-muted">
              {op?.descricao ?? "Confirme para continuar."}
            </AlertDialog.Description>
            <div className="mt-5 flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <Button variant="secondary">{op?.cancelarLabel ?? "Cancelar"}</Button>
              </AlertDialog.Cancel>
              <Button
                variant={op?.variante === "destructive" ? "destructive" : "primary"}
                onClick={() => fechar(true)}
              >
                {op?.confirmarLabel ?? "Confirmar"}
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </Ctx.Provider>
  );
}
