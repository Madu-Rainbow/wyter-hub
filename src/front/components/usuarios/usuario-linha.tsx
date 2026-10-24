"use client";

import { Button } from "@front/components/ui/button";
import { Combobox } from "@front/components/ui/combobox";
import { Input } from "@front/components/ui/input";
import { createClient } from "@front/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ESTADOS, PAPEIS, type Usuario } from "./tipos";

const COR = {
  ativo: "bg-green-50 text-green-700 border-green-200",
  convidado: "bg-amber-50 text-amber-700 border-amber-200",
  inativo: "bg-gray-50 text-gray-600 border-gray-200",
} as const;

export function UsuarioLinha({ u }: { u: Usuario }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, start] = useTransition();

  /** Executa uma RPC e atualiza a lista; erros do banco (guardas) aparecem na linha. */
  function rodar(
    fn: () => PromiseLike<{ error: { message: string } | null }>,
    depois?: () => void,
  ) {
    start(async () => {
      const { error } = await fn();
      if (error) return setMsg(error.message);
      setMsg(null);
      depois?.();
      router.refresh();
    });
  }

  const sb = createClient();
  const atualizar = (p: {
    papel: string;
    cargo: string | null;
    cap: number | null;
    ativo: boolean;
  }) =>
    sb.rpc("atualizar_usuario", {
      p_pessoa_id: u.id as string,
      p_papel: p.papel as "diretor",
      p_cargo: p.cargo ?? "",
      p_capacidade: p.cap as number, // null limpa a capacidade (tipo gerado nao admite null)
      p_ativo: p.ativo,
    });
  const atual = {
    papel: u.papel,
    cargo: u.cargo,
    cap: u.capacidade,
    ativo: u.estado !== "inativo",
  };

  function salvar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const cap = String(f.get("capacidade") ?? "").trim();
    rodar(
      () =>
        atualizar({
          ...atual,
          papel: String(f.get("papel")),
          cargo: String(f.get("cargo") ?? "") || null,
          cap: cap ? Number(cap) : null,
        }),
      () => setEditando(false),
    );
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/login`);
      setMsg("Link de acesso copiado.");
    } catch {
      setMsg(`${window.location.origin}/login`);
    }
  }

  return (
    <li className="border-b border-border px-3 py-2.5 text-sm last:border-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <div className="min-w-0 flex-1 basis-56">
          <p className="truncate font-medium text-text">
            {u.nome}
            {u.souEu && <span className="ml-1 text-xs font-normal text-text-muted">(você)</span>}
          </p>
          <p className="truncate text-xs text-text-muted">{u.email}</p>
        </div>
        <p className="w-40 truncate text-text-muted">
          {PAPEIS.find(([v]) => v === u.papel)?.[1]}
          {u.cargo && ` · ${u.cargo}`}
        </p>
        <p className="w-16 text-right tabular-nums text-text-muted">
          {u.capacidade != null ? `${u.capacidade} h` : "—"}
        </p>
        <span
          className={`w-24 rounded-full border px-2 py-0.5 text-center text-xs ${COR[u.estado]}`}
        >
          {ESTADOS[u.estado]}
        </span>
        <p className="w-32 tabular-nums text-text-muted">
          {u.ultimoAcesso
            ? new Date(u.ultimoAcesso).toLocaleString("pt-BR", { timeZone: "America/Cuiaba" })
            : "—"}
        </p>
        <div className="flex flex-wrap gap-1">
          {u.estado === "convidado" && (
            <>
              <Button size="sm" variant="secondary" onClick={copiarLink}>
                Copiar link
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={pendente}
                onClick={() => {
                  if (confirm(`Revogar o convite de ${u.email}?`))
                    rodar(() => sb.rpc("revogar_convite", { p_email: u.email }));
                }}
              >
                Revogar
              </Button>
            </>
          )}
          {u.id && (
            <Button size="sm" variant="secondary" onClick={() => setEditando(!editando)}>
              Editar
            </Button>
          )}
          {u.id && u.estado !== "convidado" && !u.souEu && (
            <Button
              size="sm"
              variant="secondary"
              disabled={pendente}
              onClick={() => rodar(() => atualizar({ ...atual, ativo: u.estado === "inativo" }))}
            >
              {u.estado === "inativo" ? "Reativar" : "Desativar"}
            </Button>
          )}
        </div>
      </div>
      {editando && (
        <form onSubmit={salvar} className="mt-2 flex flex-wrap items-center gap-2">
          <Combobox
            name="papel"
            defaultValue={u.papel}
            aria-label="Papel"
            className="w-48"
            options={PAPEIS.map(([value, label]) => ({ value, label }))}
          />
          <Input name="cargo" defaultValue={u.cargo ?? ""} placeholder="Cargo" className="w-48" />
          <Input
            name="capacidade"
            type="number"
            min={0}
            max={168}
            defaultValue={u.capacidade ?? ""}
            placeholder="h/semana"
            className="w-28"
          />
          <Button type="submit" size="sm" loading={pendente}>
            Salvar
          </Button>
        </form>
      )}
      {msg && (
        <p role="status" className="mt-1 text-xs text-danger">
          {msg}
        </p>
      )}
    </li>
  );
}
