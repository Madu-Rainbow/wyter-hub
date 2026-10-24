"use client";

import { createClient } from "@front/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Tarefa } from "./shared";

/** URLs assinadas (1h) das capas, por caminho no bucket "anexos". */
export function useCapaUrls(tarefas: Tarefa[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const falta = [
    ...new Set(tarefas.flatMap((t) => (t.capa && !urls[t.capa.path] ? [t.capa.path] : []))),
  ];
  const chave = falta.join("|");
  // biome-ignore lint/correctness/useExhaustiveDependencies: chave resume `falta`
  useEffect(() => {
    if (!falta.length) return;
    void createClient()
      .storage.from("anexos")
      .createSignedUrls(falta, 3600)
      .then(({ data }) => {
        const novo: Record<string, string> = {};
        for (const s of data ?? []) if (s.path && s.signedUrl) novo[s.path] = s.signedUrl;
        setUrls((u) => ({ ...u, ...novo }));
      });
  }, [chave]);
  return urls;
}
