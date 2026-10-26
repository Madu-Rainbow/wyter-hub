"use client";

import { Button } from "@front/components/ui/button";
import { Input } from "@front/components/ui/input";
import { Label } from "@front/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { type ReactNode, Suspense, useActionState, useState } from "react";
import { type EstadoLogin, entrar } from "./actions";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const naoAutorizado = useSearchParams().get("erro") === "nao-autorizado";
  const next = useSearchParams().get("next") ?? "";
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [state, action, pending] = useActionState<EstadoLogin, FormData>(entrar, {
    erro: naoAutorizado ? "Acesso restrito a membros da Wyter" : "",
  });

  return (
    <LoginShell>
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
        <input type="hidden" name="next" value={next} />
        <div className="space-y-1">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={state.email}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="senha">Senha</Label>
          <div className="relative">
            <Input
              id="senha"
              name="senha"
              type={mostrarSenha ? "text" : "password"}
              required
              autoComplete="current-password"
              className="pr-11"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-1/2 right-1 -translate-y-1/2"
              aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
              onClick={() => setMostrarSenha((visivel) => !visivel)}
            >
              {mostrarSenha ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            </Button>
          </div>
        </div>
        <Button type="submit" loading={pending} className="w-full">
          Entrar
        </Button>
      </form>
    </LoginShell>
  );
}

function LoginShell({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="w-full max-w-sm rounded-md border border-border bg-surface p-8">
        {children}
      </div>
    </div>
  );
}
