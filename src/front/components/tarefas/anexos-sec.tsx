"use client";

import { Button } from "@front/components/ui/button";
import { createClient } from "@front/lib/supabase/client";
import { fmtBytes, urlSegura } from "@front/lib/tarefas";
import { FileText, Link2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { fmtDataHora } from "./comentarios-tab";
import { inputCls, Secao } from "./modal-ui";
import type { Ctx, Tarefa } from "./shared";

const MAX = 25 * 1024 * 1024;
const TIPOS = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

type Anexo = {
  id: string;
  nome_arquivo: string;
  url_ou_caminho: string;
  tipo_arquivo: string | null;
  tamanho_bytes: number | null;
  eh_arquivo: boolean;
  created_at: string;
  /** URL assinada (arquivo) ou link validado (http/https). */
  href: string | null;
};

async function listar(tarefaId: string): Promise<Anexo[]> {
  const sb = createClient();
  const { data } = await sb
    .from("anexo")
    .select("id, nome_arquivo, url_ou_caminho, tipo_arquivo, tamanho_bytes, eh_arquivo, created_at")
    .eq("entidade_tipo", "tarefa")
    .eq("entidade_id", tarefaId)
    .order("created_at", { ascending: false });
  const itens = (data ?? []) as Omit<Anexo, "href">[];
  const caminhos = itens.filter((a) => a.eh_arquivo).map((a) => a.url_ou_caminho);
  const assin = caminhos.length
    ? (await sb.storage.from("anexos").createSignedUrls(caminhos, 3600)).data
    : [];
  const mapa = new Map((assin ?? []).map((s) => [s.path, s.signedUrl]));
  return itens.map((a) => ({
    ...a,
    href: a.eh_arquivo ? (mapa.get(a.url_ou_caminho) ?? null) : urlSegura(a.url_ou_caminho),
  }));
}

const ehImagem = (a: Anexo) => a.eh_arquivo && !!a.tipo_arquivo?.startsWith("image/");

export function AnexosSec({
  tarefa,
  ctx,
  rev,
  onChange,
  onCapa,
}: {
  tarefa: Tarefa;
  ctx: Ctx;
  rev: number;
  onChange: () => void;
  onCapa: (id: string | null) => void;
}) {
  const [lista, setLista] = useState<Anexo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const carregar = useCallback(async () => setLista(await listar(tarefa.id)), [tarefa.id]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: rev forca recarga
  useEffect(() => {
    void carregar();
  }, [carregar, rev]);

  async function excluir(a: Anexo) {
    if (!window.confirm(`Excluir o anexo "${a.nome_arquivo}"?`)) return;
    const sb = createClient();
    if (a.eh_arquivo) await sb.storage.from("anexos").remove([a.url_ou_caminho]);
    const { error } = await sb.from("anexo").delete().eq("id", a.id);
    setErro(error?.message ?? null);
    await carregar();
    onChange();
  }

  if (!lista?.length) return erro ? <p className="text-sm text-red-600">{erro}</p> : null;
  return (
    <Secao titulo="Anexos">
      <ul className="space-y-2">
        {lista.map((a) => (
          <li key={a.id} className="flex items-center gap-3">
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded bg-secondary">
              {ehImagem(a) && a.href ? (
                // biome-ignore lint/performance/noImgElement: URL assinada do Storage
                <img src={a.href} alt={a.nome_arquivo} className="size-full object-cover" />
              ) : a.eh_arquivo ? (
                <FileText className="size-6 text-text-muted" />
              ) : (
                <Link2 className="size-6 text-text-muted" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              {a.href ? (
                <a
                  href={a.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-sm font-medium text-accent hover:underline"
                >
                  {a.nome_arquivo}
                </a>
              ) : (
                <span className="block truncate text-sm font-medium">{a.nome_arquivo}</span>
              )}
              <p className="text-xs tabular-nums text-text-muted">
                {fmtDataHora(a.created_at)} {fmtBytes(a.tamanho_bytes)}
                {tarefa.capa_anexo_id === a.id && " · Capa"}
              </p>
            </div>
            {!ctx.readOnly && (
              <div className="flex items-center gap-1">
                {ehImagem(a) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onCapa(tarefa.capa_anexo_id === a.id ? null : a.id)}
                  >
                    {tarefa.capa_anexo_id === a.id ? "Remover capa" : "Tornar capa"}
                  </Button>
                )}
                <button
                  type="button"
                  aria-label="Excluir anexo"
                  onClick={() => void excluir(a)}
                  className="text-text-muted hover:text-red-600"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </Secao>
  );
}

/** Conteudo do popover "Anexo": arquivo (bucket privado "anexos") ou link http/https. */
export function AnexarForm({
  tarefa,
  ctx,
  onDone,
}: {
  tarefa: Tarefa;
  ctx: Ctx;
  onDone: () => void;
}) {
  const [link, setLink] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function arquivo(f: File) {
    if (f.size > MAX) return setErro("Arquivo acima de 25 MB.");
    if (!TIPOS.has(f.type)) return setErro("Tipo de arquivo não permitido.");
    setBusy(true);
    const sb = createClient();
    const path = `${ctx.orgId}/${tarefa.id}/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]+/g, "_")}`;
    const up = await sb.storage.from("anexos").upload(path, f, { contentType: f.type });
    if (up.error) {
      setBusy(false);
      return setErro(up.error.message);
    }
    const { error } = await sb.from("anexo").insert({
      org_id: ctx.orgId,
      entidade_tipo: "tarefa",
      entidade_id: tarefa.id,
      nome_arquivo: f.name,
      url_ou_caminho: path,
      tipo_arquivo: f.type,
      tamanho_bytes: f.size,
      eh_arquivo: true,
      autor_id: ctx.meId,
    });
    setBusy(false);
    if (error) {
      await sb.storage.from("anexos").remove([path]);
      return setErro(error.message);
    }
    onDone();
  }

  async function anexarLink() {
    const u = urlSegura(link);
    if (!u) return setErro("O link deve começar com http:// ou https://.");
    setBusy(true);
    const { error } = await createClient()
      .from("anexo")
      .insert({
        org_id: ctx.orgId,
        entidade_tipo: "tarefa",
        entidade_id: tarefa.id,
        nome_arquivo: nome.trim() || u,
        url_ou_caminho: u,
        tipo_arquivo: "link",
        eh_arquivo: false,
        autor_id: ctx.meId,
      });
    setBusy(false);
    if (error) return setErro(error.message);
    onDone();
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        Enviar arquivo (até 25 MB)
        <input
          type="file"
          disabled={busy}
          accept={[...TIPOS].join(",")}
          onChange={(e) => e.target.files?.[0] && void arquivo(e.target.files[0])}
          className="mt-1 block w-full text-xs"
        />
      </label>
      <div className="space-y-1.5 border-t border-border pt-3">
        <input
          aria-label="Link"
          placeholder="https://..."
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className={inputCls}
        />
        <input
          aria-label="Nome do link"
          placeholder="Nome (opcional)"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className={inputCls}
        />
        <Button size="sm" disabled={busy || !link.trim()} onClick={() => void anexarLink()}>
          Anexar link
        </Button>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  );
}

/** Conteudo do popover "Capa": escolhe entre as imagens anexadas. */
export function CapaForm({
  tarefa,
  onEscolher,
}: {
  tarefa: Tarefa;
  onEscolher: (id: string | null) => void;
}) {
  const [lista, setLista] = useState<Anexo[] | null>(null);
  useEffect(() => {
    void listar(tarefa.id).then((l) => setLista(l.filter(ehImagem)));
  }, [tarefa.id]);
  if (!lista) return <p className="text-sm text-text-muted">Carregando...</p>;
  return (
    <div className="space-y-2">
      {lista.length === 0 && <p className="text-sm text-text-muted">Anexe uma imagem primeiro.</p>}
      <div className="grid grid-cols-3 gap-2">
        {lista.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onEscolher(a.id)}
            aria-label={`Usar ${a.nome_arquivo} como capa`}
            aria-pressed={tarefa.capa_anexo_id === a.id}
            className={`aspect-video overflow-hidden rounded border-2 ${tarefa.capa_anexo_id === a.id ? "border-accent" : "border-transparent"}`}
          >
            {/* biome-ignore lint/performance/noImgElement: URL assinada do Storage */}
            <img src={a.href ?? ""} alt="" className="size-full object-cover" />
          </button>
        ))}
      </div>
      {tarefa.capa_anexo_id && (
        <Button size="sm" variant="ghost" onClick={() => onEscolher(null)}>
          Remover capa
        </Button>
      )}
    </div>
  );
}
