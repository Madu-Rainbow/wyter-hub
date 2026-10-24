"use client";

import { Button } from "@front/components/ui/button";
import { Input } from "@front/components/ui/input";
import { Label } from "@front/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@front/components/ui/sheet";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Resultado = { ok?: string; erro?: string };

const tipos = [
  ["fato", "Fato"],
  ["decisao", "Decisão"],
  ["restricao", "Restrição"],
  ["sistema", "Sistema"],
  ["glossario", "Glossário"],
  ["pessoa_chave", "Pessoa-chave"],
];

export function DossieSheet({
  action,
  retifica,
}: {
  action: (fd: FormData) => Promise<Resultado>;
  retifica?: { id: string; tipo: string; conteudo: string };
}) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const sel = "h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm";

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger asChild>
        {retifica ? (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-text-muted">
            Retificar
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="gap-1 text-text-muted">
            <Plus className="size-3.5" />
            Adicionar entrada
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{retifica ? "Retificar entrada" : "Nova entrada no dossiê"}</SheetTitle>
          <SheetDescription>
            {retifica
              ? "A entrada original permanece; uma nova entrada de retificação será criada."
              : "Registre um fato, decisão ou restrição sobre o cliente."}
          </SheetDescription>
        </SheetHeader>
        <form
          className="space-y-3 px-4"
          action={(fd) =>
            start(async () => {
              const r = await action(fd);
              if (r.erro) return setErro(r.erro);
              setErro(null);
              setAberto(false);
              router.refresh();
            })
          }
        >
          {retifica && (
            <>
              <input type="hidden" name="retifica_id" value={retifica.id} />
              <p className="rounded-md bg-secondary p-2 text-xs text-text-muted">
                Original: {retifica.conteudo}
              </p>
            </>
          )}
          <div className="space-y-1">
            <Label htmlFor="d-tipo">Tipo</Label>
            <select id="d-tipo" name="tipo" defaultValue={retifica?.tipo ?? "fato"} className={sel}>
              {tipos.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="d-conteudo">{retifica ? "Conteúdo corrigido" : "Conteúdo"}</Label>
            <textarea
              id="d-conteudo"
              name="conteudo"
              required
              rows={4}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="d-fonte">Fonte</Label>
            <Input id="d-fonte" name="fonte" placeholder="Reunião, e-mail, documento..." />
          </div>
          <div className="space-y-1">
            <Label htmlFor="d-conf">Confiança</Label>
            <select id="d-conf" name="confianca" defaultValue="a_confirmar" className={sel}>
              <option value="a_confirmar">A confirmar</option>
              <option value="fato">Confirmado</option>
            </select>
          </div>
          {erro && (
            <p role="alert" className="text-sm text-danger">
              {erro}
            </p>
          )}
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
