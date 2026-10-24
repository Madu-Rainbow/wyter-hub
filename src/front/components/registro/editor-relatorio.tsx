"use client";

import { Button } from "@front/components/ui/button";
import { mascarar, mesclar, SECOES, type Secoes, secoesParaTexto } from "@front/lib/registro-texto";
import { Check, Copy, FileDown, Mail, RefreshCw } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { regenerarSecoes, salvarRegistro } from "./acoes";

export type ItemRelatorio = {
  cliente_id: string;
  nome: string;
  titulo: string;
  /** Texto gerado agora pelas regras. */
  gerado: Secoes;
  /** Texto já salvo (editado), se houver. */
  salvo: Secoes | null;
};

const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function Corpo({ s }: { s: Secoes }) {
  return (
    <>
      {SECOES.map(([k, l]) => (
        <div key={k} className="mb-3">
          <h4 className="mb-1 text-sm font-semibold text-text">{l}</h4>
          {s[k]
            .split("\n")
            .filter(Boolean)
            .map((ln, i) =>
              ln.startsWith("- ") ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: linhas estáticas do texto
                <p key={i} className="pl-4 -indent-3 text-sm text-text">
                  {"• "}
                  {ln.slice(2)}
                </p>
              ) : (
                // biome-ignore lint/suspicious/noArrayIndexKey: linhas estáticas do texto
                <p key={i} className="text-sm text-text">
                  {ln}
                </p>
              ),
            )}
        </div>
      ))}
    </>
  );
}

