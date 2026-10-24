import { Button } from "@front/components/ui/button";
import { Combobox } from "@front/components/ui/combobox";
import { ConvidarForm } from "@front/components/usuarios/convidar-form";
import { ESTADOS, PAPEIS, type Usuario } from "@front/components/usuarios/tipos";
import { UsuarioLinha } from "@front/components/usuarios/usuario-linha";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; papel?: string; estado?: string }>;
}) {
  const { q = "", papel = "", estado = "" } = await searchParams;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: eu } = await supabase
    .from("pessoa")
    .select("id, papel")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (eu?.papel !== "diretor") redirect("/painel");

  const [{ data: pessoas }, { data: convites }, { data: acessos }] = await Promise.all([
    supabase
      .from("pessoa")
      .select("id, nome, email, papel, cargo, capacidade_semanal_horas, ativo, auth_user_id")
      .is("deleted_at", null)
      .order("nome"),
    supabase.from("email_autorizado").select("email"),
    supabase.rpc("ultimo_acesso_usuarios"),
  ]);

  const acesso = new Map((acessos ?? []).map((a) => [a.pessoa_id, a.ultimo_acesso]));
  const emails = new Set((pessoas ?? []).map((p) => p.email.toLowerCase()));

  const todos: Usuario[] = [
    ...(pessoas ?? []).map((p) => ({
      id: p.id,
      nome: p.nome,
      email: p.email,
      papel: p.papel,
      cargo: p.cargo,
      capacidade: p.capacidade_semanal_horas,
      estado: !p.ativo
        ? ("inativo" as const)
        : p.auth_user_id
          ? ("ativo" as const)
          : ("convidado" as const),
      ultimoAcesso: acesso.get(p.id) ?? null,
      souEu: p.id === eu.id,
    })),
    // Convite legado: e-mail autorizado sem pessoa vinculada.
    ...(convites ?? [])
      .filter((c) => !emails.has(c.email.toLowerCase()))
      .map((c) => ({
        id: null,
        nome: c.email.split("@")[0],
        email: c.email,
        papel: "analista",
        cargo: null,
        capacidade: null,
        estado: "convidado" as const,
        ultimoAcesso: null,
        souEu: false,
      })),
  ];

  const cont = { ativo: 0, convidado: 0, inativo: 0 };
  for (const u of todos) cont[u.estado]++;

  const busca = q.trim().toLowerCase();
  const lista = todos.filter(
    (u) =>
      (!papel || u.papel === papel) &&
      (!estado || u.estado === estado) &&
      (!busca || `${u.nome} ${u.email}`.toLowerCase().includes(busca)),
  );

  const sel = "h-9 rounded-md border border-input bg-transparent px-2 text-sm";

  return (
    <div className="mx-auto flex h-[calc(100dvh-5.5rem)] max-w-5xl flex-col lg:h-[calc(100dvh-3rem)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-title text-2xl text-text">Usuários</h1>
          <p className="text-sm tabular-nums text-text-muted">
            {cont.ativo} ativos · {cont.convidado} convidados · {cont.inativo} inativos
          </p>
        </div>
        <ConvidarForm />
        <p className="w-full text-xs text-text-muted">
          O acesso é por e-mail e senha. Convidar libera o e-mail; a senha inicial é definida pelo
          diretor.
        </p>
      </div>

      <form className="mb-3 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou e-mail"
          aria-label="Buscar"
          className={`${sel} w-64`}
        />
        <Combobox
          name="papel"
          defaultValue={papel}
          aria-label="Papel"
          placeholder="Todos os papéis"
          clearable
          className="w-48"
          options={PAPEIS.map(([value, label]) => ({ value, label }))}
        />
        <Combobox
          name="estado"
          defaultValue={estado}
          aria-label="Estado"
          placeholder="Todos os estados"
          clearable
          className="w-48"
          options={Object.entries(ESTADOS).map(([value, label]) => ({ value, label }))}
        />
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
      </form>

      <ul className="min-h-0 flex-1 overflow-y-auto rounded-md border border-border bg-surface">
        {lista.map((u) => (
          <UsuarioLinha key={u.id ?? u.email} u={u} />
        ))}
        {lista.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-text-muted">
            Nenhum usuário encontrado.
          </li>
        )}
      </ul>
    </div>
  );
}
