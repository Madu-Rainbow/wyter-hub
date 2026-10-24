"use client";

import { Button } from "@front/components/ui/button";
import { Input } from "@front/components/ui/input";
import { createClient } from "@front/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PAPEIS } from "./tipos";

export function ConvidarForm() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, start] = useTransition();

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const cap = String(f.get("capacidade") ?? "").trim();
    start(async () => {
      const { error } = await createClient().rpc("convidar_usuario", {
        p_email: String(f.get("email")),
        p_papel: String(f.get("papel")) as "diretor",
        p_nome: String(f.get("nome") ?? ""),
        p_cargo: String(f.get("cargo") ?? ""),
        p_capacidade: cap ? Number(cap) : undefined,
      });
      if (error) return setErro(error.message);
      setErro(null);
      form.reset();
      setAberto(false);
      router.refresh();
    });
  }

  if (!aberto) return <Button onClick={() => setAberto(true)}>Convidar usuário</Button>;

  return (
    <form
      onSubmit={enviar}
      className="grid w-full gap-2 rounded-md border border-border bg-surface p-3 sm:grid-cols-6"
    >
      <Input name="email" type="email" required placeholder="E-mail" className="sm:col-span-2" />
      <Input name="nome" placeholder="Nome (opcional)" className="sm:col-span-2" />
      <select
        name="papel"
        defaultValue="analista"
        aria-label="Papel"
        className="h-9 rounded-md border border-input bg-transparent px-2 text-sm sm:col-span-2"
      >
        {PAPEIS.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <Input name="cargo" placeholder="Cargo" className="sm:col-span-3" />
      <Input
        name="capacidade"
        type="number"
        min={0}
        max={168}
        placeholder="Capacidade (h/semana)"
        className="sm:col-span-3"
      />
      {erro && (
        <p role="alert" className="text-sm text-danger sm:col-span-6">
          {erro}
        </p>
      )}
      <div className="flex gap-2 sm:col-span-6">
        <Button type="submit" disabled={pendente}>
          Convidar
        </Button>
        <Button type="button" variant="ghost" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
