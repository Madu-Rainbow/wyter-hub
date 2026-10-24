"use client";

import { Button } from "@front/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@front/components/ui/sheet";
import { createClient } from "@front/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { atualizarTarefa, criarTarefa, registrarEvento } from "./tarefas/acoes";
import { AtividadeTab } from "./tarefas/atividade-tab";
import { ChecklistTab } from "./tarefas/checklist-tab";
import { ComentariosTab } from "./tarefas/comentarios-tab";
import {
  type Ctx,
  FECHADAS,
  type PessoaOpt,
  PRIORIDADE_OPTS,
  STATUS_OPTS,
  type Tarefa,
} from "./tarefas/shared";
import { SubtarefasTab } from "./tarefas/subtarefas-tab";

const inputClass =
  "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none disabled:opacity-70";
const labelClass = "mb-1 block text-sm font-medium text-text";

type Aba = "detalhes" | "subtarefas" | "checklist" | "comentarios" | "atividade";

const vazia = (status: string): Tarefa => ({
  id: "",
  titulo: "",
  descricao: null,
  status,
  prioridade: "media",
  urgencia: 3,
  esforco: 3,
  data_prazo: null,
  data_inicio: null,
  estimativa_horas: null,
  responsavel_id: null,
  categoria: null,
  bloqueada_por_id: null,
  link_externo: null,
  checklist: [],
  n_comentarios: 0,
  responsavel: null,
  parent_id: null,
  projeto_id: "",
  numero: 0,
});

