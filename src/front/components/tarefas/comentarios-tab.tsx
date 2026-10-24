"use client";

import { Button } from "@front/components/ui/button";
import { createClient } from "@front/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Ctx } from "./shared";

type Com = { id: string; texto: string; created_at: string; autor: { nome: string } | null };

export const fmtDataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Cuiaba",
    dateStyle: "short",
    timeStyle: "short",
  });

export function ComentariosTab({ tarefaId, ctx }: { tarefaId: string; ctx: Ctx }) {
  const router = useRouter();
  const [lista, setLista] = useState<Com[] | null>(null);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    const { data, error } = await createClient()
      .from("comentario")
      .select("id, texto, created_at, autor:autor_id(nome)")
      .eq("tarefa_id", tarefaId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });
    if (error) setErro(error.message);
    setLista((data ?? []) as unknown as Com[]);
  }, [tarefaId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function enviar() {
    const t = texto.trim();
    if (!t || !ctx.meId) return;
    setEnviando(true);
    const { error } = await createClient()
      .from("comentario")
      .insert({ tarefa_id: tarefaId, texto: t, autor_id: ctx.meId, org_id: ctx.orgId });
    setEnviando(false);
    if (error) return setErro(error.message);
    setErro(null);
    setTexto("");
    await carregar();
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {lista === null && <p className="text-sm text-text-muted">Carregando...</p>}
      {lista?.length === 0 && <p className="text-sm text-text-muted">Sem comentários.</p>}
      <ul className="space-y-3">
        {lista?.map((c) => (
          <li key={c.id} className="rounded-md border border-border bg-bg p-3">
            <p className="text-xs text-text-muted">
              <span className="font-medium text-text">{c.autor?.nome ?? "—"}</span> ·{" "}
              {fmtDataHora(c.created_at)}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-text">{c.texto}</p>
          </li>
        ))}
      </ul>
      {!ctx.readOnly && ctx.meId && (
        <div className="space-y-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={3}
            placeholder="Escreva um comentário"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <Button type="button" size="sm" disabled={enviando || !texto.trim()} onClick={enviar}>
            {enviando ? "Enviando..." : "Comentar"}
          </Button>
        </div>
      )}
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  );
}
