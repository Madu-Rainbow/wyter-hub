"use client";

import { Button } from "@front/components/ui/button";
import { createClient } from "@front/lib/supabase/client";
import { trabalhoHref } from "@front/lib/trabalho";
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  Copy,
  CopyPlus,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Link2,
  ListChecks,
  MoveRight,
  Paperclip,
  Pencil,
  Tag,
  ThumbsUp,
  Trash2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AnexarForm, CapaForm } from "./anexos-sec";
import { criarChecklist } from "./checklist-tab";
import { inputCls, ListaBusca, Popover } from "./modal-ui";
import {
  COR_ETIQUETA,
  type Ctx,
  type Etiqueta,
  type PessoaOpt,
  STATUS_OPTS,
  type Tarefa,
} from "./shared";

const ic = "size-4";

function MembrosForm({
  t,
  ctx,
  pessoas,
  onChange,
}: {
  t: Tarefa;
  ctx: Ctx;
  pessoas: PessoaOpt[];
  onChange: () => void;
}) {
  const [sel, setSel] = useState(() => new Set(t.membros.map((m) => m.id)));
  const [erro, setErro] = useState<string | null>(null);
  async function alterna(id: string) {
    const sb = createClient();
    const tem = sel.has(id);
    setSel((s) => {
      const n = new Set(s);
      if (tem) n.delete(id);
      else n.add(id);
      return n;
    });
    const { error } = tem
      ? await sb.from("tarefa_membro").delete().eq("tarefa_id", t.id).eq("pessoa_id", id)
      : await sb
          .from("tarefa_membro")
          .insert({ tarefa_id: t.id, pessoa_id: id, org_id: ctx.orgId });
    setErro(error?.message ?? null);
    onChange();
  }
  return (
    <>
      <ListaBusca itens={pessoas} marcados={sel} onToggle={alterna} placeholder="Buscar membros" />
      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </>
  );
}

