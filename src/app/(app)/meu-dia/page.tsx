import { FecharDia, type RegistroCliente } from "@front/components/registro/fechar-dia";
import { LinhaTempo } from "@front/components/registro/linha-tempo";
import { PeriodoNav } from "@front/components/registro/periodo-nav";
import {
  carregarAbertas,
  carregarNomes,
  carregarTarefas,
  contar,
  EV_COLUNAS,
  type Ev,
  gerarRascunho,
  resolvePeriodo,
} from "@front/lib/registro";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { formatDataISO } from "@front/lib/tarefas";
import { redirect } from "next/navigation";

export default async function MeuDiaPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; data?: string }>;
}) {
  const sp = await searchParams;
  const { p, ref, dias, ini, fim } = resolvePeriodo(sp.periodo, sp.data);
  const sb = await createSupabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: eu } = await sb
    .from("pessoa")
    .select("id, papel")
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!eu) redirect("/login");

  const { data } = await sb
    .from("evento")
    .select(EV_COLUNAS)
    .eq("quem_id", eu.id)
    .eq("entidade", "tarefa")
    .gte("quando", ini)
    .lt("quando", fim)
    .order("quando", { ascending: true })
    .limit(1000);
  const eventos = (data ?? []) as unknown as Ev[];

  const [tarefas, nomes, abertas] = await Promise.all([
    carregarTarefas(sb, [...new Set(eventos.map((e) => e.entidade_id))]),
    carregarNomes(sb),
    dias === 1 ? carregarAbertas(sb, eu.id) : Promise.resolve([]),
  ]);
  const cont = contar(eventos);

  let itens: RegistroCliente[] = [];
  if (dias === 1) {
    const cids = new Set<string>();
    for (const e of eventos) {
      const c = e.cliente_id ?? tarefas.get(e.entidade_id)?.cliente_id;
      if (c) cids.add(c);
    }
    for (const t of abertas) if (t.cliente_id) cids.add(t.cliente_id);
    const { data: salvos } = await sb
      .from("registro_diario")
      .select("cliente_id, o_que_fiz")
      .eq("pessoa_id", eu.id)
      .eq("data", ref);
    const salvo = new Map((salvos ?? []).map((r) => [r.cliente_id, r.o_que_fiz]));
    itens = [...cids]
      .map((cid) => {
        const nome = nomes.clientes.get(cid) ?? "Cliente";
        const evs = eventos.filter(
          (e) => (e.cliente_id ?? tarefas.get(e.entidade_id)?.cliente_id) === cid,
        );
        const texto =
          salvo.get(cid) ??
          gerarRascunho({
            cliente: nome,
            data: ref,
            eventos: evs,
            tarefas,
            abertas: abertas.filter((t) => t.cliente_id === cid),
          });
        return { cliente_id: cid, nome, texto, salvo: salvo.has(cid) };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  const rotulo = dias === 7 ? `semana até ${formatDataISO(ref)}` : formatDataISO(ref);
  const chave = `${ref}-${p}`;

  return (
    <div className="flex h-[calc(100dvh-5rem)] min-h-0 flex-col gap-3 sm:h-[calc(100dvh-5.5rem)] lg:h-[calc(100dvh-3rem)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-title text-2xl text-text">Meu dia</h1>
          <p className="text-sm tabular-nums text-text-muted">
            {rotulo} · {cont.concluidas} concluídas · {cont.movidas} movidas · {cont.comentarios}{" "}
            comentários
          </p>
        </div>
        <PeriodoNav base="/meu-dia" periodo={p} data={ref} />
      </div>
      <div className={`grid min-h-0 flex-1 gap-4 ${dias === 1 ? "lg:grid-cols-2" : ""}`}>
        <div className="min-h-0 overflow-y-auto pr-1">
          <LinhaTempo
            eventos={eventos}
            tarefas={tarefas}
            pessoas={nomes.pessoas}
            clientes={nomes.clientes}
            mostrarDia={dias > 1}
          />
        </div>
        {dias === 1 && (
          <div className="min-h-0 overflow-y-auto pr-1">
            <h2 className="mb-2 font-title text-lg text-text">Fechar o dia</h2>
            <p className="mb-3 text-xs text-text-muted">
              Rascunho gerado do log do dia. Edite, salve ou copie; nada é enviado por e-mail.
            </p>
            <FecharDia key={chave} data={ref} itens={itens} />
          </div>
        )}
      </div>
    </div>
  );
}
