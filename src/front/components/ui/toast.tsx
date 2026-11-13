"use client";

import { Button } from "@front/components/ui/button";
import { cn } from "cn";
import { XIcon } from "lucide-react";
import { createContext, type ReactNode, useCallback, useContext, useState } from "react";

export type TipoToast = "sucesso" | "erro" | "info";
export type ToastItem = { id: number; tipo: TipoToast; msg: string };
export type ToastApi = Record<TipoToast, (msg: string) => void>;

export const DURACAO_TOAST_MS = 5000;

/** Pura: adiciona ao fim da pilha. */
export const empilhar = (l: ToastItem[], t: ToastItem) => [...l, t];
export const remover = (l: ToastItem[], id: number) => l.filter((t) => t.id !== id);

const Ctx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(Ctx);
  if (!api) throw new Error("useToast fora de ToastProvider");
  return api;
}

let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ToastItem[]>([]);

  const fechar = useCallback((id: number) => setItens((l) => remover(l, id)), []);
  const add = useCallback(
    (tipo: TipoToast) => (msg: string) => {
      const id = ++seq;
      setItens((l) => empilhar(l, { id, tipo, msg }));
      setTimeout(() => fechar(id), DURACAO_TOAST_MS);
    },
    [fechar],
  );
  const [api] = useState<ToastApi>(() => ({
    sucesso: (m) => add("sucesso")(m),
    erro: (m) => add("erro")(m),
    info: (m) => add("info")(m),
  }));

  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        data-dialogo-plataforma
        className="pointer-events-none fixed right-3 bottom-3 z-[110] flex w-[min(92vw,22rem)] flex-col gap-2"
      >
        {itens.map((t) => (
          <div
            key={t.id}
            role={t.tipo === "erro" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex items-start gap-2 rounded-md border bg-surface p-3 text-sm text-text shadow-lg",
              t.tipo === "erro" && "border-danger",
              t.tipo === "sucesso" && "border-success",
              t.tipo === "info" && "border-border",
            )}
          >
            <span className="min-w-0 flex-1 break-words">{t.msg}</span>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Fechar aviso"
              onClick={() => fechar(t.id)}
            >
              <XIcon />
            </Button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