function EtiquetasForm({ t, ctx, onChange }: { t: Tarefa; ctx: Ctx; onChange: () => void }) {
  const [todas, setTodas] = useState<Etiqueta[]>([]);
  const [sel, setSel] = useState(() => new Set(t.etiquetas.map((m) => m.id)));
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("azul");
  const [erro, setErro] = useState<string | null>(null);
  const sb = createClient();
  const carregar = useCallback(async () => {
    const { data } = await createClient()
      .from("etiqueta")
      .select("id, nome, cor")
      .or(`projeto_id.is.null,projeto_id.eq.${t.projeto_id}`)
      .order("nome");
    setTodas(data ?? []);
  }, [t.projeto_id]);
  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function alterna(id: string) {
    const tem = sel.has(id);
    setSel((s) => {
      const n = new Set(s);
      if (tem) n.delete(id);
      else n.add(id);
      return n;
    });
    const { error } = tem
      ? await sb.from("tarefa_etiqueta").delete().eq("tarefa_id", t.id).eq("etiqueta_id", id)
      : await sb
          .from("tarefa_etiqueta")
          .insert({ tarefa_id: t.id, etiqueta_id: id, org_id: ctx.orgId });
    setErro(error?.message ?? null);
    onChange();
  }
  async function criar() {
    if (!nome.trim()) return;
    const { error } = await sb
      .from("etiqueta")
      .insert({ nome: nome.trim(), cor, org_id: ctx.orgId, projeto_id: t.projeto_id });
    setErro(error?.message ?? null);
    setNome("");
    await carregar();
  }
  return (
    <div className="space-y-3">
      <ListaBusca
        itens={todas.map((e) => ({
          id: e.id,
          nome: e.nome,
          chip: COR_ETIQUETA[e.cor] ?? COR_ETIQUETA.azul,
        }))}
        marcados={sel}
        onToggle={alterna}
        placeholder="Buscar etiquetas"
        acao={(i) => (
          <>
            <button
              type="button"
              aria-label={`Renomear ${i.nome}`}
              className="text-text-muted hover:text-text"
              onClick={async () => {
                const n = window.prompt("Nome da etiqueta", i.nome)?.trim();
                if (!n) return;
                const { error } = await sb.from("etiqueta").update({ nome: n }).eq("id", i.id);
                setErro(error?.message ?? null);
                await carregar();
                onChange();
              }}
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label={`Excluir ${i.nome}`}
              className="text-text-muted hover:text-red-600"
              onClick={async () => {
                if (!window.confirm(`Excluir a etiqueta "${i.nome}" de todas as tarefas?`)) return;
                const { error } = await sb.from("etiqueta").delete().eq("id", i.id);
                setErro(error?.message ?? null);
                await carregar();
                onChange();
              }}
            >
              <Trash2 className="size-3.5" />
            </button>
          </>
        )}
      />
      <div className="space-y-1.5 border-t border-border pt-3">
        <input
          aria-label="Nome da nova etiqueta"
          placeholder="Nova etiqueta"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className={inputCls}
        />
        <div className="flex gap-2">
          <select
            aria-label="Cor"
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            className={inputCls}
          >
            {Object.keys(COR_ETIQUETA).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <Button size="sm" disabled={!nome.trim()} onClick={() => void criar()}>
            Criar
          </Button>
        </div>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  );
}

const TZ_OFFSET = "-04:00"; // America/Cuiaba (sem horario de verao)
const paraLocal = (iso: string | null) =>
  iso
    ? new Date(iso)
        .toLocaleString("sv-SE", { timeZone: "America/Cuiaba" })
        .slice(0, 16)
        .replace(" ", "T")
    : "";

function DatasForm({ t, onSalvar }: { t: Tarefa; onSalvar: (p: Partial<Tarefa>) => void }) {
  const [ini, setIni] = useState(t.data_inicio?.slice(0, 10) ?? "");
  const [fim, setFim] = useState(t.data_prazo?.slice(0, 10) ?? "");
  const [hora, setHora] = useState(t.prazo_hora?.slice(0, 5) ?? "");
  const [lem, setLem] = useState(paraLocal(t.lembrete_em));
  const [erro, setErro] = useState<string | null>(null);
  function salvar() {
    if (ini && fim && ini > fim) return setErro("O início não pode ser depois da entrega.");
    if (hora && !fim) return setErro("Informe a data de entrega para usar hora.");
    onSalvar({
      data_inicio: ini || null,
      data_prazo: fim || null,
      prazo_hora: hora ? `${hora}:00` : null,
      lembrete_em: lem ? new Date(`${lem}:00${TZ_OFFSET}`).toISOString() : null,
    });
  }
  return (
    <div className="space-y-2">
      <label className="block text-xs">
        Início
        <input
          type="date"
          value={ini}
          onChange={(e) => setIni(e.target.value)}
          className={inputCls}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs">
          Entrega
          <input
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block text-xs">
          Hora
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>
      <label className="block text-xs">
        Lembrete
        <input
          type="datetime-local"
          value={lem}
          onChange={(e) => setLem(e.target.value)}
          className={inputCls}
        />
      </label>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={salvar}>
          Salvar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            onSalvar({ data_inicio: null, data_prazo: null, prazo_hora: null, lembrete_em: null })
          }
        >
          Remover
        </Button>
      </div>
    </div>
  );
}

function ChecklistForm({ t, ctx, onDone }: { t: Tarefa; ctx: Ctx; onDone: () => void }) {
  const [titulo, setTitulo] = useState("Checklist");
  const [erro, setErro] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <input
        aria-label="Título da checklist"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        className={inputCls}
      />
      <Button
        size="sm"
        onClick={async () => {
          const e = await criarChecklist(ctx, t.id, titulo);
          setErro(e);
          if (!e) onDone();
        }}
      >
        Adicionar
      </Button>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  );
}

