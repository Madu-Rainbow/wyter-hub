import { EditorRelatorio, type ItemRelatorio } from "@front/components/registro/editor-relatorio";
import { coresClientes, PainelPeriodo } from "@front/components/registro/painel-periodo";
import { AbasVisao, PeriodoNav } from "@front/components/registro/periodo-nav";
import {
  clienteDoEvento,
  estatisticas,
  type Periodo,
  secoesDoCliente,
  tituloRelatorio,
} from "@front/lib/registro";
import { SECOES, textoParaSecoes } from "@front/lib/registro-texto";
import type React from "react";

/** Estrutura comum de /meu-dia e /relatorios: cabeçalho, período, abas Painel | Relatório. */
export function VisaoRegistro(p: {
  base: string;
  titulo: string;
  subtitulo?: string;
  aba: string;
  periodo: string;
  dataRef: string;
  dias: 1 | 7 | 30;
  d: Periodo;
  voz: "eu" | "equipe";
  pessoaId?: string;
  podeSalvar: boolean;
  /** texto salvo por cliente (registro_diario), só no modo dia */
  salvos?: Map<string, string>;
  params: Record<string, string | undefined>;
  filtros?: React.ReactNode;
}) {
  const { d, dataRef: ref, dias } = p;
  const est = estatisticas({ ref, dias, eventos: d.todos, tarefas: d.tarefas, abertas: d.abertas });
  const cids = new Set<string>([
    ...d.noPeriodo.map((e) => clienteDoEvento(d, e)),
    ...d.abertas.map((t) => t.cliente_id ?? ""),
  ]);
  cids.delete("");
  const cores = coresClientes([...cids]);

  const itens: ItemRelatorio[] =
    p.aba === "relatorio"
      ? [...cids]
          .map((cid) => {
            const { cliente, secoes } = secoesDoCliente(d, { voz: p.voz, ref, dias, cid });
            const txt = p.salvos?.get(cid);
            const salvo = txt ? textoParaSecoes(txt) : null;
            return {
              cliente_id: cid,
              nome: cliente,
              titulo: tituloRelatorio(cliente, ref, dias),
              gerado: secoes,
              salvo: salvo && SECOES.some(([k]) => salvo[k]) ? salvo : null,
            };
          })
          .sort((a, b) => a.nome.localeCompare(b.nome))
      : [];

  return (
    <div className="flex h-[calc(100dvh-5rem)] min-h-0 flex-col gap-3 sm:h-[calc(100dvh-5.5rem)] lg:h-[calc(100dvh-3rem)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-title text-2xl text-text">{p.titulo}</h1>
          {p.subtitulo && <p className="text-sm text-text-muted">{p.subtitulo}</p>}
        </div>
        <PeriodoNav
          base={p.base}
          periodo={p.periodo}
          data={ref}
          extra={{ ...p.params, aba: p.aba }}
        />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <AbasVisao
          base={p.base}
          aba={p.aba}
          params={{ ...p.params, periodo: p.periodo, data: ref }}
        />
        {p.filtros}
      </div>
      {p.aba === "relatorio" ? (
        <div className="min-h-0 flex-1">
          <EditorRelatorio
            key={`${ref}-${dias}-${p.pessoaId ?? ""}-${p.params.cliente ?? ""}`}
            itens={itens}
            data={ref}
            dias={dias}
            escopo={p.voz === "eu" ? "meu" : "equipe"}
            pessoaId={p.voz === "equipe" ? p.pessoaId : undefined}
            podeSalvar={p.podeSalvar}
          />
        </div>
      ) : (
        <PainelPeriodo
          est={est}
          dias={dias}
          dataRef={ref}
          cores={cores}
          nomes={d.nomes}
          tarefas={d.tarefas}
          enriq={d.enriq}
          abertas={d.abertas}
        />
      )}
    </div>
  );
}