export function TarefaSheet({
  tarefa,
  novoStatus,
  open,
  onOpenChange,
  pessoas,
  outras,
  ctx,
}: {
  tarefa: Tarefa | null;
  novoStatus: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pessoas: PessoaOpt[];
  outras: Tarefa[];
  ctx: Ctx;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("detalhes");
  const t = tarefa ?? vazia(novoStatus);
  const editando = tarefa !== null;
  const ro = ctx.readOnly;

  const abas: [Aba, string][] = editando
    ? [
        ["detalhes", "Detalhes"],
        ...(t.parent_id
          ? []
          : ([["subtarefas", `Subtarefas${t.sub ? ` (${t.sub.feitas}/${t.sub.total})` : ""}`]] as [
              Aba,
              string,
            ][])),
        ["checklist", `Checklist (${t.checklist.length})`],
        ["comentarios", `Comentários (${t.n_comentarios})`],
        ["atividade", "Atividade"],
      ]
    : [["detalhes", "Detalhes"]];

  function salvar(formData: FormData) {
    const g = (k: string) => String(formData.get(k) ?? "").trim();
    if (!g("titulo")) return setErro("Informe o título.");
    const patch: Partial<Tarefa> = {
      titulo: g("titulo"),
      descricao: g("descricao") || null,
      status: g("status"),
      prioridade: g("prioridade"),
      urgencia: Number(g("urgencia")),
      esforco: Number(g("esforco")),
      data_inicio: g("data_inicio") || null,
      data_prazo: g("data_prazo") || null,
      estimativa_horas: g("estimativa_horas") ? Number(g("estimativa_horas")) : null,
      responsavel_id: g("responsavel_id") || null,
      categoria: g("categoria") || null,
      bloqueada_por_id: g("bloqueada_por_id") || null,
      link_externo: g("link_externo") || null,
    };
    if (!ro && !t.parent_id) patch.projeto_id = g("projeto_id");
    if (!editando && !patch.projeto_id) return setErro("Escolha o projeto da tarefa.");
    if (editando && !patch.projeto_id) delete patch.projeto_id;
    if (patch.link_externo && !/^https?:\/\//i.test(patch.link_externo))
      return setErro("O link deve começar com http:// ou https://.");

    startTransition(async () => {
      setErro(null);
      const e = editando
        ? await atualizarTarefa(ctx, t, patch, patch.status !== t.status ? "moveu" : "atualizou")
        : await criarTarefa(ctx, { ...patch, titulo: patch.titulo as string });
      if (e) return setErro(e);
      onOpenChange(false);
      router.refresh();
    });
  }

  function salvarChecklist(checklist: Tarefa["checklist"]) {
    startTransition(async () => {
      const e = await atualizarTarefa(ctx, t, { checklist }, "atualizou checklist");
      setErro(e);
      router.refresh();
    });
  }

  function excluir() {
    if (!editando || !window.confirm("Excluir esta tarefa?")) return;
    startTransition(async () => {
      const { error } = await createClient()
        .from("tarefa")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", t.id);
      if (error) return setErro(error.message);
      await registrarEvento(ctx, t.id, "excluiu", { titulo: t.titulo }, null);
      onOpenChange(false);
      router.refresh();
    });
  }

  const caminho = ctx.projetos.find((p) => p.id === t.projeto_id);
  const candidatas = outras.filter((o) => o.id !== t.id && !FECHADAS.includes(o.status));

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) setAba("detalhes");
        onOpenChange(o);
      }}
    >
      <SheetContent className="max-h-dvh w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-title">{editando ? t.titulo : "Nova tarefa"}</SheetTitle>
          {editando && t.chave && (
            <p className="text-xs text-text-muted">
              <Link
                href={`/tarefas/${t.chave}`}
                className="font-medium tabular-nums hover:underline"
              >
                {t.chave}
              </Link>
              {caminho && (
                <>
                  {" · "}
                  <Link href={`/tarefas?cliente=${caminho.clienteId}`} className="hover:underline">
                    {caminho.clienteNome}
                  </Link>
                  {" / "}
                  {caminho.contratoId ? (
                    <Link
                      href={`/tarefas?contrato=${caminho.contratoId}`}
                      className="hover:underline"
                    >
                      {caminho.contratoNome}
                    </Link>
                  ) : (
                    "Sem contrato"
                  )}
                  {" / "}
                  <Link href={`/tarefas?projeto=${caminho.id}`} className="hover:underline">
                    {caminho.nome}
                  </Link>
                </>
              )}
            </p>
          )}
          <SheetDescription>
            {ro
              ? "Somente leitura."
              : editando
                ? "Alterações em Detalhes são salvas ao clicar em Salvar."
                : "Preencha os dados da tarefa."}
          </SheetDescription>
        </SheetHeader>

        {abas.length > 1 && (
          <div className="mx-4 flex gap-1 overflow-x-auto border-b border-border" role="tablist">
            {abas.map(([k, l]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={aba === k}
                onClick={() => setAba(k)}
                className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${aba === k ? "border-accent font-medium text-text" : "border-transparent text-text-muted hover:text-text"}`}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        <div className="px-4 pb-4 pt-3">
          {aba === "detalhes" && (
            <form key={t.id || "nova"} action={salvar} className="space-y-4">
              <fieldset disabled={ro} className="space-y-4">
                <div>
                  <label htmlFor="titulo" className={labelClass}>
                    Título *
                  </label>
                  <input
                    id="titulo"
                    name="titulo"
                    required
                    defaultValue={t.titulo}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="descricao" className={labelClass}>
                    Descrição
                  </label>
                  <textarea
                    id="descricao"
                    name="descricao"
                    rows={4}
                    defaultValue={t.descricao ?? ""}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="projeto_id" className={labelClass}>
                    Projeto {!editando && "*"}
                  </label>
                  <select
                    id="projeto_id"
                    name="projeto_id"
                    required={!editando}
                    disabled={!!t.parent_id}
                    defaultValue={editando ? t.projeto_id : (ctx.projetoId ?? "")}
                    className={inputClass}
                  >
                    {!editando && <option value="">Selecione...</option>}
                    {ctx.projetos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.chave} · {p.nome} ({p.clienteNome})
                      </option>
                    ))}
                  </select>
                  {t.parent_id && (
                    <p className="mt-1 text-xs text-text-muted">
                      Subtarefa acompanha o projeto da tarefa mãe.
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="status" className={labelClass}>
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      defaultValue={t.status}
                      className={inputClass}
                    >
                      {STATUS_OPTS.map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="prioridade" className={labelClass}>
                      Prioridade
                    </label>
                    <select
                      id="prioridade"
                      name="prioridade"
                      defaultValue={t.prioridade}
                      className={inputClass}
                    >
                      {[...PRIORIDADE_OPTS].reverse().map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="responsavel_id" className={labelClass}>
                      Responsável
                    </label>
                    <select
                      id="responsavel_id"
                      name="responsavel_id"
                      defaultValue={t.responsavel_id ?? ""}
                      className={inputClass}
                    >
                      <option value="">Ninguém</option>
                      {pessoas.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="categoria" className={labelClass}>
                      Categoria
                    </label>
                    <input
                      id="categoria"
                      name="categoria"
                      defaultValue={t.categoria ?? ""}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="data_inicio" className={labelClass}>
                      Início
                    </label>
                    <input
                      id="data_inicio"
                      name="data_inicio"
                      type="date"
                      defaultValue={t.data_inicio?.slice(0, 10) ?? ""}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="data_prazo" className={labelClass}>
                      Prazo
                    </label>
                    <input
                      id="data_prazo"
                      name="data_prazo"
                      type="date"
                      defaultValue={t.data_prazo?.slice(0, 10) ?? ""}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="urgencia" className={labelClass}>
                      Urgência
                    </label>
                    <input
                      id="urgencia"
                      name="urgencia"
                      type="number"
                      min={1}
                      max={5}
                      defaultValue={t.urgencia}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="esforco" className={labelClass}>
                      Esforço
                    </label>
                    <input
                      id="esforco"
                      name="esforco"
                      type="number"
                      min={1}
                      max={5}
                      defaultValue={t.esforco}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="estimativa_horas" className={labelClass}>
                      Estim. (h)
                    </label>
                    <input
                      id="estimativa_horas"
                      name="estimativa_horas"
                      type="number"
                      min={0}
                      step="0.5"
                      defaultValue={t.estimativa_horas ?? ""}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="bloqueada_por_id" className={labelClass}>
                    Bloqueada por
                  </label>
                  <select
                    id="bloqueada_por_id"
                    name="bloqueada_por_id"
                    defaultValue={t.bloqueada_por_id ?? ""}
                    className={inputClass}
                  >
                    <option value="">Nenhuma</option>
                    {candidatas.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.titulo}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="link_externo" className={labelClass}>
                    Link externo
                  </label>
                  <input
                    id="link_externo"
                    name="link_externo"
                    type="url"
                    placeholder="https://"
                    defaultValue={t.link_externo ?? ""}
                    className={inputClass}
                  />
                  {t.link_externo && /^https?:\/\//i.test(t.link_externo) && (
                    <a
                      href={t.link_externo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs text-accent underline"
                    >
                      Abrir link
                    </a>
                  )}
                </div>
              </fieldset>

              {erro && <p className="text-sm text-red-600">{erro}</p>}

              {!ro && (
                <div className="flex items-center justify-between pt-2">
                  <Button type="submit" disabled={pending}>
                    {pending ? "Salvando..." : "Salvar"}
                  </Button>
                  {editando && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-red-600"
                      onClick={excluir}
                      disabled={pending}
                    >
                      Excluir
                    </Button>
                  )}
                </div>
              )}
            </form>
          )}
          {aba === "subtarefas" && editando && (
            <SubtarefasTab
              key={t.id}
              mae={t}
              filhas={outras.filter((o) => o.parent_id === t.id)}
              ctx={ctx}
            />
          )}
          {aba === "checklist" && editando && (
            <ChecklistTab key={t.id} itens={t.checklist} readOnly={ro} onSave={salvarChecklist} />
          )}
          {aba === "comentarios" && editando && (
            <ComentariosTab key={t.id} tarefaId={t.id} ctx={ctx} />
          )}
          {aba === "atividade" && editando && <AtividadeTab key={t.id} tarefaId={t.id} />}
          {aba !== "detalhes" && erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}
