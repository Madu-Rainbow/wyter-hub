"use client";

import { createClient } from "@front/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const TABELAS = [
  "cliente",
  "contrato",
  "projeto",
  "tarefa",
  "registro_diario",
  "evento",
  "dossie_cliente",
  "gaveta_pasta",
  "gaveta_arquivo",
  "gaveta_versao",
  "repositorio_item",
  "aprovacao",
] as const;

/** Mantém as telas do app sincronizadas com mudanças autorizadas pelo Realtime do Supabase. */
export function RealtimeProvider({ orgId }: { orgId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel: RealtimeChannel = supabase.channel(`wyter-hub:${orgId}`);

    const atualizar = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 150);
    };

    for (const table of TABELAS) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `org_id=eq.${orgId}` },
        atualizar,
      );
    }

    channel.subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [orgId, router]);

  return null;
}
