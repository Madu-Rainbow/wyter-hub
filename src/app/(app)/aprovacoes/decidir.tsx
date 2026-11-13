"use client";

import { Button } from "@front/components/ui/button";
import { createClient } from "@front/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/** Decisão só do diretor (a tela não exibe para outros papéis; o banco também restringe, trigger proteger_aprovacao_decisao). */
export function DecidirAprovacao({ id }: { id: string }) {
  const router = useRouter();
  const [comentario, setComentario] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, start] = useTransition();

  function decidir(status: "aprovada" | "recusada") {
    start(async () => {
      const { error } = await createClient()
        .from("aprovacao")
        .update({ status, decisao_comentario: comentario.trim() || null })
        .eq("id", id);
      if (error) return setErro(error.message);
      setErro(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <textarea
        aria-label="Comentário da decisão"
        placeholder="Comentário (opcional)"
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        rows={2}
        className="w-full min-w-44 rounded-md border border-input bg-transparent px-2 py-1 text-xs"
      />
      <div className="flex gap-1">
        <Button size="sm" disabled={pendente} onClick={() => decidir("aprovada")}>
          Aprovar
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={pendente}
          onClick={() => decidir("recusada")}
        >
          Recusar
        </Button>
      </div>
      {erro && (
        <p role="alert" className="text-xs text-danger">
          {erro}
        </p>
      )}
    </div>
  );
}