function MoverForm({
  t,
  ctx,
  onMover,
}: {
  t: Tarefa;
  ctx: Ctx;
  onMover: (projetoId: string, status: string) => void;
}) {
  const [proj, setProj] = useState(t.projeto_id);
  const [st, setSt] = useState(t.status);
  return (
    <div className="space-y-2">
      <label className="block text-xs">
        Projeto
        <select
          value={proj}
          disabled={!!t.parent_id}
          onChange={(e) => setProj(e.target.value)}
          className={inputCls}
        >
          {ctx.projetos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.chave} · {p.nome} ({p.clienteNome})
            </option>
          ))}
        </select>
      </label>
      {t.parent_id && (
        <p className="text-xs text-text-muted">Subtarefa acompanha o projeto da tarefa mãe.</p>
      )}
      <label className="block text-xs">
        Coluna (status)
        <select value={st} onChange={(e) => setSt(e.target.value)} className={inputCls}>
          {STATUS_OPTS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <Button size="sm" onClick={() => onMover(proj, st)}>
        Mover
      </Button>
    </div>
  );
}

export function BarraLateral({
  t,
  ctx,
  pessoas,
  onChange,
  onSalvar,
  onCapa,
  onCopiar,
  onMover,
  onExcluir,
  onAnexado,
}: {
  t: Tarefa;
  ctx: Ctx;
  pessoas: PessoaOpt[];
  /** Recarrega secoes + lista (router.refresh). */
  onChange: () => void;
  onSalvar: (p: Partial<Tarefa>) => void;
  onCapa: (id: string | null) => void;
  onCopiar: () => void;
  onMover: (projetoId: string, status: string) => void;
  onExcluir: () => void;
  onAnexado: () => void;
}) {
  const ro = ctx.readOnly;
  const [seg, setSeg] = useState({ n: 0, eu: false });
  const [vot, setVot] = useState({ n: 0, eu: false });
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarSV = useCallback(async () => {
    const sb = createClient();
    const [s, v] = await Promise.all([
      sb.from("tarefa_seguidor").select("pessoa_id").eq("tarefa_id", t.id),
      sb.from("tarefa_voto").select("pessoa_id").eq("tarefa_id", t.id),
    ]);
    setSeg({ n: s.data?.length ?? 0, eu: !!s.data?.some((x) => x.pessoa_id === ctx.meId) });
    setVot({ n: v.data?.length ?? 0, eu: !!v.data?.some((x) => x.pessoa_id === ctx.meId) });
  }, [t.id, ctx.meId]);
  useEffect(() => {
    void carregarSV();
  }, [carregarSV]);

  async function alternar(tab: "tarefa_seguidor" | "tarefa_voto", eu: boolean) {
    if (!ctx.meId) return;
    const sb = createClient();
    const { error } = eu
      ? await sb.from(tab).delete().eq("tarefa_id", t.id).eq("pessoa_id", ctx.meId)
      : await sb.from(tab).insert({ tarefa_id: t.id, pessoa_id: ctx.meId, org_id: ctx.orgId });
    setErro(error?.message ?? null);
    await carregarSV();
  }

  const titulo =
    "mb-1 mt-3 text-xs font-medium uppercase tracking-wider text-text-muted first:mt-0";
  return (
    <div className="space-y-1.5">
      {!ro && (
        <>
          <h3 className={titulo}>Adicionar</h3>
          <Popover rotulo="Membros" titulo="Membros" icone={<Users className={ic} />}>
            {() => <MembrosForm t={t} ctx={ctx} pessoas={pessoas} onChange={onChange} />}
          </Popover>
          <Popover rotulo="Etiquetas" titulo="Etiquetas" icone={<Tag className={ic} />}>
            {() => <EtiquetasForm t={t} ctx={ctx} onChange={onChange} />}
          </Popover>
          <Popover
            rotulo="Checklist"
            titulo="Adicionar checklist"
            icone={<ListChecks className={ic} />}
          >
            {(fechar) => (
              <ChecklistForm
                t={t}
                ctx={ctx}
                onDone={() => {
                  fechar();
                  onChange();
                }}
              />
            )}
          </Popover>
          <Popover rotulo="Datas" titulo="Datas" icone={<CalendarDays className={ic} />}>
            {(fechar) => (
              <DatasForm
                t={t}
                onSalvar={(p) => {
                  onSalvar(p);
                  fechar();
                }}
              />
            )}
          </Popover>
          <Popover rotulo="Anexo" titulo="Anexar" icone={<Paperclip className={ic} />}>
            {(fechar) => (
              <AnexarForm
                tarefa={t}
                ctx={ctx}
                onDone={() => {
                  fechar();
                  onAnexado();
                }}
              />
            )}
          </Popover>
          <Popover rotulo="Capa" titulo="Capa" icone={<ImageIcon className={ic} />}>
            {(fechar) => (
              <CapaForm
                tarefa={t}
                onEscolher={(id) => {
                  onCapa(id);
                  fechar();
                }}
              />
            )}
          </Popover>
        </>
      )}

      <h3 className={titulo}>Ações</h3>
      {!ro && (
        <>
          <button
            type="button"
            className="inline-flex w-full items-center gap-2 rounded-md bg-secondary px-2.5 py-1.5 text-left text-sm hover:bg-secondary/70"
            onClick={onCopiar}
          >
            <CopyPlus className={ic} />
            Copiar tarefa
          </button>
          <Popover rotulo="Mover" titulo="Mover tarefa" icone={<MoveRight className={ic} />}>
            {(fechar) => (
              <MoverForm
                t={t}
                ctx={ctx}
                onMover={(p, s) => {
                  fechar();
                  onMover(p, s);
                }}
              />
            )}
          </Popover>
        </>
      )}
      <button
        type="button"
        className="inline-flex w-full items-center gap-2 rounded-md bg-secondary px-2.5 py-1.5 text-left text-sm hover:bg-secondary/70"
        onClick={async () => {
          const u = `${window.location.origin}${trabalhoHref({ projeto: t.projeto_id, tarefa: t.chave })}`;
          await navigator.clipboard.writeText(u);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1500);
        }}
      >
        {copiado ? <Copy className={ic} /> : <Link2 className={ic} />}
        {copiado ? "Link copiado" : "Copiar link"}
      </button>
      {!ro && (
        <>
          <button
            type="button"
            aria-pressed={seg.eu}
            className="inline-flex w-full items-center gap-2 rounded-md bg-secondary px-2.5 py-1.5 text-left text-sm hover:bg-secondary/70 aria-pressed:bg-accent/15"
            onClick={() => void alternar("tarefa_seguidor", seg.eu)}
          >
            {seg.eu ? <EyeOff className={ic} /> : <Eye className={ic} />}
            {seg.eu ? "Deixar de seguir" : "Seguir"}
            <span className="ml-auto text-xs tabular-nums text-text-muted">{seg.n}</span>
          </button>
          <button
            type="button"
            aria-pressed={vot.eu}
            className="inline-flex w-full items-center gap-2 rounded-md bg-secondary px-2.5 py-1.5 text-left text-sm hover:bg-secondary/70 aria-pressed:bg-accent/15"
            onClick={() => void alternar("tarefa_voto", vot.eu)}
          >
            <ThumbsUp className={ic} />
            {vot.eu ? "Remover voto" : "Votar"}
            <span className="ml-auto text-xs tabular-nums text-text-muted">{vot.n}</span>
          </button>
          <button
            type="button"
            className="inline-flex w-full items-center gap-2 rounded-md bg-secondary px-2.5 py-1.5 text-left text-sm hover:bg-secondary/70"
            onClick={() =>
              onSalvar({ arquivada_em: t.arquivada_em ? null : new Date().toISOString() })
            }
          >
            {t.arquivada_em ? <ArchiveRestore className={ic} /> : <Archive className={ic} />}
            {t.arquivada_em ? "Restaurar" : "Arquivar"}
          </button>
          <button
            type="button"
            className="inline-flex w-full items-center gap-2 rounded-md bg-red-50 px-2.5 py-1.5 text-left text-sm text-red-700 hover:bg-red-100"
            onClick={onExcluir}
          >
            <Trash2 className={ic} />
            Excluir
          </button>
        </>
      )}
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
