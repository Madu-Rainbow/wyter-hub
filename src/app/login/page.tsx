"use client";

import { Button } from "@front/components/ui/button";
import { Input } from "@front/components/ui/input";
import { Label } from "@front/components/ui/label";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { entrar } from "./actions";

export default function LoginPage() {
  const naoAutorizado = useSearchParams().get("erro") === "nao-autorizado";
  const [state, action, pending] = useActionState(entrar, {
    erro: naoAutorizado ? "Acesso restrito a membros da Wyter" : "",
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="w-full max-w-sm rounded-md border border-border bg-surface p-8">
        <h1 className="mb-2 text-center font-title text-2xl text-text">Wyter Hub</h1>
        <p className="mb-8 text-center text-sm text-text-muted">
          Sistema de gestão da Wyter Consultoria
        </p>

        {state.erro && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-danger/20 bg-danger/5 p-3 text-center text-sm text-danger"
          >
            {state.erro}
          </div>
        )}

        <form action={action} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              name="senha"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" loading={pending} className="w-full">
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
