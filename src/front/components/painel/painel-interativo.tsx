"use client";

import { Button } from "@front/components/ui/button";
import { DIMS, type Dim, PARAM, type Sel } from "@front/lib/painel-sel";
import { X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bloco,
  brl,
  COR_OUTROS,
  ehMulti,
  FOCO,
  type Multi,
  num,
  SERIE,
  Tabela,
  VIZ_CSS,
} from "./bloco";
import { EmpilhadasBloco, type LinhaEmp } from "./empilhadas";
import type { Cidade } from "./mapa-clientes";
import { MedidorBloco } from "./medidor";
import { fatiar, RoscaBloco } from "./rosca";

const MapaClientes = dynamic(() => import("./mapa-clientes"), {
  ssr: false,
  loading: () => <p className="m-auto text-xs text-text-muted">Carregando mapa…</p>,
});

/** Linhas brutas vindas do servidor (já filtradas por RLS e filtros globais). */
export type TarefaR = {
  s: string; // status
  p: string; // prioridade
  r: string | null; // responsável
  pj: string; // projeto
  e: number; // horas estimadas
  sem: string | null; // semana de conclusão (últimas 8)
  aberta: boolean;
  atr: boolean;
  jan: boolean; // prazo nas próximas 4 semanas (não atrasada)
};
export type ProjetoR = { id: string; nm: string; st: string; cl: string; ct: string | null };
export type ContratoR = {
  id: string;
  sit: string;
  cl: string;
  tipo: string;
  valor: number | null;
};
export type ClienteR = {
  id: string;
  seg: string; // "Sem segmento" quando vazio
  cid: string | null; // "Cidade/UF"
  lat: number | null;
  lng: number | null;
};
export type Cat = { key: string; label: string };
export type Pessoa = Cat & { cap: number | null };

const DIM_LABEL: Record<Dim, string> = {
  status: "Status da tarefa",
  prio: "Prioridade",
  pessoa: "Responsável",
  sem: "Semana",
  pst: "Status do projeto",
  sit: "Situação do contrato",
  seg: "Segmento",
  tipo: "Categoria de contratação",
  cidade: "Cidade",
};

type Props = {
  tarefas: TarefaR[];
  projetos: ProjetoR[];
  contratos: ContratoR[];
  clientes: ClienteR[];
  clientesAtivos: number;
  aprovacoes: number;
  gestor: boolean;
  pessoas: Pessoa[];
  semanas: Cat[];
  cats: { status: Cat[]; prio: Cat[]; pst: Cat[]; sit: Cat[] };
  selInicial: Sel;
  base: Record<string, string | undefined>;
  truncado: boolean;
};

function qs(base: string, params: Record<string, string | undefined>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) u.set(k, v);
  const s = u.toString();
  return s ? `${base}?${s}` : base;
}

