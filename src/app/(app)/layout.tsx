import { MobileSidebar } from "@front/components/mobile-sidebar";
import { Sidebar } from "@front/components/sidebar";
import { carregarArvore } from "@front/lib/arvore";
import { createSupabaseServer } from "@front/lib/supabase/server";
import type { AppRole } from "@shared/types/index";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pessoa } = await supabase
    .from("pessoa")
    .select("nome, papel")
    .eq("auth_user_id", user.id)
    .eq("ativo", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (!pessoa) redirect("/api/auth/nao-autorizado");

  const { clientes: arvore } = await carregarArvore();
  const collapsed = (await cookies()).get("sidebar_collapsed")?.value === "1";
  const userName = pessoa.nome;
  const userRole = pessoa.papel as AppRole;

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      <div className="hidden lg:block">
        <Sidebar
          userName={userName}
          userRole={userRole}
          initialCollapsed={collapsed}
          arvore={arvore}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="flex h-14 shrink-0 items-center border-b border-border bg-surface px-4 lg:hidden">
          <MobileSidebar userName={userName} userRole={userRole} arvore={arvore} />
          <span className="ml-2 font-title text-lg text-text">Wyter Hub</span>
        </header>
        <main className="min-w-0 flex-1 p-3 sm:p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
