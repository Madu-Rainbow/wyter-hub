"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@front/components/ui/tooltip";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  label,
  icon,
  collapsed = false,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  const link = (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-secondary hover:text-text focus-visible:outline-2 focus-visible:outline-accent ${collapsed ? "justify-center" : ""} ${active ? "bg-secondary font-medium text-text" : "text-text-muted"}`}
    >
      {icon}
      {!collapsed && label}
    </Link>
  );
  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