/** Ordem global (maior primeiro) de uma chave, para cores e "Outros" estáveis. */
const ordenar = (chaves: string[]) => {
  const c = new Map<string, number>();
  for (const k of chaves) c.set(k, (c.get(k) ?? 0) + 1);
  return [...c.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
    .map(([k]) => k);
};
const CORES_FATIA = [...SERIE.slice(0, 5), ...Array(40).fill(COR_OUTROS)];

export function PainelInterativo(p: Props) {
  const [sel, setSel] = useState<Sel>(p.selInicial);

  // Estado na URL sem nova ida ao servidor.
  const gravar = useCallback((s: Sel) => {
    const u = new URL(window.location.href);
    for (const d of DIMS) {
      if (s[d]?.length) u.searchParams.set(PARAM[d], (s[d] ?? []).join(","));
      else u.searchParams.delete(PARAM[d]);
    }
    window.history.replaceState(null, "", u);
  }, []);

  const alternar = useCallback(
    (d: Dim, key: string, multi: boolean) => {
      setSel((cur) => {
        const atual = cur[d] ?? [];
        let prox: string[];
        if (multi) prox = atual.includes(key) ? atual.filter((k) => k !== key) : [...atual, key];
        else prox = atual.length === 1 && atual[0] === key ? [] : [key];
        const n = { ...cur, [d]: prox.length ? prox : undefined };
        gravar(n);
        return n;
      });
    },
    [gravar],
  );

  /** Fatia "Outros": seleciona/desmarca todas as chaves da cauda de uma vez. */
  const alternarVarios = useCallback(
    (d: Dim, keys: string[], multi: boolean) => {
      if (keys.length === 1) return alternar(d, keys[0], multi);
      setSel((cur) => {
        const atual = cur[d] ?? [];
        const todas = keys.every((k) => atual.includes(k));
        const prox = todas
          ? atual.filter((k) => !keys.includes(k))
          : multi
            ? [...new Set([...atual, ...keys])]
            : keys;
        const n = { ...cur, [d]: prox.length ? prox : undefined };
        gravar(n);
        return n;
      });
    },
    [alternar, gravar],
  );

  const remover = (d: Dim, key?: string) => {
    setSel((cur) => {
      const rest = key ? (cur[d] ?? []).filter((k) => k !== key) : [];
      const n = { ...cur, [d]: rest.length ? rest : undefined };
      gravar(n);
      return n;
    });
  };
  const limpar = () => {
    setSel({});
    gravar({});
  };

  const contratoPorId = useMemo(() => new Map(p.contratos.map((c) => [c.id, c])), [p.contratos]);
  const projetoPorId = useMemo(() => new Map(p.projetos.map((x) => [x.id, x])), [p.projetos]);
  const clientePorId = useMemo(() => new Map(p.clientes.map((c) => [c.id, c])), [p.clientes]);

  /** Aplica todas as seleções, exceto a dimensão `ignorar` (o gráfico dono mostra tudo e esmaece). */
  const filtrar = useCallback(
    (ignorar?: Dim) => {
      const ativo = (d: Dim) => d !== ignorar && !!sel[d]?.length;
      const tem = (d: Dim, v: string | null | undefined) =>
        !ativo(d) || (v != null && (sel[d] ?? []).includes(v));
      const clOk = (cl: string) => {
        const c = clientePorId.get(cl);
        return (
          (!ativo("seg") && !ativo("cidade")) || (!!c && tem("seg", c.seg) && tem("cidade", c.cid))
        );
      };
      const ctOk = (ct: string | null) => {
        if (!ativo("sit") && !ativo("tipo")) return true;
        const c = ct ? contratoPorId.get(ct) : undefined;
        return !!c && tem("sit", c.sit) && tem("tipo", c.tipo);
      };
      const pjOk = (x: ProjetoR | undefined) => !!x && tem("pst", x.st) && ctOk(x.ct) && clOk(x.cl);

      const tarefas = p.tarefas.filter(
        (t) =>
          tem("status", t.s) &&
          tem("prio", t.p) &&
          tem("pessoa", t.r) &&
          tem("sem", t.sem) &&
          pjOk(projetoPorId.get(t.pj)),
      );
      const tarefaAtiva = (["status", "prio", "pessoa", "sem"] as Dim[]).some(ativo);
      const comTarefa = new Set(tarefas.map((t) => t.pj));
      const projetos = p.projetos.filter((x) => pjOk(x) && (!tarefaAtiva || comTarefa.has(x.id)));
      const viaProjeto = tarefaAtiva || ativo("pst");
      const cts = new Set(projetos.map((x) => x.ct));
      const contratos = p.contratos.filter(
        (c) =>
          tem("sit", c.sit) && tem("tipo", c.tipo) && clOk(c.cl) && (!viaProjeto || cts.has(c.id)),
      );
      const viaContrato = ativo("sit") || ativo("tipo");
      const comCl = viaProjeto
        ? new Set(projetos.map((x) => x.cl))
        : viaContrato
          ? new Set(contratos.map((c) => c.cl))
          : null;
      const clientes = p.clientes.filter((c) => clOk(c.id) && (!comCl || comCl.has(c.id)));
      return { tarefas, projetos, contratos, clientes };
    },
    [
      sel,
      p.tarefas,
      p.projetos,
      p.contratos,
      p.clientes,
      contratoPorId,
      projetoPorId,
      clientePorId,
    ],
  );

  const total = filtrar();
  const algum = DIMS.some((d) => sel[d]?.length);

  const abertas = total.tarefas.filter((t) => t.aberta);
  const atrasadas = abertas.filter((t) => t.atr);
  const emAnd = total.contratos.filter((c) => c.sit === "em_andamento");
  const clientes = algum ? total.clientes.length : p.clientesAtivos;

  const kpis: { label: string; value: string; href: string }[] = [
    { label: "Clientes ativos", value: String(clientes), href: "/clientes?status=ativo" },
    {
      label: "Projetos em andamento",
      value: String(total.projetos.filter((x) => x.st === "em_andamento").length),
      href: qs("/trabalho", { aba: "projetos", status: "em_andamento", resp: p.base.resp }),
    },
    {
      label: "Tarefas abertas",
      value: String(abertas.length),
      href: qs("/trabalho", { aba: "tarefas", ...p.base, status: "abertas" }),
    },
    {
      label: "Tarefas atrasadas",
      value: String(atrasadas.length),
      href: qs("/trabalho", { aba: "tarefas", ...p.base, atrasadas: "1" }),
    },
    {
      label: "Aprovações pendentes",
      value: String(p.aprovacoes),
      href: "/minhas-tarefas?aprovacao=pendente",
    },
  ];
  if (p.gestor) {
    kpis.push({
      label: "Contratos em andamento",
      value: brl(emAnd.reduce((s, c) => s + (c.valor ?? 0), 0)),
      href: "/trabalho?aba=contratos&situacao=em_andamento",
    });
  }

  const contar = <T,>(arr: T[], cats: Cat[], f: (x: T) => string | null): Linha[] =>
    cats.map((c) => ({
      key: c.key,
      label: c.label,
      value: arr.filter((x) => f(x) === c.key).length,
    }));

  const fPrio = filtrar("prio").tarefas.filter((t) => t.aberta);
  const fPessoa = filtrar("pessoa").tarefas.filter((t) => t.aberta);
  const fSem = filtrar("sem").tarefas;
  const fPst = filtrar("pst").projetos;
  const fSit = filtrar("sit").contratos;

  const lPrio = contar(fPrio, p.cats.prio, (t) => t.p);
  const lPessoa: Linha[] = p.pessoas
    .map((x) => ({
      key: x.key,
      label: x.label,
      ref: x.cap ?? undefined,
      value: fPessoa.filter((t) => t.r === x.key).reduce((s, t) => s + t.e, 0),
    }))
    .filter((l) => l.value > 0 || l.ref || sel.pessoa?.includes(l.key))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "pt-BR"));
  const lSit = contar(fSit, p.cats.sit, (c) => c.sit);
  const lPst = contar(fPst, p.cats.pst, (x) => x.st);
  const lSem = contar(
    fSem.filter((t) => t.s === "concluida"),
    p.semanas,
    (t) => t.sem,
  );

  // Tarefas por status, empilhadas por projeto (cinco maiores + "Outros projetos").
  const fStatus = filtrar("status").tarefas;
  const linhasEmp = useMemo(() => {
    const por = new Map<string, LinhaEmp>();
    for (const t of fStatus) {
      const l = por.get(t.pj) ?? {
        key: t.pj,
        label: projetoPorId.get(t.pj)?.nm ?? "Projeto",
        por: {},
        total: 0,
      };
      l.por[t.s] = (l.por[t.s] ?? 0) + 1;
      l.total++;
      por.set(t.pj, l);
    }
    const ord = [...por.values()].sort((a, b) => b.total - a.total);
    const topo = ord.slice(0, 5);
    const resto = ord.slice(5);
    if (resto.length) {
      const o: LinhaEmp = { key: "__outros", label: "Outros projetos", por: {}, total: 0 };
      for (const l of resto) {
        o.total += l.total;
        for (const [s, n] of Object.entries(l.por)) o.por[s] = (o.por[s] ?? 0) + n;
      }
      topo.push(o);
    }
    return topo;
  }, [fStatus, projetoPorId]);
  const coresStatus = Object.fromEntries(p.cats.status.map((c, i) => [c.key, SERIE[i % 8]]));

  // Roscas: segmento (cliente) e categoria de contratação (contrato).
  const fSeg = filtrar("seg");
  const valorPorCliente = new Map<string, number>();
  for (const c of fSeg.contratos)
    valorPorCliente.set(c.cl, (valorPorCliente.get(c.cl) ?? 0) + (c.valor ?? 0));
  const vSeg = new Map<string, { value: number; valor: number }>();
  for (const c of fSeg.clientes) {
    const v = vSeg.get(c.seg) ?? { value: 0, valor: 0 };
    v.value++;
    v.valor += valorPorCliente.get(c.id) ?? 0;
    vSeg.set(c.seg, v);
  }
  const fatSeg = fatiar(
    ordenar(p.clientes.map((c) => c.seg)),
    vSeg,
    CORES_FATIA,
    sel.seg ?? [],
    p.gestor,
  );
  const vTipo = new Map<string, { value: number; valor: number }>();
  for (const c of filtrar("tipo").contratos) {
    const v = vTipo.get(c.tipo) ?? { value: 0, valor: 0 };
    v.value++;
    v.valor += c.valor ?? 0;
    vTipo.set(c.tipo, v);
  }
  const fatTipo = fatiar(
    ordenar(p.contratos.map((c) => c.tipo)),
    vTipo,
    CORES_FATIA,
    sel.tipo ?? [],
    p.gestor,
  );

  // Mapa: uma bolha por cidade, só com os clientes visíveis (ignora a própria seleção de cidade).
  const fCid = filtrar("cidade");
  const valorCid = new Map<string, number>();
  for (const c of fCid.contratos) valorCid.set(c.cl, (valorCid.get(c.cl) ?? 0) + (c.valor ?? 0));
  const porCidade = new Map<string, Cidade & { somaLat: number; somaLng: number }>();
  for (const c of fCid.clientes) {
    if (!c.cid || c.lat == null || c.lng == null) continue;
    const o = porCidade.get(c.cid) ?? {
      key: c.cid,
      lat: 0,
      lng: 0,
      n: 0,
      valor: p.gestor ? 0 : null,
      somaLat: 0,
      somaLng: 0,
    };
    o.n++;
    o.somaLat += c.lat;
    o.somaLng += c.lng;
    if (o.valor != null) o.valor += valorCid.get(c.id) ?? 0;
    porCidade.set(c.cid, o);
  }
  const cidades: Cidade[] = [...porCidade.values()]
    .map((o) => ({ ...o, lat: o.somaLat / o.n, lng: o.somaLng / o.n }))
    .sort((a, b) => b.n - a.n || a.key.localeCompare(b.key, "pt-BR"));

  // Medidor de estresse (FR-006-13): equipe toda ou só as pessoas selecionadas.
  const medidor = useMemo(() => {
    const esc = sel.pessoa?.length
      ? p.pessoas.filter((x) => sel.pessoa?.includes(x.key))
      : p.pessoas;
    const ids = new Set(esc.map((x) => x.key));
    const ts = filtrar().tarefas.filter(
      (t) => t.aberta && (!sel.pessoa?.length || (t.r != null && ids.has(t.r))),
    );
    const carga = (arr: TarefaR[]) =>
      arr.filter((t) => t.jan).reduce((s, t) => s + t.e, 0) +
      1.5 * arr.filter((t) => t.atr).reduce((s, t) => s + t.e, 0);
    const cap = esc.reduce((s, x) => s + (x.cap ?? 0), 0) * 4;
    if (!cap) return { indice: null, nome: null, escopo: "Sem capacidade cadastrada" };
    const excesso =
      esc.reduce((s, x) => s + Math.max(0, ts.filter((t) => t.r === x.key).length - 8), 0) /
      Math.max(1, esc.length);
    let topo: { nome: string; v: number } | null = null;
    for (const x of esc) {
      if (!x.cap) continue;
      const v = carga(ts.filter((t) => t.r === x.key)) / (x.cap * 4);
      if (!topo || v > topo.v) topo = { nome: x.label, v };
    }
    return {
      indice: carga(ts) / cap + 0.02 * excesso,
      nome: topo && topo.v > 0 ? `${topo.nome} (${num(topo.v * 100)}%)` : null,
      escopo: esc.length === 1 ? esc[0].label : `Equipe (${esc.length} pessoas)`,
    };
  }, [filtrar, sel.pessoa, p.pessoas]);

  const rotulo = (d: Dim, k: string) =>
    (d === "status"
      ? p.cats.status
      : d === "prio"
        ? p.cats.prio
        : d === "pst"
          ? p.cats.pst
          : d === "sit"
            ? p.cats.sit
            : d === "sem"
              ? p.semanas
              : d === "pessoa"
                ? p.pessoas
                : []
    ).find((c) => c.key === k)?.label ?? k;

  const L = (path: string, extra: Record<string, string | undefined> = {}) =>
    qs(path, { ...p.base, ...extra });
  // Composição 12x8 sem lacunas (linha/coluna início/fim); coluna direita estreita com os visuais compactos.
  const A = p.gestor
    ? {
        mapa: "1/1/5/5",
        prio: "5/1/7/3",
        pst: "5/3/7/5",
        carga: "1/5/4/10",
        status: "4/5/7/10",
        sem: "7/1/9/10",
        medidor: "1/10/3/13",
        seg: "3/10/5/13",
        tipo: "5/10/7/13",
        sit: "7/10/9/13",
      }
    : {
        mapa: "1/1/5/5",
        prio: "5/1/7/3",
        pst: "5/3/7/5",
        carga: "",
        status: "1/5/7/10",
        sem: "7/1/9/13",
        medidor: "",
        seg: "1/10/3/13",
        tipo: "3/10/5/13",
        sit: "5/10/7/13",
      };
  const charts: ChartProps[] = [
    {
      dim: "prio",
      titulo: "Tarefas abertas por prioridade",
      unidade: "Tarefas",
      area: A.prio,
      linhas: lPrio,
      href: L("/trabalho", { aba: "tarefas", status: "abertas" }),
    },
    ...(p.gestor
      ? [
          {
            dim: "pessoa" as Dim,
            titulo: "Carga por pessoa",
            unidade: "h",
            area: A.carga,
            carga: true,
            refLabel: "Capacidade semanal (h)",
            linhas: lPessoa,
            href: L("/trabalho", { aba: "tarefas", status: "abertas" }),
          },
        ]
      : []),
    {
      dim: "sit",
      titulo: "Contratos por situação",
      unidade: "Contratos",
      area: A.sit,
      linhas: lSit,
      href: qs("/trabalho", { aba: "contratos", cliente: p.base.cliente }),
    },
    {
      dim: "pst",
      titulo: "Projetos por status",
      unidade: "Projetos",
      area: A.pst,
      linhas: lPst,
      href: qs("/trabalho", { aba: "projetos", resp: p.base.resp, cliente: p.base.cliente }),
    },
    {
      dim: "sem",
      titulo: "Tarefas concluídas por semana",
      unidade: "Concluídas",
      area: A.sem,
      tipo: "linha",
      linhas: lSem,
      href: L("/trabalho", { aba: "tarefas", status: "concluida" }),
    },
  ];

  const selCid = sel.cidade ?? [];
  const algumCid = selCid.length > 0;

  return (
    <div className="painel-viz flex min-h-0 flex-1 flex-col">
      <style>{VIZ_CSS}</style>
      {p.truncado && (
        <p
          role="status"
          className="mb-2 shrink-0 rounded border border-border bg-muted px-3 py-2 text-sm text-text"
        >
          Resultado limitado às primeiras 5.000 tarefas: os números podem estar incompletos. Refine
          os filtros acima.
        </p>
      )}

      <div className="mb-2 grid shrink-0 gap-2 grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))]">
        {kpis.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className={`rounded-md border border-border bg-surface px-3 py-1 hover:bg-muted ${FOCO}`}
          >
            <p className="truncate text-[11px] leading-tight text-text-muted">{k.label}</p>
            <p className="font-title text-lg leading-tight tabular-nums text-text">{k.value}</p>
          </Link>
        ))}
      </div>

      {algum && (
        <section
          className="mb-2 flex shrink-0 flex-wrap items-center gap-2 text-sm"
          aria-label="Filtros ativos"
        >
          <span className="text-xs text-text-muted">Filtros ativos:</span>
          {DIMS.flatMap((d) =>
            (sel[d] ?? []).map((k) => (
              <span
                key={`${d}:${k}`}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-surface py-0.5 pl-3 pr-1 text-text"
              >
                <span className="text-text-muted">{DIM_LABEL[d]}:</span> {rotulo(d, k)}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remover(d, k)}
                  aria-label={`Remover filtro ${DIM_LABEL[d]}: ${rotulo(d, k)}`}
                  title="Remover filtro"
                  className="size-5 rounded-full text-text-muted"
                >
                  <X className="size-3" aria-hidden />
                </Button>
              </span>
            )),
          )}
          <Button type="button" variant="link" size="sm" onClick={limpar}>
            Limpar tudo
          </Button>
        </section>
      )}

      <div className="grid grid-flow-dense gap-2 lg:min-h-0 lg:flex-1 lg:grid-cols-12 lg:grid-rows-[repeat(8,minmax(0,1fr))]">
        <Bloco
          titulo="Clientes no mapa"
          area={A.mapa}
          vazio={cidades.length === 0 && !algumCid}
          href="/clientes?status=ativo"
          tabela={
            <Tabela
              cab={["Cidade", "Clientes", ...(p.gestor ? ["Valor"] : [])]}
              linhas={cidades.map((c) => ({
                key: c.key,
                cels: [c.key, num(c.n), ...(p.gestor ? [brl(c.valor ?? 0)] : [])],
              }))}
              on={(k) => selCid.includes(k)}
              algum={algumCid}
              onLinha={(k, e: Multi) => alternar("cidade", k, ehMulti(e))}
            />
          }
        >
          <div className="relative min-h-0 flex-1">
            <div className="absolute inset-0">
              <MapaClientes
                cidades={cidades}
                selecionados={selCid}
                onToggle={(k, m) => alternar("cidade", k, m)}
                fmtValor={brl}
              />
            </div>
          </div>
        </Bloco>

        {p.gestor && (
          <MedidorBloco
            area={A.medidor}
            indice={medidor.indice}
            maisCarregada={medidor.nome}
            escopo={medidor.escopo}
          />
        )}
        <RoscaBloco
          titulo="Clientes por segmento"
          unidade="Clientes"
          area={A.seg}
          fatias={fatSeg}
          selecionados={sel.seg ?? []}
          onToggle={(k, m) => alternarVarios("seg", k, m)}
        />
        <RoscaBloco
          titulo="Contratos por categoria"
          unidade="Contratos"
          area={A.tipo}
          fatias={fatTipo}
          selecionados={sel.tipo ?? []}
          onToggle={(k, m) => alternarVarios("tipo", k, m)}
          href={qs("/trabalho", { aba: "contratos", cliente: p.base.cliente })}
        />
        <EmpilhadasBloco
          titulo="Tarefas por status e projeto"
          area={A.status}
          href={L("/trabalho", { aba: "tarefas" })}
          linhas={linhasEmp}
          cats={p.cats.status}
          cores={coresStatus}
          selecionados={sel.status ?? []}
          onToggle={(k, m) => alternar("status", k, m)}
        />
        {charts.map((c) => (
          <ChartCard
            key={c.dim}
            {...c}
            selecionados={sel[c.dim] ?? []}
            onToggle={(k, m) => alternar(c.dim, k, m)}
          />
        ))}
      </div>
      <p className="mt-1 shrink-0 text-[11px] text-text-muted">
        Clique para filtrar os demais gráficos e indicadores. Ctrl ou Shift soma valores; clicar de
        novo desmarca. Aprovações pendentes não são afetadas pelos filtros.
      </p>
    </div>
  );
}

