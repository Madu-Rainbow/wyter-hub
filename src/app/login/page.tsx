"use client";

import { Button } from "@front/components/ui/button";
import { createClient } from "@front/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get("erro") ?? searchParams.get("error");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(
    error === "nao-autorizado" || error === "unauthorized"
      ? "Acesso restrito a membros da Wyter"
      : error
        ? "Erro ao fazer login. Tente novamente."
        : "",
  );

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (authError) {
      setErrorMsg(
        authError.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : authError.message,
      );
      setLoading(false);
      return;
    }

    router.push("/painel");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="w-full max-w-sm rounded-md border border-border bg-surface p-8">
        <h1 className="mb-2 text-center font-title text-2xl text-text">Wyter Hub</h1>
        <p className="mb-8 text-center text-sm text-text-muted">
          Sistema de gestão da Wyter Consultoria
        </p>

        {errorMsg && (
          <div className="mb-4 rounded-md border border-danger/20 bg-danger/5 p-3 text-center text-sm text-danger">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-text">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="seu@email.com"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="senha" className="mb-1 block text-sm font-medium text-text">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </div>

          <Button type="submit" loading={loading} className="w-full">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-text-muted">
          Acesso restrito a membros autorizados da Wyter
        </p>
      </div>
    </div>
  );
}
