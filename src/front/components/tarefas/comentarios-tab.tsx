"use client";

import { Button } from "@front/components/ui/button";
import { createClient } from "@front/lib/supabase/client";
import { norm } from "@front/lib/tarefas";
import { useCallback, useEffect, useRef, useState } from "react";
import { carregarEventos, type Ev, resumoEvento, rotuloVerbo } from "./atividade-tab";
import { Markdown } from "./markdown";
import { inputCls, Secao } from "./modal-ui";
import type { Ctx, PessoaOpt } from "./shared";
import { Avatar } from "./tarefa-card";

type Com = {
  id: string;
  texto: string;
  created_at: string;
  editado_em: string | null;
  parent_id: string | null;
  autor_id: string;
  autor: { nome: string } | null;
  reacoes: { emoji: string; pessoa_id: string }[];
};

export const fmtDataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Cuiaba",
    dateStyle: "short",
    timeStyle: "short",
  });

const EMOJIS = ["👍", "❤️", "🎉", "👀", "✅"];
type Modo = "comentarios" | "atividade" | "tudo";

const para = (texto: string, mapa: Map<string, string>) =>
  [...mapa].reduce((t, [nome, id]) => t.split(`@${nome}`).join(`@[${nome}](pessoa:${id})`), texto);
const de = (texto: string) => texto.replace(/@\[([^\]]+)\]\(pessoa:[0-9a-fA-F-]{36}\)/g, "@$1");

/** Editor com formatacao basica (Markdown) e @mencao com busca de pessoa. */
function Editor({
  pessoas,
  inicial = "",
  rotulo,
  onEnviar,
  onCancelar,
}: {
  pessoas: PessoaOpt[];
  inicial?: string;
  rotulo: string;
  onEnviar: (texto: string) => Promise<string | null>;
  onCancelar?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [txt, setTxt] = useState(de(inicial));
  const [mapa] = useState(() => new Map<string, string>());
  const [busca, setBusca] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sug =
    busca === null ? [] : pessoas.filter((p) => norm(p.nome).includes(norm(busca))).slice(0, 5);

  useEffect(() => {
    for (const p of pessoas)
      if (inicial.includes(`(pessoa:${p.id})`)) mapa.set(p.nome.replace(/[[\]]/g, ""), p.id);
  }, [pessoas, inicial, mapa]);

  function envolver(a: string, b = a) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    setTxt(txt.slice(0, s) + a + txt.slice(s, e) + b + txt.slice(e));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + a.length, e + a.length);
    });
  }
  function linhas(prefixo: string) {
    const el = ref.current;
    if (!el) return;
    const s = txt.lastIndexOf("\n", el.selectionStart - 1) + 1;
    setTxt(txt.slice(0, s) + prefixo + txt.slice(s));
  }
  function aoDigitar(v: string, pos: number) {
    setTxt(v);
    const m = /(?:^|\s)@([^\s@]*)$/.exec(v.slice(0, pos));
    setBusca(m ? m[1] : null);
  }
  function mencionar(p: PessoaOpt) {
    const el = ref.current;
    if (!el) return;
    const nome = p.nome.replace(/[[\]]/g, "");
    const pos = el.selectionStart;
    const ini = txt.slice(0, pos).lastIndexOf("@");
    mapa.set(nome, p.id);
    setTxt(`${txt.slice(0, ini)}@${nome} ${txt.slice(pos)}`);
    setBusca(null);
    el.focus();
  }
  async function enviar() {
    if (!txt.trim()) return;
    setBusy(true);
    const e = await onEnviar(para(txt.trim(), mapa));
    setBusy(false);
    setErro(e);
    if (!e) {
      setTxt("");
      onCancelar?.();
    }
  }
  const bt = "rounded px-2 py-0.5 text-xs text-text-muted hover:bg-secondary hover:text-text";

  return (
    <div className="relative space-y-1.5">
      <div className="flex flex-wrap gap-0.5" role="toolbar" aria-label="Formatação">
        <button
          type="button"
          className={`${bt} font-bold`}
          aria-label="Negrito"
          onClick={() => envolver("**")}
        >
          B
        </button>
        <button
          type="button"
          className={`${bt} italic`}
          aria-label="Itálico"
          onClick={() => envolver("*")}
        >
          I
        </button>
        <button type="button" className={bt} onClick={() => linhas("- ")}>
          Lista
        </button>
        <button type="button" className={bt} onClick={() => linhas("1. ")}>
          Numerada
        </button>
        <button type="button" className={`${bt} font-mono`} onClick={() => envolver("`")}>
          Código
        </button>
        <button type="button" className={bt} onClick={() => envolver("[", "](https://)")}>
          Link
        </button>
      </div>
      <textarea
        ref={ref}
        aria-label={rotulo}
        rows={3}
        value={txt}
        placeholder={rotulo}
        onChange={(e) => aoDigitar(e.target.value, e.target.selectionStart)}
        className={inputCls}
      />
      {busca !== null && sug.length > 0 && (
        <div className="absolute z-10 w-56 rounded-md border border-border bg-surface p-1 shadow-md">
          {sug.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => mencionar(p)}
              className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-secondary"
            >
              {p.nome}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy || !txt.trim()}
          onClick={() => void enviar()}
        >
          {busy ? "Enviando..." : "Salvar"}
        </Button>
        {onCancelar && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancelar}>
            Cancelar
          </Button>
        )}
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  );
}

