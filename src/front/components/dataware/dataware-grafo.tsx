"use client";

import { Button } from "@front/components/ui/button";
import { Combobox } from "@front/components/ui/combobox";
import { Input } from "@front/components/ui/input";
import {
  COR,
  type DwAresta,
  type DwGrafo,
  type DwNo,
  paraNo,
  rotaDoNo,
  TIPO_LABEL,
  TIPOS,
} from "@front/lib/dataware";
import { createClient } from "@front/lib/supabase/client";
import { ExternalLink, Search, SlidersHorizontal, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

// biome-ignore lint/suspicious/noExplicitAny: nós do d3-force são mutáveis e ganham x/y/vx/vy
type Obj = any;
type Filtros = {
  cliente: string;
  contrato: string;
  projeto: string;
  pessoa: string;
  status: string;
  de: string;
  ate: string;
};
const VAZIO: Filtros = {
  cliente: "",
  contrato: "",
  projeto: "",
  pessoa: "",
  status: "",
  de: "",
  ate: "",
};

// nodeLabel da lib vira innerHTML: escapar dados do usuario.
const esc = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function mesclar(prev: { nos: Map<string, DwNo>; arestas: Map<string, DwAresta> }, g: DwGrafo) {
  const nos = new Map(prev.nos);
  const arestas = new Map(prev.arestas);
  for (const n of g.nos) if (!nos.has(n.id)) nos.set(n.id, n);
  for (const a of g.arestas) arestas.set(`${a.origem}|${a.destino}|${a.relacao}`, a);
  return { nos, arestas };
}

export function DatawareGrafo({
  nosIniciais,
  arestasIniciais,
}: {
  nosIniciais: DwNo[];
  arestasIniciais: DwAresta[];
}) {
  const [dados, setDados] = useState(() =>
    mesclar({ nos: new Map(), arestas: new Map() }, { nos: nosIniciais, arestas: arestasIniciais }),
  );
  const [selId, setSelId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [remotos, setRemotos] = useState<DwNo[]>([]);
  const [f, setF] = useState<Filtros>(VAZIO);
  const [ocultos, setOcultos] = useState<Set<string>>(new Set());
  const [solo, setSolo] = useState(false);
  const [prof, setProf] = useState(1);
  const [erro, setErro] = useState("");
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [painel, setPainel] = useState(false);
  const [tam, setTam] = useState({ w: 600, h: 400 });
  const caixa = useRef<HTMLDivElement>(null);
  const fg = useRef<Obj>(null);
  const objs = useRef(new Map<string, Obj>());
  const expandidos = useRef(new Set<string>());
  const sb = useMemo(() => createClient(), []);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setTam({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const grau = useMemo(() => {
    const g = new Map<string, number>();
    for (const a of dados.arestas.values()) {
      g.set(a.origem, (g.get(a.origem) ?? 0) + 1);
      g.set(a.destino, (g.get(a.destino) ?? 0) + 1);
    }
    return g;
  }, [dados]);

  const vizinhos = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const a of dados.arestas.values()) {
      if (!dados.nos.has(a.origem) || !dados.nos.has(a.destino)) continue;
      m.get(a.origem)?.add(a.destino) ?? m.set(a.origem, new Set([a.destino]));
      m.get(a.destino)?.add(a.origem) ?? m.set(a.destino, new Set([a.origem]));
    }
    return m;
  }, [dados]);

  const visiveis = useMemo(() => {
    if (!solo || !selId) return new Set(dados.nos.keys());
    const vis = new Set([selId]);
    let borda = [selId];
    for (let d = 0; d < prof; d++) {
      const prox: string[] = [];
      for (const id of borda)
        for (const v of vizinhos.get(id) ?? [])
          if (!vis.has(v)) {
            vis.add(v);
            prox.push(v);
          }
      borda = prox;
    }
    return vis;
  }, [dados, solo, selId, prof, vizinhos]);

  const graphData = useMemo(() => {
    const nodes: Obj[] = [];
    for (const id of visiveis) {
      const n = dados.nos.get(id);
      if (!n) continue;
      let o = objs.current.get(id);
      if (!o) {
        o = { id };
        objs.current.set(id, o);
      }
      o.no = n;
      nodes.push(o);
    }
    const links = [...dados.arestas.values()]
      .filter(
        (a) =>
          visiveis.has(a.origem) &&
          visiveis.has(a.destino) &&
          dados.nos.has(a.origem) &&
          dados.nos.has(a.destino),
      )
      .map((a) => ({ source: a.origem, target: a.destino, relacao: a.relacao }));
    return { nodes, links };
  }, [dados, visiveis]);

  const lista = useMemo(() => [...dados.nos.values()], [dados]);
  const opcoes = (tipo: string) =>
    lista.filter((n) => n.tipo === tipo).sort((a, b) => a.rotulo.localeCompare(b.rotulo));
  const statusOpc = useMemo(
    () => [...new Set(lista.map((n) => n.status).filter(Boolean))].sort() as string[],
    [lista],
  );

  const casa = useCallback(
    (n: DwNo): boolean => {
      if (ocultos.has(n.tipo)) return false;
      const at = n.atributos;
      if (f.cliente && n.cliente_id !== f.cliente) return false;
      if (f.contrato && n.id !== f.contrato && at.contrato_id !== f.contrato) return false;
      if (f.projeto && n.id !== f.projeto && at.projeto_id !== f.projeto) return false;
      if (f.pessoa && n.id !== f.pessoa && at.responsavel_id !== f.pessoa) return false;
      if (f.status && n.status !== f.status) return false;
      if (n.tipo === "evento" && (f.de || f.ate)) {
        const q = String(at.quando ?? "").slice(0, 10);
        if ((f.de && q < f.de) || (f.ate && q > f.ate)) return false;
      }
      const q = busca.trim().toLowerCase();
      if (q && !`${n.rotulo} ${JSON.stringify(at)}`.toLowerCase().includes(q)) return false;
      return true;
    },
    [f, ocultos, busca],
  );
  const filtrando = busca.trim() !== "" || ocultos.size > 0 || Object.values(f).some(Boolean);
  const casando = useMemo(() => {
    const s = new Set<string>();
    for (const n of lista) if (casa(n)) s.add(n.id);
    // pessoa sem cliente_id: casa se algum vizinho casa
    if (f.cliente || f.contrato || f.projeto) {
      for (const n of lista)
        if (n.tipo === "pessoa" && !ocultos.has("pessoa"))
          for (const v of vizinhos.get(n.id) ?? []) if (s.has(v)) s.add(n.id);
    }
    return s;
  }, [lista, casa, f, ocultos, vizinhos]);

  const resultados = useMemo(() => {
    const loc = lista.filter((n) => casando.has(n.id));
    const ids = new Set(loc.map((n) => n.id));
    return [...loc, ...remotos.filter((n) => !ids.has(n.id))].slice(0, 50);
  }, [lista, casando, remotos]);

  // Busca remota: acha nós ainda não carregados (tarefas, dossiês...), FR-008-09.
  useEffect(() => {
    const q = busca.trim();
    if (q.length < 2) return setRemotos([]);
    const t = setTimeout(async () => {
      const { data } = await sb
        .from("dw_no")
        .select("*")
        .ilike("rotulo", `%${q.replace(/[%_]/g, "")}%`)
        .limit(20);
      setRemotos((data ?? []).map(paraNo));
    }, 250);
    return () => clearTimeout(t);
  }, [busca, sb]);

  async function expandir(id: string, p = 1) {
    const chave = `${id}:${p}`;
    if (expandidos.current.has(chave)) return;
    expandidos.current.add(chave);
    const { data, error } = await sb.rpc("dw_vizinhanca", { no_id: id, profundidade: p });
    if (error) {
      expandidos.current.delete(chave);
      return setErro("Não foi possível carregar as conexões.");
    }
    setErro("");
    const g = data as unknown as DwGrafo;
    setDados((prev) => mesclar(prev, g));
  }

  function centralizar(id: string) {
    const o = objs.current.get(id);
    if (o?.x === undefined) return;
    fg.current?.centerAt(o.x, o.y, 600);
    fg.current?.zoom(3, 600);
  }

  function escolher(n: DwNo) {
    setDados((prev) => mesclar(prev, { nos: [n], arestas: [] }));
    setSelId(n.id);
    setPainel(true);
    expandir(n.id, solo ? prof : 1).then(() => setTimeout(() => centralizar(n.id), 400));
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: expandir só usa refs e setters
  useEffect(() => {
    if (solo && selId) expandir(selId, prof);
  }, [solo, selId, prof]);

  async function carregarLogs() {
    const { data, error } = await sb.rpc("dw_eventos", {
      p_pessoa: f.pessoa || undefined,
      p_cliente: f.cliente || undefined,
      p_de: f.de ? `${f.de}T00:00:00-04:00` : undefined,
      p_ate: f.ate ? `${f.ate}T23:59:59-04:00` : undefined,
      p_limite: 100,
    });
    if (error) return setErro("Não foi possível carregar os logs.");
    setErro("");
    setDados((prev) => mesclar(prev, data as unknown as DwGrafo));
  }

  const selNo = selId ? dados.nos.get(selId) : undefined;
  const caminho = useMemo(() => {
    const out: DwNo[] = [];
    let cur = selId;
    const pai = new Map<string, string>();
    for (const a of dados.arestas.values())
      if (["contrato", "projeto", "subprojeto", "tarefa", "subtarefa"].includes(a.relacao))
        pai.set(a.destino, a.origem);
    while (cur && pai.has(cur) && out.length < 8) {
      cur = pai.get(cur) ?? null;
      const n = cur ? dados.nos.get(cur) : undefined;
      if (n) out.unshift(n);
    }
    // contrato sem projeto no caminho: completa com o cliente
    const topo = out[0] ?? selNo;
    if (topo && topo.tipo !== "cliente" && topo.cliente_id) {
      const c = dados.nos.get(topo.cliente_id);
      if (c && !out.includes(c)) out.unshift(c);
    }
    return out;
  }, [selId, dados, selNo]);

  const setV = (k: keyof Filtros) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const set = (k: keyof Filtros) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV(k)(e.target.value);
  const sob = (id: string) => dados.nos.get(id);
  const raio = (id: string) => 3 + Math.sqrt(grau.get(id) ?? 0) * 1.6;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-[clamp(0.5rem,1vh,0.75rem)]">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1 sm:max-w-72">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-text-muted" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar no grafo"
            aria-label="Buscar no grafo"
            className="pl-8"
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          aria-expanded={filtrosAbertos}
          onClick={() => setFiltrosAbertos((v) => !v)}
        >
          <SlidersHorizontal className="size-4" /> Filtros{filtrando ? " *" : ""}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="lg:hidden"
          aria-expanded={painel}
          onClick={() => setPainel((v) => !v)}
        >
          Painel
        </Button>
      </div>
      <div
        className={`${filtrosAbertos ? "flex" : "hidden"} max-h-[30dvh] w-full flex-wrap items-center gap-2 overflow-y-auto`}
      >
        {(["cliente", "contrato", "projeto", "pessoa"] as const).map((t) => (
          <Combobox
            key={t}
            className="w-40"
            value={f[t]}
            onValueChange={setV(t)}
            placeholder={`${TIPO_LABEL[t]}: todos`}
            clearable
            aria-label={`Filtrar por ${TIPO_LABEL[t].toLowerCase()}`}
            options={opcoes(t).map((n) => ({ value: n.id, label: n.rotulo }))}
          />
        ))}
        <Combobox
          className="w-40"
          value={f.status}
          onValueChange={setV("status")}
          placeholder="Status: todos"
          clearable
          aria-label="Filtrar por status"
          options={statusOpc.map((v) => ({ value: v, label: v.replace(/_/g, " ") }))}
        />
        <Input
          type="date"
          value={f.de}
          onChange={set("de")}
          aria-label="Logs a partir de"
          className="w-36"
        />
        <Input
          type="date"
          value={f.ate}
          onChange={set("ate")}
          aria-label="Logs até"
          className="w-36"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={carregarLogs}
          disabled={!(f.pessoa || f.cliente || f.de || f.ate)}
          title="Exige pessoa, cliente ou período"
        >
          Carregar logs
        </Button>
        <label className="flex items-center gap-1.5 text-sm text-text">
          <input
            type="checkbox"
            checked={solo}
            disabled={!selId}
            onChange={(e) => setSolo(e.target.checked)}
          />
          Só vizinhança
        </label>
        <Combobox
          className="w-32"
          value={String(prof)}
          onValueChange={(v) => setProf(Number(v))}
          disabled={!solo}
          aria-label="Profundidade"
          options={[1, 2, 3].map((p) => ({ value: String(p), label: `Nível ${p}` }))}
        />
        {filtrando && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setF(VAZIO);
              setBusca("");
              setOcultos(new Set());
            }}
          >
            Limpar
          </Button>
        )}
        {erro && (
          <span role="alert" className="text-sm text-red-700">
            {erro}
          </span>
        )}
      </div>

      <div className="relative flex min-h-0 min-w-0 flex-1 gap-3">
        <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-md border border-border bg-surface">
          <div ref={caixa} className="absolute inset-0">
            <ForceGraph2D
              ref={fg}
              width={tam.w}
              height={tam.h}
              graphData={graphData}
              backgroundColor="#F7F7F5"
              cooldownTicks={120}
              nodeLabel={(n: Obj) => esc(`${TIPO_LABEL[n.no.tipo]}: ${n.no.rotulo}`)}
              linkColor={() => "#9aa3b2"}
              linkWidth={0.6}
              onNodeClick={(n: Obj) => escolher(n.no)}
              onNodeDragEnd={(n: Obj) => {
                n.fx = n.x; // fixa o nó ao soltar
                n.fy = n.y;
              }}
              onBackgroundClick={() => setSelId(null)}
              nodeCanvasObject={(n: Obj, ctx: CanvasRenderingContext2D, escala: number) => {
                const no = n.no as DwNo;
                const r = raio(no.id);
                const apagado = filtrando && !casando.has(no.id);
                ctx.globalAlpha = apagado ? 0.12 : 1;
                ctx.beginPath();
                ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
                ctx.fillStyle = COR[no.tipo] ?? "#888";
                ctx.fill();
                if (no.id === selId) {
                  ctx.lineWidth = 2 / escala;
                  ctx.strokeStyle = "#0E1726";
                  ctx.stroke();
                }
                if (
                  !apagado &&
                  (escala > 1.8 || no.id === selId || (filtrando && casando.has(no.id)))
                ) {
                  ctx.font = `${11 / escala}px sans-serif`;
                  ctx.fillStyle = "#0E1726";
                  ctx.textAlign = "center";
                  ctx.fillText(no.rotulo.slice(0, 28), n.x, n.y + r + 10 / escala);
                }
                ctx.globalAlpha = 1;
              }}
              nodePointerAreaPaint={(n: Obj, cor: string, ctx: CanvasRenderingContext2D) => {
                ctx.fillStyle = cor;
                ctx.beginPath();
                ctx.arc(n.x, n.y, raio(n.id) + 2, 0, 2 * Math.PI);
                ctx.fill();
              }}
            />
            <fieldset className="absolute bottom-2 left-2 flex max-w-[80%] flex-wrap gap-1 rounded-md border border-border bg-surface/95 p-1.5">
              <legend className="sr-only">Legenda e filtro por tipo</legend>
              {TIPOS.map((t) => (
                <Button
                  key={t.tipo}
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-pressed={!ocultos.has(t.tipo)}
                  onClick={() =>
                    setOcultos((p) => {
                      const s = new Set(p);
                      s.has(t.tipo) ? s.delete(t.tipo) : s.add(t.tipo);
                      return s;
                    })
                  }
                  className={ocultos.has(t.tipo) ? "opacity-40" : ""}
                >
                  <span className="size-2.5 rounded-full" style={{ background: t.cor }} />
                  {t.label}
                </Button>
              ))}
            </fieldset>
          </div>
        </div>

        <aside
          className={`${painel ? "flex" : "hidden"} absolute inset-y-0 right-0 z-10 min-h-0 w-[min(26rem,92%)] flex-col gap-3 overflow-y-auto rounded-md border border-border bg-surface p-[clamp(0.5rem,1vw,0.75rem)] shadow-lg lg:static lg:flex lg:w-[clamp(18rem,26vw,26rem)] lg:shrink-0 lg:shadow-none`}
        >
          <Button
            variant="ghost"
            size="sm"
            className="self-end lg:hidden"
            aria-label="Fechar painel"
            onClick={() => setPainel(false)}
          >
            <X className="size-4" />
          </Button>
          {selNo ? (
            <section aria-label="Nó selecionado" className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-text-muted">
                {TIPO_LABEL[selNo.tipo]}
              </p>
              <h2 className="font-title text-lg text-text">{selNo.rotulo}</h2>
              {caminho.length > 0 && (
                <p className="text-xs text-text-muted">
                  {[...caminho, selNo].map((n) => n.rotulo).join(" > ")}
                </p>
              )}
              <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm tabular-nums">
                {selNo.status && (
                  <>
                    <dt className="text-text-muted">Status</dt>
                    <dd>{selNo.status.replace(/_/g, " ")}</dd>
                  </>
                )}
                {Object.entries(selNo.atributos)
                  .filter(([k]) => !k.endsWith("_id") && k !== "chave")
                  .map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-text-muted">{k.replace(/_/g, " ")}</dt>
                      <dd className="break-words">{String(v)}</dd>
                    </div>
                  ))}
                {typeof selNo.atributos.responsavel_id === "string" && (
                  <>
                    <dt className="text-text-muted">responsável</dt>
                    <dd>{sob(selNo.atributos.responsavel_id)?.rotulo ?? "—"}</dd>
                  </>
                )}
              </dl>
              {rotaDoNo(selNo) && (
                <Link
                  href={rotaDoNo(selNo) as string}
                  className="inline-flex items-center gap-1 text-sm text-accent underline-offset-2 hover:underline"
                >
                  Abrir <ExternalLink className="size-3.5" />
                </Link>
              )}
              <h3 className="pt-1 text-xs font-medium uppercase tracking-wider text-text-muted">
                Conexões ({vizinhos.get(selNo.id)?.size ?? 0})
              </h3>
              <ul className="space-y-0.5">
                {[...(vizinhos.get(selNo.id) ?? [])].slice(0, 100).map((v) => {
                  const n = sob(v);
                  return n ? (
                    <li key={v}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => escolher(n)}
                        className="w-full justify-start px-1.5 font-normal"
                      >
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: COR[n.tipo] }}
                        />
                        <span className="truncate">{n.rotulo}</span>
                      </Button>
                    </li>
                  ) : null;
                })}
              </ul>
            </section>
          ) : (
            <p className="text-sm text-text-muted">
              Clique em um nó para ver os dados e carregar as conexões.
            </p>
          )}
          <section aria-label="Lista de nós" className="border-t border-border pt-2">
            <h3 className="pb-1 text-xs font-medium uppercase tracking-wider text-text-muted">
              {filtrando ? "Resultados" : "Nós"} ({resultados.length})
            </h3>
            <ul className="space-y-0.5">
              {resultados.map((n) => (
                <li key={n.id}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => escolher(n)}
                    aria-current={n.id === selId}
                    className="w-full justify-start px-1.5 font-normal"
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: COR[n.tipo] }}
                    />
                    <span className="truncate">{n.rotulo}</span>
                    <span className="ml-auto text-xs text-text-muted">{TIPO_LABEL[n.tipo]}</span>
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
