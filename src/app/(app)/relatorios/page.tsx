import { VisaoRegistro } from "@front/components/registro/visao";
import { Button } from "@front/components/ui/button";
import { Combobox } from "@front/components/ui/combobox";
import { ehGestor } from "@front/lib/papel";
import { carregarPeriodo, clienteDoEvento, resolvePeriodo } from "@front/lib/registro";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { formatDataISO } from "@front/lib/tarefas";
import { redirect } from "next/navigation";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{
    periodo?: string;
    data?: string;
    aba?: string;
    cliente?: string;
    pessoa?: string;
  }>;
}) {
  const sp = await searchParams;
  const { p, ref, dias } = resolvePeriodo(sp.periodo, sp.data);
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
  if (!eu || eu.papel === "convidado") redirect("/painel");

  const gestor = ehGestor(eu.papel);
  // Analista só vê o que ele próprio fez.
  const pessoaF = gestor ? sp.pessoa || undefined : eu.id;
  const clienteF = sp.cliente || undefined;
  const d = await carregarPeriodo(sb, { ref, dias, pessoaId: pessoaF, clienteId: clienteF });

  const doAnalista = new Set([
    ...d.abertas.map((t) => t.cliente_id),
    ...d.noPeriodo.map((e) => clienteDoEvento(d, e)),
  ]);
  const opcClientes = [...d.nomes.clientes]
    .filter(([id]) => gestor || doAnalista.has(id))
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([value, label]) => ({ value, label }));
  const opcPessoas = [...d.nomes.pessoas]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([value, label]) => ({ value, label }));
  const aba = sp.aba === "relatorio" ? "relatorio" : "painel";

  return (
    <VisaoRegistro
      base="/relatorios"
      titulo="Relatórios"
      subtitulo={dias === 1 ? formatDataISO(ref) : `Últimos ${dias} dias até ${formatDataISO(ref)}`}
      aba={aba}
      periodo={p}
      dataRef={ref}
      dias={dias as 1 | 7 | 30}
      d={d}
      voz={gestor ? "equipe" : "eu"}
      pessoaId={pessoaF}
      podeSalvar={false}
      params={{ cliente: clienteF, pessoa: gestor ? pessoaF : undefined }}
      filtros={
        <form action="/relatorios" className="flex flex-wrap items-center gap-2 pb-1">
          <input type="hidden" name="periodo" value={p} />
          <input type="hidden" name="data" value={ref} />
          <input type="hidden" name="aba" value={aba} />
          <Combobox
            name="cliente"
            options={opcClientes}
            defaultValue={clienteF}
            placeholder="Todos os clientes"
            clearable
            aria-label="Cliente"
            className="w-52"
          />
          {gestor && (
            <Combobox
              name="pessoa"
              options={opcPessoas}
              defaultValue={pessoaF}
              placeholder="Todas as pessoas"
              clearable
              aria-label="Pessoa"
              className="w-48"
            />
          )}
          <Button type="submit" variant="secondary">
            Filtrar
          </Button>
        </form>
      }
    />
  );
}
