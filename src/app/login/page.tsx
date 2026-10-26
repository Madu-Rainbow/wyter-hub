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
    <div className="grid min-h-screen bg-bg lg:grid-cols-[minmax(0,1fr)_26rem]">
      <section className="relative hidden overflow-hidden border-r border-border bg-[#0e1726] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="relative z-10 max-w-xl">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em] text-white/60">
            Wyter Consultoria
          </p>
          <h1 className="max-w-lg font-title text-4xl leading-tight">
            Gestão orientada a dados para decisões que movem o negócio.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/70">
            Conectamos contexto, trabalho e resultado em uma visão única para a equipe.
          </p>
        </div>
        <div
          className="relative mx-auto h-80 w-full max-w-2xl [perspective:1000px]"
          aria-hidden="true"
        >
          <div className="absolute inset-0 [transform:rotateX(58deg)_rotateZ(-18deg)_rotateY(-8deg)] [transform-style:preserve-3d]">
            <div className="absolute inset-8 rounded-[50%] border border-[#8fb8e8]/20 bg-[#05080e]/70 shadow-[0_0_80px_#263c68] [transform:translateZ(-35px)]" />
            <div className="absolute inset-12 rounded-[50%] border border-white/10 [transform:translateZ(-10px)]" />
            {Array.from({ length: 10 }, (_, i) => `edge-${i}`).map((key, i) => (
              <span
                key={key}
                className="absolute h-px origin-left bg-gradient-to-r from-[#8fb8e8]/70 via-[#9f8cff]/40 to-transparent shadow-[0_0_8px_#8fb8e8]"
                style={{
                  left: `${18 + ((i * 19) % 49)}%`,
                  top: `${24 + ((i * 31) % 45)}%`,
                  width: `${22 + (i % 4) * 8}%`,
                  transform: `rotate(${12 + i * 23}deg) translateZ(${(i % 5) * 22}px)`,
                }}
              />
            ))}
            {Array.from({ length: 14 }, (_, i) => `node-${i}`).map((key, i) => (
              <span
                key={key}
                className="absolute size-3 rounded-full border border-[#d6e8ff]/80 bg-[radial-gradient(circle_at_35%_30%,#fff_0,#b8d7ff_16%,#738dff_42%,#6b4bce_70%,transparent_72%)] shadow-[0_0_7px_#d6e8ff,0_0_24px_#7661ff]"
                style={{
                  left: `${11 + ((i * 29) % 78)}%`,
                  top: `${12 + ((i * 43) % 70)}%`,
                  transform: `translateZ(${18 + (i % 6) * 20}px) scale(${0.7 + (i % 4) * 0.18})`,
                }}
              />
            ))}
          </div>
          <div className="absolute inset-x-20 bottom-4 h-10 rounded-[50%] bg-[#596cff]/10 blur-2xl" />
        </div>
        <p className="relative z-10 text-xs text-white/45">
          Visualização demonstrativa · dados fictícios
        </p>
      </section>
      <section className="flex min-h-screen items-center justify-center px-6 py-10 lg:px-10">
        <div className="w-full max-w-sm rounded-md border border-border bg-surface p-8">
          {children}
        </div>
      </section>
    </div>
  );
}