function htmlDoc(docs: { titulo: string; s: Secoes }[]) {
  const corpo = docs
    .map(
      (d) =>
        `<section><h1>${esc(d.titulo)}</h1>${SECOES.map(
          ([k, l]) =>
            `<h2>${l}</h2>${d.s[k]
              .split("\n")
              .filter(Boolean)
              .map((ln) =>
                ln.startsWith("- ")
                  ? `<p class="li">• ${esc(ln.slice(2))}</p>`
                  : `<p>${esc(ln)}</p>`,
              )
              .join("")}`,
        ).join("")}</section>`,
    )
    .join("");
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Relatório</title><style>
body{font:12pt/1.45 Georgia,serif;color:#0e1726;margin:18mm}h1{font-size:16pt;margin:0 0 8pt}h2{font-size:11pt;text-transform:uppercase;letter-spacing:.05em;margin:12pt 0 3pt;color:#1b2a4a}
p{margin:2pt 0}.li{padding-left:14pt;text-indent:-10pt}section{page-break-after:always}section:last-child{page-break-after:auto}</style><body>${corpo}</body></html>`;
}

/** Editor lado a lado: seções editáveis, pré-visualização e ações. Nunca envia e-mail. */
export function EditorRelatorio({
  itens,
  data,
  dias,
  escopo,
  pessoaId,
  podeSalvar,
}: {
  itens: ItemRelatorio[];
  data: string;
  dias: 1 | 7 | 30;
  escopo: "meu" | "equipe";
  pessoaId?: string;
  podeSalvar: boolean;
}) {
  const [atual, setAtual] = useState(() =>
    Object.fromEntries(itens.map((i) => [i.cliente_id, i.salvo ?? i.gerado])),
  );
  const [base, setBase] = useState(() =>
    Object.fromEntries(itens.map((i) => [i.cliente_id, i.gerado])),
  );
  const [incl, setIncl] = useState(() => new Set(itens.map((i) => i.cliente_id)));
  const [sel, setSel] = useState(itens[0]?.cliente_id ?? "");
  const [msg, setMsg] = useState("");
  const [pend, start] = useTransition();

  const docs = useMemo(
    () =>
      itens
        .filter((i) => incl.has(i.cliente_id))
        .map((i) => ({ ...i, s: atual[i.cliente_id] as Secoes })),
    [itens, incl, atual],
  );
  const textoTodos = () => docs.map((d) => secoesParaTexto(d.titulo, d.s)).join("\n\n");

  if (itens.length === 0)
    return (
      <p className="p-4 text-sm text-text-muted">Sem atividade nem tarefas abertas no período.</p>
    );

  const item = itens.find((i) => i.cliente_id === sel) ?? itens[0];
  const editar = (k: keyof Secoes, v: string) => {
    setAtual((a) => ({ ...a, [item.cliente_id]: { ...a[item.cliente_id], [k]: v } }));
    setMsg("");
  };

  const regenerar = () =>
    start(async () => {
      const r = await Promise.all(
        docs.map(async (d) => ({
          id: d.cliente_id,
          r: await regenerarSecoes({
            cliente_id: d.cliente_id,
            data,
            dias,
            escopo,
            pessoa_id: pessoaId,
          }),
        })),
      );
      const novoAtual = { ...atual };
      const novaBase = { ...base };
      for (const { id, r: res } of r)
        if (res.secoes) {
          novoAtual[id] = mesclar(atual[id], base[id], res.secoes);
          novaBase[id] = res.secoes;
        }
      setAtual(novoAtual);
      setBase(novaBase);
      setMsg(r.some((x) => x.r.erro) ? "Falha ao regenerar" : "Regenerado (edições preservadas)");
    });

  const salvar = () =>
    start(async () => {
      const rs = await Promise.all(
        docs.map((d) =>
          salvarRegistro({ cliente_id: d.cliente_id, data, texto: secoesParaTexto(d.titulo, d.s) }),
        ),
      );
      setMsg(rs.find((x) => x.erro)?.erro ?? "Salvo no registro diário");
    });

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(textoTodos());
      setMsg("Copiado");
    } catch {
      setMsg("Não foi possível copiar");
    }
  };

  const pdf = () => {
    const w = window.open("", "_blank");
    if (!w) return setMsg("Libere pop-ups para baixar o PDF");
    w.document.write(htmlDoc(docs));
    w.document.close();
    w.focus();
    w.print();
  };

  // mailto abre o cliente de e-mail como rascunho; o envio é sempre manual.
  const mailto = `mailto:?subject=${encodeURIComponent(docs[0]?.titulo ?? "Relatório")}&body=${encodeURIComponent(
    mascarar(textoTodos()).slice(0, 1800),
  )}`;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" disabled={pend} onClick={regenerar}>
          <RefreshCw className="size-4" /> Regenerar
        </Button>
        {podeSalvar && dias === 1 && (
          <Button size="sm" disabled={pend || docs.length === 0} onClick={salvar}>
            <Check className="size-4" /> Salvar
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={copiar}>
          <Copy className="size-4" /> Copiar
        </Button>
        <Button size="sm" variant="outline" onClick={pdf} disabled={docs.length === 0}>
          <FileDown className="size-4" /> Baixar PDF
        </Button>
        <Button size="sm" variant="outline" asChild>
          <a href={mailto}>
            <Mail className="size-4" /> Rascunho de e-mail
          </a>
        </Button>
        <span role="status" className="text-xs text-text-muted">
          {msg}
        </span>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[12rem_minmax(0,1fr)_minmax(0,1fr)]">
        <ul className="min-h-0 space-y-1 overflow-y-auto rounded-md border border-border bg-surface p-2">
          {itens.map((i) => (
            <li key={i.cliente_id} className="flex items-center gap-2">
              <input
                type="checkbox"
                aria-label={`Incluir ${i.nome}`}
                checked={incl.has(i.cliente_id)}
                onChange={(e) =>
                  setIncl((s) => {
                    const n = new Set(s);
                    e.target.checked ? n.add(i.cliente_id) : n.delete(i.cliente_id);
                    return n;
                  })
                }
              />
              <button
                type="button"
                onClick={() => setSel(i.cliente_id)}
                className={`min-w-0 flex-1 truncate rounded px-2 py-1 text-left text-sm ${i.cliente_id === item.cliente_id ? "bg-secondary font-medium" : "hover:bg-secondary"}`}
              >
                {i.nome}
              </button>
            </li>
          ))}
        </ul>

        <div className="min-h-0 space-y-3 overflow-y-auto rounded-md border border-border bg-surface p-3">
          <h3 className="font-title text-base text-text">{item.titulo}</h3>
          {SECOES.map(([k, l]) => (
            <label key={k} className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-text-muted">
                {l}
              </span>
              <textarea
                value={atual[item.cliente_id][k]}
                onChange={(e) => editar(k, e.target.value)}
                rows={Math.min(14, Math.max(2, atual[item.cliente_id][k].split("\n").length + 1))}
                className="w-full resize-y rounded-md border border-input bg-bg p-2 text-sm text-text outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </label>
          ))}
        </div>

        <div className="min-h-0 overflow-y-auto rounded-md border border-border bg-surface p-4">
          {docs.length === 0 && (
            <p className="text-sm text-text-muted">Nenhum cliente selecionado.</p>
          )}
          {docs.map((d) => (
            <article key={d.cliente_id} className="mb-6 border-b border-border pb-4 last:border-0">
              <h3 className="mb-2 font-title text-lg text-text">{d.titulo}</h3>
              <Corpo s={d.s} />
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
