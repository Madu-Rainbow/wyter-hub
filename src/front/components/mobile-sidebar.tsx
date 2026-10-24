"use client";

import { Button } from "@front/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@front/components/ui/sheet";
import type { NoCliente } from "@front/lib/arvore";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";

export function MobileSidebar({
  userName,
  userRole,
  arvore,
}: {
  userName: string;
  userRole: string;
  arvore?: NoCliente[];
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(15rem,85vw)] p-0">
        <Sidebar userName={userName} userRole={userRole} arvore={arvore} mobile />
      </SheetContent>
    </Sheet>
  );
}
