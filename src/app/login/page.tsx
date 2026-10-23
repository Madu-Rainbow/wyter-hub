"use client";

import { signIn } from "@front/lib/auth-client.js";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const error = searchParams.get("error");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    await signIn.social({
      provider: "google",
      callbackURL: callbackUrl,
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="w-full max-w-sm rounded-md border border-border bg-surface p-8">
        <h1 className="mb-2 text-center font-title text-2xl text-text">Wyter Hub</h1>
        <p className="mb-8 text-center text-sm text-text-muted">
          Sistema de gestão da Wyter Consultoria
        </p>

        {error && (
          <div className="mb-4 rounded-md border border-danger/20 bg-danger/5 p-3 text-center text-sm text-danger">
            {error === "unauthorized"
              ? "E-mail não autorizado. Entre em contato com a diretoria."
              : "Erro ao fazer login. Tente novamente."}
          </div>
        )}

        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar com Google"}
        </button>

        <p className="mt-4 text-center text-xs text-text-muted">
          Acesso restrito a membros autorizados da Wyter
        </p>
      </div>
    </div>
  );
}
