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
import { trabalhoHref } from "@front/lib/trabalho";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { atualizarTarefa, copiarTarefa, criarTarefa, moverTarefa } from "./tarefas/acoes";
import { AnexosSec } from "./tarefas/anexos-sec";
import { BarraLateral } from "./tarefas/barra-lateral";
import { ChecklistsSec } from "./tarefas/checklist-tab";
import { LinhaDoTempo } from "./tarefas/comentarios-tab";
import { DescricaoSec } from "./tarefas/descricao-sec";
import { Secao } from "./tarefas/modal-ui";
import {
  COR_ETIQUETA,
  type Ctx,
  FECHADAS,
  type PessoaOpt,
  PRIORIDADE_OPTS,
  STATUS_OPTS,
  type Tarefa,
} from "./tarefas/shared";
import { SubtarefasTab } from "./tarefas/subtarefas-tab";
import { Avatar, PrazoBadge } from "./tarefas/tarefa-card";

const inputClass =
  "w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none disabled:opacity-70";
const labelClass = "mb-1 block text-sm font-medium text-text";

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
  prazo_hora: null,
  lembrete_em: null,
  entregue_em: null,
  arquivada_em: null,
  capa_anexo_id: null,
  n_anexos: 0,
  membros: [],
  etiquetas: [],
  capa: null,
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
  const [rev, setRev] = useState(0);
  const t = tarefa ?? vazia(novoStatus);
  const editando = tarefa !== null;
  const ro = ctx.readOnly;

  /** Recarrega secoes do modal e a lista (contadores do cartao). */
  const mudou = () => {
    setRev((r) => r + 1);
    router.refresh();
  };

  function salvarCampos(patch: Partial<Tarefa>) {
    startTransition(async () => {
      const e = await atualizarTarefa(ctx, t, patch);
      setErro(e);
      mudou();
    });
  }

  function salvar(formData: FormData) {
    const g = (k: string) => String(formData.get(k) ?? "").trim();
    const patch: Partial<Tarefa> = {
      status: g("status"),
      prioridade: g("prioridade"),
      urgencia: Number(g("urgencia")),
      esforco: Number(g("esforco")),
      estimativa_horas: g("estimativa_horas") ? Number(g("estimativa_horas")) : null,
      responsavel_id: g("responsavel_id") || null,
      categoria: g("categoria") || null,
      bloqueada_por_id: g("bloqueada_por_id") || null,
      link_externo: g("link_externo") || null,
    };
    if (!editando) {
      if (!g("titulo")) return setErro("Informe o título.");
      patch.titulo = g("titulo");
      patch.descricao = g("descricao") || null;
      patch.data_inicio = g("data_inicio") || null;
      patch.data_prazo = g("data_prazo") || null;
      patch.projeto_id = g("projeto_id");
      if (!patch.projeto_id) return setErro("Escolha o projeto da tarefa.");
    }
    if (patch.link_externo && !/^https?:\/\//i.test(patch.link_externo))
      return setErro("O link deve começar com http:// ou https://.");

    startTransition(async () => {
      setErro(null);
      const e = editando
        ? await atualizarTarefa(ctx, t, patch)
        : await criarTarefa(ctx, { ...patch, titulo: patch.titulo as string });
      if (e) return setErro(e);
      if (!editando) onOpenChange(false);
      mudou();
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
      onOpenChange(false);
      router.refresh();
    });
  }

  const caminho = ctx.projetos.find((p) => p.id === t.projeto_id);
  const candidatas = outras.filter((o) => o.id !== t.id && !FECHADAS.includes(o.status));
  const responsaveis = [
    ...(t.responsavel_id && t.responsavel
      ? [{ id: t.responsavel_id, nome: t.responsavel.nome }]
      : []),
    ...t.membros.filter((m) => m.id !== t.responsavel_id),
  ];

  const campos = (
    <form
      key={`${t.id || "nova"}-${t.status}-${t.projeto_id}`}
      action={salvar}
      className="space-y-3"
    >
      <fieldset disabled={ro} className="space-y-3">
        {!editando && (
          <>
            <div>
              <label htmlFor="titulo" className={labelClass}>
                Título *
              </label>
              <input id="titulo" name="titulo" required className={inputClass} />
            </div>
            <div>
              <label htmlFor="descricao" className={labelClass}>
                Descrição (Markdown)
              </label>
              <textarea id="descricao" name="descricao" rows={4} className={inputClass} />
            </div>
            <div>
              <label htmlFor="projeto_id" className={labelClass}>
                Projeto *
              </label>
              <select
                id="projeto_id"
                name="projeto_id"
                required
                defaultValue={ctx.projetoId ?? ""}
                className={inputClass}
              >
                <option value="">Selecione...</option>
                {ctx.projetos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.chave} · {p.nome} ({p.clienteNome})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="data_inicio" className={labelClass}>
                  Início
                </label>
                <input id="data_inicio" name="data_inicio" type="date" className={inputClass} />
              </div>
              <div>
                <label htmlFor="data_prazo" className={labelClass}>
                  Entrega
                </label>
                <input id="data_prazo" name="data_prazo" type="date" className={inputClass} />
              </div>
            </div>
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="status" className={labelClass}>
              Status
            </label>
            <select id="status" name="status" defaultValue={t.status} className={inputClass}>
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
          <div>
            <label htmlFor="responsavel_id" className={labelClass}>
              Responsável principal
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
        <div className="grid grid-cols-3 gap-3">
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
        <div className="grid grid-cols-2 gap-3">
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
        </div>
      </fieldset>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {!ro && (
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : editando ? "Salvar campos" : "Criar tarefa"}
        </Button>
      )}
    </form>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-h-dvh w-[min(96vw,64rem)] gap-0 p-0 sm:max-w-none">
        <SheetHeader className="shrink-0 border-b border-border pr-12">
          {editando && !ro ? (
            <input
              key={`${t.id}-${t.titulo}`}
              aria-label="Título da tarefa"
              defaultValue={t.titulo}
              maxLength={200}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== t.titulo) salvarCampos({ titulo: v });
                else e.target.value = t.titulo;
              }}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              className="w-full rounded border border-transparent bg-transparent font-title text-lg font-semibold text-text hover:border-border focus:border-accent focus:outline-none"
            />
          ) : (
            <SheetTitle className="font-title">{editando ? t.titulo : "Nova tarefa"}</SheetTitle>
          )}
          {editando && t.chave && (
            <p className="text-xs text-text-muted">
              <Link
                href={trabalhoHref({ projeto: t.projeto_id, tarefa: t.chave })}
                className="font-medium tabular-nums hover:underline"
              >
                {t.chave}
              </Link>
              {caminho && (
                <>
                  {" · "}
                  <Link
                    href={trabalhoHref({ cliente: caminho.clienteId })}
                    className="hover:underline"
                  >
                    {caminho.clienteNome}
                  </Link>
                  {" / "}
                  {caminho.contratoId ? (
                    <Link
                      href={trabalhoHref({
                        cliente: caminho.clienteId,
                        contrato: caminho.contratoId,
                      })}
                      className="hover:underline"
                    >
                      {caminho.contratoNome}
                    </Link>
                  ) : (
                    "Sem contrato"
                  )}
                  {" / "}
                  <Link href={trabalhoHref({ projeto: caminho.id })} className="hover:underline">
                    {caminho.nome}
                  </Link>
                </>
              )}
            </p>
          )}
          <SheetDescription className="text-xs">
            {ro
              ? "Somente leitura."
              : editando
                ? "As alterações são salvas ao editar cada bloco."
                : "Preencha os dados da tarefa."}
          </SheetDescription>
        </SheetHeader>

        {!editando ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{campos}</div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-[minmax(0,1fr)_clamp(11rem,22%,14rem)]">
            <div className="min-h-0 space-y-5 overflow-y-auto p-4">
              {t.arquivada_em && (
                <p className="rounded bg-secondary px-3 py-2 text-sm text-text-muted">
                  Tarefa arquivada. Use Restaurar em Ações para reativar.
                </p>
              )}
              <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
                {responsaveis.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-text-muted">Membros</p>
                    <div className="flex flex-wrap gap-1">
                      {responsaveis.map((p) => (
                        <Avatar key={p.id} nome={p.nome} />
                      ))}
                    </div>
                  </div>
                )}
                {t.etiquetas.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-text-muted">Etiquetas</p>
                    <div className="flex flex-wrap gap-1">
                      {t.etiquetas.map((e) => (
                        <span
                          key={e.id}
                          className={`rounded px-2 py-0.5 text-xs ${COR_ETIQUETA[e.cor] ?? COR_ETIQUETA.azul}`}
                        >
                          {e.nome}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(t.data_prazo || t.data_inicio) && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-text-muted">Datas</p>
                    <div className="flex items-center gap-2">
                      {!ro && t.data_prazo && (
                        <input
                          type="checkbox"
                          aria-label="Marcar como entregue"
                          checked={!!t.entregue_em}
                          onChange={(e) =>
                            salvarCampos({
                              entregue_em: e.target.checked ? new Date().toISOString() : null,
                            })
                          }
                        />
                      )}
                      <PrazoBadge t={t} />
                    </div>
                  </div>
                )}
              </div>

              <DescricaoSec
                key={`${t.id}-${t.descricao}`}
                valor={t.descricao}
                readOnly={ro}
                onSave={(v) => salvarCampos({ descricao: v })}
              />
              <ChecklistsSec
                tarefa={t}
                ctx={ctx}
                pessoas={pessoas}
                rev={rev}
                onChange={mudou}
                onSubtarefa={(titulo, resp, prazo) =>
                  criarTarefa(ctx, {
                    titulo,
                    parent_id: t.id,
                    projeto_id: t.projeto_id,
                    responsavel_id: resp,
                    data_prazo: prazo,
                  })
                }
              />
              <AnexosSec
                tarefa={t}
                ctx={ctx}
                rev={rev}
                onChange={mudou}
                onCapa={(id) => salvarCampos({ capa_anexo_id: id })}
              />
              {!t.parent_id && (
                <Secao titulo="Subtarefas">
                  <SubtarefasTab
                    key={t.id}
                    mae={t}
                    filhas={outras.filter((o) => o.parent_id === t.id)}
                    ctx={ctx}
                  />
                </Secao>
              )}
              <details className="rounded-md border border-border p-3">
                <summary className="cursor-pointer font-title text-base">Campos da tarefa</summary>
                <div className="pt-3">{campos}</div>
              </details>
              <LinhaDoTempo
                tarefaId={t.id}
                ctx={ctx}
                pessoas={pessoas}
                rev={rev}
                onChange={mudou}
              />
            </div>
            <aside className="min-h-0 overflow-y-auto border-t border-border p-3 sm:border-l sm:border-t-0">
              <BarraLateral
                t={t}
                ctx={ctx}
                pessoas={pessoas}
                onChange={mudou}
                onSalvar={salvarCampos}
                onCapa={(id) => salvarCampos({ capa_anexo_id: id })}
                onAnexado={mudou}
                onCopiar={() =>
                  startTransition(async () => {
                    const e = await copiarTarefa(ctx, t);
                    setErro(e);
                    router.refresh();
                  })
                }
                onMover={(p, s) =>
                  startTransition(async () => {
                    const e = await moverTarefa(ctx, t, p, s);
                    setErro(e);
                    mudou();
                  })
                }
                onExcluir={excluir}
              />
              {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}
            </aside>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
