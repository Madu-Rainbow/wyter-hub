"use client";

import { KanbanBoard } from "@front/components/kanban-board";
import { TarefaSheet } from "@front/components/tarefa-sheet";
import { Button } from "@front/components/ui/button";
import { Plus, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { atualizarTarefa, criarTarefa } from "./acoes";
import { GanttView } from "./gantt-view";
import { ListaView } from "./lista-view";
import {
  type Agrupar,
  agrupar,
  type Ctx,
  enriquecer,
  FECHADAS,
  FILTROS_VAZIOS,
  type Filtros,
  filtrar,
  type PessoaOpt,
  PRIORIDADE_OPTS,
  patchDoGrupo,
  STATUS_OPTS,
  type Tarefa,
  type Visao,
} from "./shared";
import { TabelaView } from "./tabela-view";

const VISOES: [Visao, string][] = [
  ["kanban", "Kanban"],
  ["lista", "Lista"],
  ["tabela", "Tabela"],
  ["gantt", "Gantt"],
];
const ctl =
  "rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text focus:border-accent focus:outline-none";

export function TarefasView({
  tarefas: initial,
  pessoas,
  ctx,
  abrirId = null,
  abrirNova = false,
  filtrosIniciais,
}: {
  tarefas: Tarefa[];
  pessoas: PessoaOpt[];
  ctx: Ctx;
  /** Abre o painel desta tarefa ao montar (rota /trabalho?tarefa=). */
  abrirId?: string | null;
  /** Abre o painel de nova tarefa ao montar (?nova=1). */
  abrirNova?: boolean;
  filtrosIniciais?: Partial<Filtros>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const visaoParam = params.get("visao");
  const visao: Visao =
    visaoParam === "lista" || visaoParam === "tabela" || visaoParam === "gantt"
      ? visaoParam
      : "kanban";

  const [, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ id: string | null; status: string } | null>(
    abrirId
      ? { id: abrirId, status: "backlog" }
      : abrirNova
        ? { id: null, status: "backlog" }
        : null,
  );
  const [filtros, setFiltros] = useState<Filtros>({ ...FILTROS_VAZIOS, ...filtrosIniciais });
  const [por, setPor] = useState<Agrupar>("status");
  const [bruto, setOptimistic] = useOptimistic(
    initial,
    (s, u: { id: string; patch: Partial<Tarefa> }) =>
      s.map((t) => (t.id === u.id ? { ...t, ...u.patch } : t)),
  );
  const tarefas = useMemo(() => enriquecer(bruto, ctx.projetos), [bruto, ctx.projetos]);

  /** Abre o painel e grava ?tarefa=CHAVE na URL (FR-002-27). */
  const abrir = useCallback(
    (t: Tarefa) => {
      setSheet({ id: t.id, status: t.status });
      if (!t.chave) return;
      const p = new URLSearchParams(params.toString());
      p.set("tarefa", t.chave);
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const setVisao = (v: Visao) => {
    const p = new URLSearchParams(params.toString());
    p.set("visao", v);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  const patch = useCallback(
    (t: Tarefa, p: Partial<Tarefa>, verbo = "atualizou") => {
      if (ctx.readOnly) return;
      startTransition(async () => {
        const extra: Partial<Tarefa> = { ...p };
        if (p.responsavel_id !== undefined)
          extra.responsavel = pessoas.find((x) => x.id === p.responsavel_id) ?? null;
        setOptimistic({ id: t.id, patch: extra });
        const e = await atualizarTarefa(ctx, t, p, verbo);
        setErro(e ? `Não foi possível salvar: ${e}` : null);
        router.refresh();
      });
    },
    [ctx, pessoas, router, setOptimistic],
  );

  const criar = useCallback(
    (titulo: string, grupoKey: string) => {
      startTransition(async () => {
        const base: Partial<Tarefa> = { status: "backlog", ...patchDoGrupo(por, grupoKey) };
        // Escopo amplo: sem projeto no escopo, o modal Nova tarefa pede o projeto (obrigatório).
        if (!ctx.projetoId && !base.projeto_id) {
          setSheet({ id: null, status: base.status ?? "backlog" });
          return;
        }
        const e = await criarTarefa(ctx, { titulo, ...base });
        setErro(e ? `Não foi possível criar: ${e}` : null);
        router.refresh();
      });
    },
    [ctx, por, router],
  );

  // Atalhos: Esc fecha painel (o Sheet ja trata), "n" abre nova tarefa fora de campos.
  useEffect(() => {
    if (ctx.readOnly) return;
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key !== "n" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      setSheet({ id: null, status: "backlog" });
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [ctx.readOnly]);

  const categorias = useMemo(
    () => [...new Set(tarefas.map((t) => t.categoria).filter((c): c is string => !!c))].sort(),
    [tarefas],
  );
  const filtradas = useMemo(
    () => filtrar(tarefas, filtros, ctx.meId),
    [tarefas, filtros, ctx.meId],
  );
  const bloqueadas = useMemo(() => {
    const porId = new Map(tarefas.map((t) => [t.id, t]));
    return new Set(
      tarefas
        .filter((t) => {
          const b = t.bloqueada_por_id ? porId.get(t.bloqueada_por_id) : null;
          return !!b && !FECHADAS.includes(b.status);
        })
        .map((t) => t.id),
    );
  }, [tarefas]);

  const grupos = useMemo(
    () => agrupar(filtradas, por, pessoas, visao !== "kanban", ctx.projetos),
    [filtradas, por, pessoas, visao, ctx.projetos],
  );
  const aberta = sheet?.id ? (tarefas.find((t) => t.id === sheet.id) ?? null) : null;
  const set = <K extends keyof Filtros>(k: K, v: Filtros[K]) =>
    setFiltros((f) => ({ ...f, [k]: v }));
  const filtrando = JSON.stringify(filtros) !== JSON.stringify(FILTROS_VAZIOS);

  return (
    <>
      <div className="mb-4 flex min-w-0 flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-2 size-4 text-text-muted" />
          <input
            aria-label="Buscar por título"
            placeholder="Buscar tarefa"
            value={filtros.busca}
            onChange={(e) => set("busca", e.target.value)}
            className={`${ctl} w-48 pl-8`}
          />
        </div>
        <select
          aria-label="Responsável"
          className={ctl}
          value={filtros.responsavel}
          onChange={(e) => set("responsavel", e.target.value)}
        >
          <option value="">Responsável</option>
          <option value="_none">Sem responsável</option>
          {pessoas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <select
          aria-label="Status"
          className={ctl}
          value={filtros.status}
          onChange={(e) => set("status", e.target.value)}
        >
          <option value="">Status</option>
          <option value="abertas">Abertas</option>
          {STATUS_OPTS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          aria-label="Prioridade"
          className={ctl}
          value={filtros.prioridade}
          onChange={(e) => set("prioridade", e.target.value)}
        >
          <option value="">Prioridade</option>
          {PRIORIDADE_OPTS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        {categorias.length > 0 && (
          <select
            aria-label="Categoria"
            className={ctl}
            value={filtros.categoria}
            onChange={(e) => set("categoria", e.target.value)}
          >
            <option value="">Categoria</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text">
          <input
            type="checkbox"
            checked={filtros.atrasadas}
            onChange={(e) => set("atrasadas", e.target.checked)}
          />
          Só atrasadas
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text">
          <input
            type="checkbox"
            checked={filtros.arquivadas}
            onChange={(e) => set("arquivadas", e.target.checked)}
          />
          Arquivadas
        </label>
        {ctx.meId && (
          <label className="flex items-center gap-1.5 text-sm text-text">
            <input
              type="checkbox"
              checked={filtros.minhas}
              onChange={(e) => set("minhas", e.target.checked)}
            />
            Só minhas
          </label>
        )}
        {filtrando && (
          <button
            type="button"
            className="text-sm text-accent underline"
            onClick={() => setFiltros(FILTROS_VAZIOS)}
          >
            Limpar
          </button>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {(visao === "kanban" || visao === "lista") && (
            <select
              aria-label="Agrupar por"
              className={ctl}
              value={por}
              onChange={(e) => setPor(e.target.value as Agrupar)}
            >
              <option value="status">Agrupar: status</option>
              <option value="responsavel">Agrupar: responsável</option>
              <option value="prioridade">Agrupar: prioridade</option>
              <option value="cliente">Agrupar: cliente</option>
              <option value="contrato">Agrupar: contrato</option>
              <option value="projeto">Agrupar: projeto</option>
            </select>
          )}
          <div
            className="inline-flex overflow-hidden rounded-md border border-border"
            role="toolbar"
            aria-label="Visão"
          >
            {VISOES.map(([v, l]) => (
              <button
                key={v}
                type="button"
                aria-pressed={visao === v}
                onClick={() => setVisao(v)}
                className={`px-3 py-1.5 text-sm ${visao === v ? "bg-accent text-primary-foreground" : "bg-surface text-text hover:bg-secondary"}`}
              >
                {l}
              </button>
            ))}
          </div>
          {!ctx.readOnly && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setSheet({ id: null, status: "backlog" })}
            >
              <Plus className="size-3.5" />
              Nova tarefa
            </Button>
          )}
        </div>
      </div>

      {ctx.readOnly && <p className="mb-3 text-xs text-text-muted">Acesso somente leitura.</p>}
      {erro && <p className="mb-2 text-sm text-red-600">{erro}</p>}

      {visao === "kanban" && (
        <KanbanBoard
          grupos={grupos}
          readOnly={ctx.readOnly}
          bloqueadas={bloqueadas}
          onOpen={abrir}
          onMove={(id, destino) => {
            const t = tarefas.find((x) => x.id === id);
            if (t) patch(t, patchDoGrupo(por, destino), "moveu");
          }}
          onCreate={criar}
        />
      )}
      {visao === "lista" && (
        <ListaView
          grupos={grupos}
          pessoas={pessoas}
          readOnly={ctx.readOnly}
          bloqueadas={bloqueadas}
          onOpen={abrir}
          onPatch={patch}
          onCreate={criar}
        />
      )}
      {visao === "tabela" && <TabelaView tarefas={filtradas} onOpen={abrir} />}
      {visao === "gantt" && (
        <GanttView
          tarefas={filtradas}
          projetos={ctx.projetos}
          readOnly={ctx.readOnly}
          onOpen={abrir}
          onPatch={patch}
        />
      )}

      <TarefaSheet
        open={sheet !== null}
        onOpenChange={(o) => {
          if (o) return;
          setSheet(null);
          if (params.has("tarefa")) {
            const p = new URLSearchParams(params.toString());
            p.delete("tarefa");
            router.replace(`${pathname}?${p.toString()}`, { scroll: false });
          }
        }}
        tarefa={aberta}
        novoStatus={sheet?.status ?? "backlog"}
        pessoas={pessoas}
        outras={tarefas}
        ctx={ctx}
      />
    </>
  );
}
