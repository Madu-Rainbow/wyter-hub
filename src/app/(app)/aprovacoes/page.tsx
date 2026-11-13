import { buttonVariants } from "@front/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@front/components/ui/table";
import { createSupabaseServer } from "@front/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DecidirAprovacao } from "./decidir";

export const metadata = { title: "Aprovações" };

const FILTROS = [
  ["pendente", "Pendentes"],
  ["aprovada", "Aprovadas"],
  ["recusada", "Recusadas"],
  ["todas", "Todas"],
] as const;
const SITUACAO: Record<string, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  recusada: "Recusada",
};
const COR: Record<string, string> = {
  pendente: "bg-amber-50 text-amber-700 border-amber-200",
  aprovada: "bg-green-50 text-green-700 border-green-200",
  recusada: "bg-red-50 text-red-700 border-red-200",
};
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Aprovacao = {
  id: string;
  situacao_atual: string;
  risco_se_nao_fizer: string;
  manutencao_futura: string;
  custo: number | null;
  status: string;
  decisao_comentario: string | null;
  decidida_em: string | null;
  created_at: string;
  solicitante: { nome: string } | null;
  aprovador: { nome: string } | null;
  tarefa: { titulo: string } | null;
};

export default async function AprovacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filtro = FILTROS.find(([v]) => v === status)?.[0] ?? "pendente";

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: eu } = await supabase
    .from("pessoa")
    .select("papel")
    .eq("auth_user_id", user.id)
    .single();
  const ehDiretor = eu?.papel === "diretor";

  let q = supabase
    .from("aprovacao")
    .select(
      "id, situacao_atual, risco_se_nao_fizer, manutencao_futura, custo, status, decisao_comentario, decidida_em, created_at, solicitante:solicitante_id(nome), aprovador:aprovador_id(nome), tarefa:tarefa_id(titulo)",
    )
    .order("created_at", { ascending: false });
  if (filtro !== "todas") q = q.eq("status", filtro);
  const { data } = await q;
  const lista = (data ?? []) as unknown as Aprovacao[];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4">
        <h1 className="font-title text-2xl text-text">Aprovações</h1>
        <p className="text-sm text-text-muted">
          {lista.length} {lista.length === 1 ? "registro" : "registros"} ·{" "}
          {ehDiretor ? "decisão pelo diretor" : "decisão pelo diretor (somente leitura)"}
        </p>
      </div>

      <nav aria-label="Filtrar por situação" className="mb-4 flex flex-wrap gap-2">
        {FILTROS.map(([v, label]) => (
          <Link
            key={v}
            href={`/aprovacoes?status=${v}`}
            aria-current={filtro === v ? "page" : undefined}
            className={buttonVariants({
              size: "sm",
              variant: filtro === v ? "primary" : "secondary",
            })}
          >
            {label}
          </Link>
        ))}
      </nav>

      {lista.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-text-muted">
          Nenhuma aprovação neste filtro.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-surface">
          <Table className="min-w-[60rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Situação atual</TableHead>
                <TableHead>Risco se não fizer</TableHead>
                <TableHead>Manutenção futura</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Decisão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((a) => (
                <TableRow key={a.id} className="align-top">
                  <TableCell className="max-w-48">
                    <p className="font-medium text-text">{a.tarefa?.titulo ?? "Sem tarefa"}</p>
                    <p className="text-xs text-text-muted">
                      {a.solicitante?.nome ?? "—"} → {a.aprovador?.nome ?? "—"}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-56 whitespace-pre-line">{a.situacao_atual}</TableCell>
                  <TableCell className="max-w-56 whitespace-pre-line">
                    {a.risco_se_nao_fizer}
                  </TableCell>
                  <TableCell className="max-w-56 whitespace-pre-line">
                    {a.manutencao_futura}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {a.custo != null ? moeda.format(a.custo) : "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${COR[a.status] ?? ""}`}
                    >
                      {SITUACAO[a.status] ?? a.status}
                    </span>
                  </TableCell>
                  <TableCell className="min-w-44">
                    {a.status === "pendente" ? (
                      ehDiretor ? (
                        <DecidirAprovacao id={a.id} />
                      ) : (
                        <span className="text-xs text-text-muted">Aguardando o diretor</span>
                      )
                    ) : (
                      <div className="text-xs text-text-muted">
                        {a.decidida_em &&
                          new Date(a.decidida_em).toLocaleDateString("pt-BR", {
                            timeZone: "America/Cuiaba",
                          })}
                        {a.decisao_comentario && (
                          <p className="text-text">{a.decisao_comentario}</p>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