/** Linha do tempo: comentarios (responder, editar, excluir, reagir) e atividade, com alternancia. */
export function LinhaDoTempo({
  tarefaId,
  ctx,
  pessoas,
  rev,
  onChange,
}: {
  tarefaId: string;
  ctx: Ctx;
  pessoas: PessoaOpt[];
  rev: number;
  onChange: () => void;
}) {
  const [modo, setModo] = useState<Modo>("tudo");
  const [coms, setComs] = useState<Com[] | null>(null);
  const [evs, setEvs] = useState<Ev[]>([]);
  const [resp, setResp] = useState<string | null>(null);
  const [edit, setEdit] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const podeComentar = !ctx.readOnly && !!ctx.meId;

  const carregar = useCallback(async () => {
    const [c, e] = await Promise.all([
      createClient()
        .from("comentario")
        .select(
          "id, texto, created_at, editado_em, parent_id, autor_id, autor:autor_id(nome), reacoes:comentario_reacao(emoji, pessoa_id)",
        )
        .eq("tarefa_id", tarefaId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      carregarEventos(tarefaId),
    ]);
    if (c.error) setErro(c.error.message);
    setComs((c.data ?? []) as unknown as Com[]);
    setEvs(e);
  }, [tarefaId]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: rev forca recarga
  useEffect(() => {
    void carregar();
  }, [carregar, rev]);

  async function depois(p: PromiseLike<{ error: { message: string } | null }>) {
    const { error } = await p;
    setErro(error?.message ?? null);
    await carregar();
    onChange();
    return error?.message ?? null;
  }
  const sb = createClient();
  const enviar = (texto: string, parent: string | null) =>
    depois(
      sb.from("comentario").insert({
        tarefa_id: tarefaId,
        texto,
        autor_id: ctx.meId as string,
        org_id: ctx.orgId,
        parent_id: parent,
      }),
    );
  function reagir(c: Com, emoji: string) {
    if (!ctx.meId || ctx.readOnly) return;
    const tem = c.reacoes.some((r) => r.emoji === emoji && r.pessoa_id === ctx.meId);
    void depois(
      tem
        ? sb
            .from("comentario_reacao")
            .delete()
            .eq("comentario_id", c.id)
            .eq("pessoa_id", ctx.meId)
            .eq("emoji", emoji)
        : sb
            .from("comentario_reacao")
            .insert({ comentario_id: c.id, pessoa_id: ctx.meId, org_id: ctx.orgId, emoji }),
    );
  }

  const raizes = (coms ?? []).filter((c) => !c.parent_id);
  const filhas = (id: string) => (coms ?? []).filter((c) => c.parent_id === id).reverse();
  type Item = { t: string; k: string; c?: Com; e?: Ev };
  const itens: Item[] = [
    ...(modo !== "atividade" ? raizes.map((c) => ({ t: c.created_at, k: c.id, c })) : []),
    ...(modo !== "comentarios"
      ? evs
          .filter((e) => modo === "atividade" || e.verbo !== "comentou")
          .map((e) => ({ t: e.quando, k: e.id, e }))
      : []),
  ].sort((a, b) => b.t.localeCompare(a.t));

  function comentario(c: Com, filho = false) {
    const minha = c.autor_id === ctx.meId;
    const cont = new Map<string, number>();
    for (const r of c.reacoes) cont.set(r.emoji, (cont.get(r.emoji) ?? 0) + 1);
    return (
      <div key={c.id} className={`flex gap-2 ${filho ? "ml-8 mt-2" : ""}`}>
        <Avatar nome={c.autor?.nome ?? "?"} />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs text-text-muted">
            <span className="font-medium text-text">{c.autor?.nome ?? "—"}</span> ·{" "}
            {fmtDataHora(c.created_at)}
            {c.editado_em && " · editado"}
          </p>
          {edit === c.id ? (
            <Editor
              pessoas={pessoas}
              inicial={c.texto}
              rotulo="Editar comentário"
              onEnviar={(t) =>
                depois(
                  sb
                    .from("comentario")
                    .update({ texto: t, editado_em: new Date().toISOString() })
                    .eq("id", c.id),
                )
              }
              onCancelar={() => setEdit(null)}
            />
          ) : (
            <div className="rounded-md border border-border bg-bg p-2">
              <Markdown texto={c.texto} />
            </div>
          )}
          {edit !== c.id && (
            <div className="flex flex-wrap items-center gap-1 text-xs text-text-muted">
              {[...cont].map(([emoji, n]) => (
                <button
                  key={emoji}
                  type="button"
                  disabled={!podeComentar}
                  onClick={() => reagir(c, emoji)}
                  aria-pressed={c.reacoes.some(
                    (r) => r.emoji === emoji && r.pessoa_id === ctx.meId,
                  )}
                  className="rounded border border-border px-1.5 py-0.5 tabular-nums aria-pressed:border-accent aria-pressed:bg-accent/10"
                >
                  {emoji} {n}
                </button>
              ))}
              {podeComentar &&
                EMOJIS.filter((x) => !cont.has(x)).map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    aria-label={`Reagir com ${emoji}`}
                    onClick={() => reagir(c, emoji)}
                    className="rounded px-1 opacity-50 hover:bg-secondary hover:opacity-100"
                  >
                    {emoji}
                  </button>
                ))}
              {podeComentar && !filho && (
                <button
                  type="button"
                  className="px-1 hover:underline"
                  onClick={() => setResp(c.id)}
                >
                  Responder
                </button>
              )}
              {minha && !ctx.readOnly && (
                <>
                  <button
                    type="button"
                    className="px-1 hover:underline"
                    onClick={() => setEdit(c.id)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="px-1 text-red-600 hover:underline"
                    onClick={() =>
                      window.confirm("Excluir este comentário?") &&
                      void depois(
                        sb
                          .from("comentario")
                          .update({ deleted_at: new Date().toISOString() })
                          .eq("id", c.id),
                      )
                    }
                  >
                    Excluir
                  </button>
                </>
              )}
            </div>
          )}
          {resp === c.id && (
            <Editor
              pessoas={pessoas}
              rotulo="Responder"
              onEnviar={(t) => enviar(t, c.id)}
              onCancelar={() => setResp(null)}
            />
          )}
          {!filho && filhas(c.id).map((f) => comentario(f, true))}
        </div>
      </div>
    );
  }

  return (
    <Secao
      titulo="Comentários e atividade"
      extra={
        <div
          className="inline-flex overflow-hidden rounded-md border border-border"
          role="toolbar"
          aria-label="Filtrar linha do tempo"
        >
          {(
            [
              ["tudo", "Tudo"],
              ["comentarios", "Comentários"],
              ["atividade", "Atividade"],
            ] as [Modo, string][]
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              aria-pressed={modo === k}
              onClick={() => setModo(k)}
              className={`px-2.5 py-1 text-xs ${modo === k ? "bg-accent text-primary-foreground" : "bg-surface text-text hover:bg-secondary"}`}
            >
              {l}
            </button>
          ))}
        </div>
      }
    >
      {podeComentar && (
        <Editor
          pessoas={pessoas}
          rotulo="Escreva um comentário (use @ para mencionar)"
          onEnviar={(t) => enviar(t, null)}
        />
      )}
      {coms === null && <p className="text-sm text-text-muted">Carregando...</p>}
      {coms && itens.length === 0 && (
        <p className="text-sm text-text-muted">Nada por aqui ainda.</p>
      )}
      <ul className="space-y-3">
        {itens.map((i) =>
          i.c ? (
            <li key={i.k}>{comentario(i.c)}</li>
          ) : i.e ? (
            <li key={i.k} className="border-l-2 border-border pl-3 text-sm">
              <p className="text-text">
                <span className="font-medium">{i.e.quem?.nome ?? "—"}</span>{" "}
                {rotuloVerbo(i.e.verbo)}
                {resumoEvento(i.e) && (
                  <span className="text-text-muted"> · {resumoEvento(i.e)}</span>
                )}
              </p>
              <p className="text-xs tabular-nums text-text-muted">{fmtDataHora(i.e.quando)}</p>
            </li>
          ) : null,
        )}
      </ul>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </Secao>
  );
}
