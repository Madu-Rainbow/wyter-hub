import { ContatoForm } from "@front/components/clientes/contato-form";
import { DossieSheet } from "@front/components/clientes/dossie-sheet";
import { SensiveisSecao } from "@front/components/clientes/sensiveis-secao";
import { fmtISO } from "@front/components/trabalho/tipos";
import { rotuloEvento } from "@front/lib/rotulos-evento";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { adicionarContato, adicionarDossie } from "../../clientes/[id]/actions";

const TIPOS: Record<string, string> = {
  fato: "Fato",
  decisao: "Decisão",
  restricao: "Restrição",
  sistema: "Sistema",
  glossario: "Glossário",
  pessoa_chave: "Pessoa-chave",
  retificacao: "Retificação",
};

/** Aba "Dossiê e registros" do cliente: contatos, dossiê e registros recentes (mesmas ações da página do cliente). */
export async function DossieAba({ clienteId, papel }: { clienteId: string; papel: string }) {
  const sb = await createSupabaseServer();
  const [{ data: dossies }, { data: contatos }, { data: eventos }] = await Promise.all([
    sb
      .from("dossie_cliente")
      .select("id, tipo, conteudo, fonte, confianca, created_at, retifica_id")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false }),
    sb
      .from("contato_cliente")
      .select("id, nome, email, telefone, papel_no_cliente")
      .eq("cliente_id", clienteId)
      .is("deleted_at", null)
      .order("nome"),
    sb
      .from("evento")
      .select("id, entidade, verbo, quando, quem:quem_id(nome)")
      .eq("cliente_id", clienteId)
      .order("quando", { ascending: false })
      .limit(20),
  ]);
  const retificadas = new Set((dossies ?? []).map((d) => d.retifica_id).filter(Boolean));
  const podeEditar = ["diretor", "consultor"].includes(papel);
  const addContato = adicionarContato.bind(null, clienteId);
  const addDossie = adicionarDossie.bind(null, clienteId);
  const h2 = "font-title text-lg text-text";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between">
          <h2 className={h2}>Contatos ({contatos?.length ?? 0})</h2>
          {podeEditar && <ContatoForm action={addContato} />}
        </div>
        <div className="space-y-2">
          {contatos?.map((ct) => (
            <div key={ct.id} className="rounded-md border border-border bg-surface p-3 text-sm">
              <p className="font-medium text-text">
                {ct.nome}
                {ct.papel_no_cliente && (
                  <span className="ml-2 text-xs font-normal capitalize text-text-muted">
                    {ct.papel_no_cliente}
                  </span>
                )}
              </p>
              <p className="text-xs text-text-muted">
                {ct.email && (
                  <a href={`mailto:${ct.email}`} className="hover:text-accent">
                    {ct.email}
                  </a>
                )}
                {ct.email && ct.telefone && " · "}
                {ct.telefone}
              </p>
            </div>
          ))}
          {!contatos?.length && (
            <p className="text-sm text-text-muted">Nenhum contato cadastrado.</p>
          )}
        </div>

        <h2 className={`${h2} mb-3 mt-6`}>Registros recentes</h2>
        <ul className="divide-y divide-border rounded-md border border-border bg-surface text-sm">
          {eventos?.map((e) => (
            <li key={e.id} className="flex justify-between gap-3 px-3 py-2">
              <span className="text-text">
                {(e.quem as unknown as { nome: string } | null)?.nome ?? "—"}{" "}
                {rotuloEvento(e.verbo, e.entidade)}
              </span>
              <span className="shrink-0 tabular-nums text-text-muted">{fmtISO(e.quando)}</span>
            </li>
          ))}
          {!eventos?.length && <li className="px-3 py-3 text-text-muted">Nenhum registro.</li>}
        </ul>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className={h2}>Dossiê ({dossies?.length ?? 0})</h2>
          {papel !== "convidado" && <DossieSheet action={addDossie} />}
        </div>
        <div className="space-y-2">
          {dossies?.map((d) => {
            const orig = d.retifica_id;
            const texto = d.conteudo;
            return (
              <div
                key={d.id}
                className={`rounded-md border border-border bg-surface p-3 ${retificadas.has(d.id) ? "opacity-70" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-text-muted">
                    {TIPOS[d.tipo] ?? d.tipo}
                  </span>
                  {orig && <span className="text-xs text-accent">Retificação</span>}
                  {retificadas.has(d.id) && (
                    <span className="text-xs text-text-muted">Retificada</span>
                  )}
                  <span className="ml-auto flex items-center gap-2">
                    <span className="text-xs tabular-nums text-text-muted">
                      {fmtISO(d.created_at)}
                    </span>
                    {papel !== "convidado" && !orig && !retificadas.has(d.id) && (
                      <DossieSheet
                        action={addDossie}
                        retifica={{ id: d.id, tipo: d.tipo, conteudo: texto }}
                      />
                    )}
                  </span>
                  {d.confianca === "a_confirmar" && (
                    <span className="text-xs text-amber-600">A confirmar</span>
                  )}
                </div>
                <p
                  className={`mt-1 text-sm text-text ${retificadas.has(d.id) ? "line-through" : ""}`}
                >
                  {texto}
                </p>
                {d.fonte && <p className="mt-1 text-xs text-text-muted">Fonte: {d.fonte}</p>}
              </div>
            );
          })}
          {!dossies?.length && (
            <p className="text-sm text-text-muted">
              Nenhuma entrada no dossiê. Use "Adicionar entrada" para registrar o primeiro fato.
            </p>
          )}
        </div>
      </section>
      <SensiveisSecao clienteId={clienteId} papel={papel} />
    </div>
  );
}
