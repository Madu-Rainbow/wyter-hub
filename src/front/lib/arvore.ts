import type { ProjetoOpt } from "@front/components/tarefas/shared";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { ABERTAS } from "@front/lib/tarefas";
import { cache } from "react";

export type NoProjeto = { id: string; nome: string; chave: string; abertas: number };
export type NoContrato = { id: string; nome: string; abertas: number; projetos: NoProjeto[] };
export type NoCliente = { id: string; nome: string; abertas: number; contratos: NoContrato[] };

export type Arvore = { clientes: NoCliente[]; projetos: ProjetoOpt[] };

const SEM_CONTRATO = "_sem";

/** 3 queries paralelas (sem N+1); contagem de abertas via agregado embutido. Deduplicada por request. */
export const carregarArvore = cache(async (): Promise<Arvore> => {
  const sb = await createSupabaseServer();
  const [c, k, p] = await Promise.all([
    sb
      .from("cliente")
      .select("id, nome_fantasia, razao_social")
      .is("deleted_at", null)
      .order("nome_fantasia"),
    sb.from("contrato").select("id, tipo, numero, cliente_id").is("deleted_at", null),
    sb
      .from("projeto")
      .select("id, nome, chave, cliente_id, contrato_id, abertas:tarefa(count)")
      .is("deleted_at", null)
      .is("tarefa.deleted_at", null)
      .in("tarefa.status", ABERTAS)
      .order("nome"),
  ]);

  const contratos = new Map(
    (k.data ?? []).map((x) => [x.id, x.numero ? `${x.numero} · ${x.tipo}` : x.tipo]),
  );
  const nomeCliente = new Map((c.data ?? []).map((x) => [x.id, x.nome_fantasia || x.razao_social]));

  const projetos: ProjetoOpt[] = (p.data ?? []).map((x) => ({
    id: x.id,
    nome: x.nome,
    chave: x.chave,
    clienteId: x.cliente_id,
    clienteNome: nomeCliente.get(x.cliente_id) ?? "—",
    contratoId: x.contrato_id,
    contratoNome: x.contrato_id ? (contratos.get(x.contrato_id) ?? null) : null,
  }));

  const clientes: NoCliente[] = [];
  for (const [cid, cnome] of nomeCliente) {
    const ps = (p.data ?? []).filter((x) => x.cliente_id === cid);
    const porContrato = new Map<string, NoContrato>();
    for (const x of ps) {
      const key = x.contrato_id ?? SEM_CONTRATO;
      let nc = porContrato.get(key);
      if (!nc) {
        nc = {
          id: key,
          nome: x.contrato_id ? (contratos.get(x.contrato_id) ?? "Contrato") : "Sem contrato",
          abertas: 0,
          projetos: [],
        };
        porContrato.set(key, nc);
      }
      const abertas = (x.abertas as unknown as { count: number }[])?.[0]?.count ?? 0;
      nc.projetos.push({ id: x.id, nome: x.nome, chave: x.chave, abertas });
      nc.abertas += abertas;
    }
    // Contratos sem projeto ainda aparecem na arvore.
    for (const x of k.data ?? []) {
      if (x.cliente_id === cid && !porContrato.has(x.id))
        porContrato.set(x.id, {
          id: x.id,
          nome: x.numero ? `${x.numero} · ${x.tipo}` : x.tipo,
          abertas: 0,
          projetos: [],
        });
    }
    const cts = [...porContrato.values()];
    clientes.push({
      id: cid,
      nome: cnome,
      abertas: cts.reduce((a, b) => a + b.abertas, 0),
      contratos: cts,
    });
  }
  return { clientes, projetos };
});
