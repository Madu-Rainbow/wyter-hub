import { createClient } from "@front/lib/supabase/client";

export type Ev = {
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
  prazo_hora: "hora da entrega",
  lembrete_em: "lembrete",
  estimativa_horas: "estimativa",
  responsavel_id: "responsável",
  categoria: "categoria",
  bloqueada_por_id: "bloqueio",
  link_externo: "link",
  projeto_id: "projeto",
};
const SEM_VALOR = new Set([
  "descricao",
  "responsavel_id",
  "bloqueada_por_id",
  "projeto_id",
  "lembrete_em",
]);

const VERBOS: Record<string, string> = {
  adicionou_membro: "adicionou o membro",
  removeu_membro: "removeu o membro",
  aplicou_etiqueta: "aplicou a etiqueta",
  removeu_etiqueta: "removeu a etiqueta",
  anexou: "anexou",
  removeu_anexo: "removeu o anexo",
  criou_checklist: "criou a checklist",
  removeu_checklist: "removeu a checklist",
  marcou_item: "marcou o item",
  desmarcou_item: "desmarcou o item",
  editou_comentario: "editou um comentário",
  excluiu_comentario: "excluiu um comentário",
  marcou_entrega: "marcou como entregue",
  desmarcou_entrega: "desmarcou a entrega",
  definiu_capa: "definiu a capa",
  removeu_capa: "removeu a capa",
  definiu_lembrete: "definiu o lembrete",
  removeu_lembrete: "removeu o lembrete",
  moveu_projeto: "moveu para outro projeto",
};
export const rotuloVerbo = (v: string) => VERBOS[v] ?? v;

export function resumoEvento(e: Ev) {
  if (!e.depois || e.verbo === "comentou") return "";
  const d = e.depois;
  const nome = d.membro ?? d.etiqueta ?? d.arquivo ?? d.checklist ?? d.item;
  if (typeof nome === "string") return nome;
  return Object.keys(d)
    .map((k) => {
      if (k === "campo") return String(d[k]);
      if (SEM_VALOR.has(k)) return CAMPOS[k] ?? k;
      const a = e.antes?.[k];
      const v = d[k];
      return `${CAMPOS[k] ?? k}${a != null && a !== "" ? `: ${String(a)}` : ""} → ${v == null || v === "" ? "vazio" : String(v)}`;
    })
    .join("; ");
}

export async function carregarEventos(tarefaId: string): Promise<Ev[]> {
  const { data } = await createClient()
    .from("evento")
    .select("id, quando, verbo, antes, depois, quem:quem_id(nome)")
    .eq("entidade", "tarefa")
    .eq("entidade_id", tarefaId)
    .order("quando", { ascending: false })
    .limit(100);
  return (data ?? []) as unknown as Ev[];
}
