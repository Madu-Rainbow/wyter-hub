import { getSession } from "@back/auth/middleware.js";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="hidden w-56 shrink-0 border-r border-border bg-surface lg:block">
        <div className="p-4">
          <h2 className="font-title text-lg text-text">Wyter Hub</h2>
        </div>
        <nav className="mt-2 px-2">
          <p className="px-2 py-1 text-xs text-text-muted">Navegação em breve (spec 002)</p>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
