"use client";

import { Button } from "@front/components/ui/button";
import { Separator } from "@front/components/ui/separator";
import { TooltipProvider } from "@front/components/ui/tooltip";
import {
  Building2,
  CalendarCheck,
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { NavLink } from "./nav-link";

type NavItem = { href: string; label: string; icon: React.ReactNode };

const navItems: NavItem[] = [
  { href: "/painel", label: "Painel", icon: <LayoutDashboard className="size-4 shrink-0" /> },
  {
    href: "/minhas-tarefas",
    label: "Minhas tarefas",
    icon: <CheckSquare className="size-4 shrink-0" />,
  },
  { href: "/meu-dia", label: "Meu dia", icon: <CalendarCheck className="size-4 shrink-0" /> },
  { href: "/trabalho", label: "Trabalho", icon: <FolderKanban className="size-4 shrink-0" /> },
  { href: "/clientes", label: "Clientes", icon: <Building2 className="size-4 shrink-0" /> },
  { href: "/equipe", label: "Equipe", icon: <Users className="size-4 shrink-0" /> },
  { href: "/dataware", label: "DataWare", icon: <Network className="size-4 shrink-0" /> },
];

const adminItems: NavItem[] = [
  {
    href: "/admin/usuarios",
    label: "Usuários",
    icon: <UserCog className="size-4 shrink-0" />,
  },
];

/** `initialCollapsed` vem do cookie lido no servidor (sem flash). `mobile` desativa o recolhimento. */
export function Sidebar({
  userName,
  userRole,
  initialCollapsed = false,
  mobile = false,
}: {
  userName: string;
  userRole: string;
  initialCollapsed?: boolean;
  mobile?: boolean;
}) {
  const isDiretor = userRole === "diretor";
  const [collapsedState, setCollapsed] = useState(initialCollapsed);
  const collapsed = collapsedState && !mobile;

  // Abaixo de 1280px recolhe sozinho (sem gravar cookie); o botao manual continua valendo.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1279px)");
    const f = () => mq.matches && setCollapsed(true);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      // biome-ignore lint/suspicious/noDocumentCookie: preferência simples, sem Cookie Store API
      document.cookie = `sidebar_collapsed=${next ? 1 : 0}; path=/; max-age=31536000; samesite=lax`;
    } catch {}
  }

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={`flex h-dvh shrink-0 flex-col border-r border-border bg-surface transition-[width] ${collapsed ? "w-14" : "w-[clamp(13rem,16vw,15rem)]"}`}
      >
        <div
          className={`flex items-center p-4 ${collapsed ? "justify-center px-2" : "justify-between"}`}
        >
          {!collapsed && (
            <div>
              <h2 className="font-title text-lg tracking-tight text-text">Wyter Hub</h2>
              <p className="text-xs text-text-muted">Consultoria</p>
            </div>
          )}
          {!mobile && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-text-muted"
              onClick={toggle}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </Button>
          )}
        </div>

        <Separator />

        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} collapsed={collapsed} />
          ))}
          {isDiretor && (
            <>
              <Separator className="my-2" />
              {!collapsed && (
                <p className="px-2.5 py-1 text-xs font-medium uppercase tracking-wider text-text-muted">
                  Admin
                </p>
              )}
              {adminItems.map((item) => (
                <NavLink key={item.href} {...item} collapsed={collapsed} />
              ))}
            </>
          )}
        </nav>

        <Separator />

        <div className="p-2">
          <Link
            href="/perfil"
            aria-label="Meu perfil"
            title={collapsed ? userName : undefined}
            className={`mb-2 flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-accent ${collapsed ? "justify-center" : ""}`}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-primary-foreground">
              {userName.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text">{userName}</p>
                <p className="text-xs capitalize text-text-muted">{userRole}</p>
              </div>
            )}
          </Link>
          <form action="/api/auth/sign-out" method="POST">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Sair"
              className={`w-full gap-2 text-text-muted ${collapsed ? "justify-center px-0" : "justify-start"}`}
            >
              <LogOut className="size-3.5" />
              {!collapsed && "Sair"}
            </Button>
          </form>
        </div>
      </aside>
    </TooltipProvider>
  );
}
