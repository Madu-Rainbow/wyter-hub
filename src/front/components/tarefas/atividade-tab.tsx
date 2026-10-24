"use client";

import { createClient } from "@front/lib/supabase/client";
import { useEffect, useState } from "react";
import { fmtDataHora } from "./comentarios-tab";

type Ev = {
  id: string;
  quando: string;
  verbo: string;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
  quem: { nome: string } | null;
};

const CAMPOS: Record<string, string> = {
  titulo: "título",
  descricao: "descrição",
  status: "status",
  prioridade: "prioridade",
  urgencia: "urgência",
  esforco: "esforço",
  data_prazo: "prazo",
  data_inicio: "início",
  estimativa_horas: "estimativa",
  responsavel_id: "responsável",
  categoria: "categoria",
  bloqueada_por_id: "bloqueio",
  link_externo: "link",
  checklist: "checklist",
};

function resumo(e: Ev) {
  if (!e.depois) return "";
  if (e.verbo === "comentou") return "";
  return Object.keys(e.depois)
    .map((k) => {
      if (
        k === "checklist" ||
        k === "descricao" ||
        k === "responsavel_id" ||
        k === "bloqueada_por_id"
      )
        return CAMPOS[k] ?? k;
      const a = e.antes?.[k];
      const d = e.depois?.[k];
      return `${CAMPOS[k] ?? k}${a != null && a !== "" ? `: ${String(a)}` : ""} → ${d == null || d === "" ? "vazio" : String(d)}`;
    })
    .join("; ");
}

export function AtividadeTab({ tarefaId }: { tarefaId: string }) {
  const [lista, setLista] = useState<Ev[] | null>(null);
  useEffect(() => {
    createClient()
      .from("evento")
      .select("id, quando, verbo, antes, depois, quem:quem_id(nome)")
      .eq("entidade", "tarefa")
      .eq("entidade_id", tarefaId)
      .order("quando", { ascending: false })
      .limit(50)
      .then(({ data }) => setLista((data ?? []) as unknown as Ev[]));
  }, [tarefaId]);

  if (lista === null) return <p className="text-sm text-text-muted">Carregando...</p>;
  if (!lista.length) return <p className="text-sm text-text-muted">Sem atividade registrada.</p>;
  return (
    <ul className="space-y-2">
      {lista.map((e) => (
        <li key={e.id} className="border-l-2 border-border pl-3 text-sm">
          <p className="text-text">
            <span className="font-medium">{e.quem?.nome ?? "—"}</span> {e.verbo}
          </p>
          {resumo(e) && <p className="text-xs text-text-muted">{resumo(e)}</p>}
          <p className="text-xs tabular-nums text-text-muted">{fmtDataHora(e.quando)}</p>
        </li>
      ))}
    </ul>
  );
}