export type Linha = { key: string; label: string; value: number; ref?: number };

type ChartProps = {
  dim: Dim;
  titulo: string;
  unidade: string;
  linhas: Linha[];
  tipo?: "barras" | "linha";
  refLabel?: string;
  href: string;
  area: string;
  /** barras de carga: marcador de capacidade e destaque acima de 100% */
  carga?: boolean;
};

const COR = "var(--viz-1)";
const COR_REF = "var(--color-text, #0e1726)";

function ChartCard({
  titulo,
  unidade,
  linhas,
  tipo = "barras",
  refLabel,
  href,
  area,
  carga,
  selecionados,
  onToggle,
}: ChartProps & {
  selecionados: string[];
  onToggle: (key: string, multi: boolean) => void;
}) {
  const h = unidade === "h";
  const max = Math.max(1, ...linhas.map((l) => Math.max(l.value, l.ref ?? 0)));
  const vazio = linhas.every((l) => l.value === 0 && !l.ref);
  const algum = selecionados.length > 0;
  const click = (k: string) => (e: Multi) => onToggle(k, ehMulti(e));
  const on = (k: string) => selecionados.includes(k);
  const aria = (l: Linha) => `${l.label}: ${num(l.value, h)}`;

  return (
    <Bloco
      titulo={titulo}
      area={area}
      href={href}
      vazio={vazio && !algum}
      tabela={
        <Tabela
          cab={["Categoria", unidade, ...(refLabel ? [refLabel] : [])]}
          linhas={linhas.map((l) => ({
            key: l.key,
            cels: [
              l.label,
              num(l.value, h),
              ...(refLabel ? [l.ref == null ? "—" : num(l.ref, h)] : []),
            ],
          }))}
          on={on}
          algum={algum}
          onLinha={(k, e) => click(k)(e)}
        />
      }
    >
      {tipo === "linha" ? (
        <Serie linhas={linhas} max={max} algum={algum} on={on} click={click} />
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          {linhas.map((l) => (
            <li key={l.key} className="min-h-6 flex-1">
              <button
                type="button"
                aria-pressed={on(l.key)}
                aria-label={aria(l)}
                onClick={(e) => click(l.key)(e)}
                className={`flex h-full w-full items-center rounded text-left hover:bg-muted ${FOCO}`}
              >
                <span className="grid w-full grid-cols-[minmax(3rem,7rem)_1fr_auto] items-center gap-2 text-xs">
                  <span
                    className={`truncate text-text-muted ${on(l.key) ? "font-medium text-text" : ""}`}
                    title={l.label}
                  >
                    {l.label}
                  </span>
                  <span className="relative block h-[min(100%,1rem)] min-h-3">
                    <span
                      className={`absolute inset-y-0 left-0 rounded-r-[4px] ${on(l.key) ? "outline outline-2 outline-offset-1 outline-text" : ""}`}
                      style={{
                        width: `${(l.value / max) * 100}%`,
                        background: sobre(l, carga) ? "var(--color-danger, #b91c1c)" : COR,
                        minWidth: l.value > 0 ? 2 : 0,
                        opacity: algum && !on(l.key) ? 0.25 : 1,
                      }}
                    />
                    {l.ref != null && (
                      <span
                        className="absolute -inset-y-0.5 w-0.5"
                        style={{ left: `${(l.ref / max) * 100}%`, background: COR_REF }}
                        title={`${refLabel}: ${num(l.ref, h)}`}
                      />
                    )}
                  </span>
                  <span className="tabular-nums text-text">
                    {carga && l.ref
                      ? `${num(l.value, true)} / ${num(l.ref, true)}${sobre(l, carga) ? ` (${Math.round((l.value / l.ref) * 100)}%, acima)` : ""}`
                      : num(l.value, h)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {refLabel && (
        <p className="mt-1 flex shrink-0 items-center gap-4 text-[11px] text-text-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-sm" style={{ background: COR }} />
            {unidade}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-0.5" style={{ background: COR_REF }} />
            {refLabel}
          </span>
        </p>
      )}
    </Bloco>
  );
}

const sobre = (l: Linha, carga?: boolean) =>
  !!carga && l.ref != null && l.ref > 0 && l.value > l.ref;

function Serie({
  linhas,
  max,
  algum,
  on,
  click,
}: {
  linhas: Linha[];
  max: number;
  algum: boolean;
  on: (k: string) => boolean;
  click: (k: string) => (e: { ctrlKey: boolean; shiftKey: boolean; metaKey: boolean }) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 400, h: 100 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setSize({ w: Math.max(200, e.contentRect.width), h: Math.max(60, e.contentRect.height) }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const W = size.w,
    H = size.h,
    P = 20;
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(1, linhas.length - 1);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const pts = linhas.map((l, i) => `${x(i)},${y(l.value)}`).join(" ");
  return (
    <div ref={box} className="relative min-h-12 flex-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="pointer-events-none absolute inset-0 size-full"
        aria-hidden="true"
      >
        <line
          x1={P}
          x2={W - P}
          y1={H - P}
          y2={H - P}
          stroke="currentColor"
          className="text-border"
        />
        <polygon
          points={`${x(0)},${H - P} ${pts} ${x(linhas.length - 1)},${H - P}`}
          fill={COR}
          opacity={algum ? 0.06 : 0.14}
        />
        <polyline
          points={pts}
          fill="none"
          stroke={COR}
          strokeWidth={2}
          strokeLinejoin="round"
          opacity={algum ? 0.4 : 1}
        />
        {linhas.map((l, i) => {
          const s = on(l.key);
          const ativo = hover === i || s;
          return (
            <g key={l.key}>
              <circle
                className="foco"
                cx={x(i)}
                cy={y(l.value)}
                r={9}
                fill="none"
                strokeWidth={2}
                opacity={0}
              />
              <circle
                cx={x(i)}
                cy={y(l.value)}
                r={ativo ? 5 : 4}
                fill={COR}
                stroke={s ? "var(--color-text, #0e1726)" : "var(--color-surface, #fff)"}
                strokeWidth={2}
                opacity={algum && !s ? 0.3 : 1}
              />
              <text
                x={x(i)}
                y={H - 5}
                textAnchor="middle"
                className={`text-[9px] tabular-nums ${s ? "fill-text font-medium" : "fill-text-muted"}`}
              >
                {l.label}
              </text>
              {ativo && (
                <text
                  x={x(i)}
                  y={y(l.value) - 10}
                  textAnchor="middle"
                  className="fill-text text-[11px] tabular-nums"
                >
                  {l.value}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {linhas.map((l, i) => (
        <button
          key={l.key}
          type="button"
          aria-pressed={on(l.key)}
          aria-label={`Semana ${l.label}: ${l.value} concluídas`}
          className="absolute top-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent"
          style={{ left: x(i) - 20, width: 40, height: H }}
          onClick={click(l.key)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
          onFocus={() => setHover(i)}
          onBlur={() => setHover(null)}
        />
      ))}
    </div>
  );
}
