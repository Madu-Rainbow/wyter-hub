"use client";

import { Button } from "@front/components/ui/button";
import { Input } from "@front/components/ui/input";
import { Label } from "@front/components/ui/label";
import { createClient } from "@front/lib/supabase/client";
import { Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Token = {
  id: string;
  nome: string;
  prefixo: string;
  escopo: string;
  expira_em: string;
  ultimo_uso_em: string | null;
  revogado_em: string | null;
  created_at: string;
};

const fmt = (d: string | null) =>
  d
    ? new Date(d).toLocaleString("pt-BR", {
        timeZone: "America/Cuiaba",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "nunca";

function Copiar({ texto, rotulo }: { texto: string; rotulo: string }) {
  const [feito, setFeito] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      size="xs"
      onClick={async () => {
        await navigator.clipboard.writeText(texto);
        setFeito(true);
        setTimeout(() => setFeito(false), 1500);
      }}
    >
      <Copy />
      {feito ? "Copiado" : rotulo}
    </Button>
  );
}

export function TokensMcp({ tokens, url }: { tokens: Token[]; url: string }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [escopo, setEscopo] = useState<"leitura" | "escrita">("leitura");
  const [dias, setDias] = useState(90);
  const [novo, setNovo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setErro(null);
    const { data, error } = await createClient().rpc("criar_token_mcp", {
      p_nome: nome,
      p_escopo: escopo,
      p_dias: dias,
    });
    setOcupado(false);
    if (error || !data) return setErro(error?.message ?? "Não foi possível criar o token.");
    setNovo(data as string);
    setNome("");
    router.refresh();
  }

  async function revogar(id: string) {
    if (!confirm("Revogar este token? O Claude conectado com ele perde o acesso.")) return;
    const { error } = await createClient().rpc("revogar_token_mcp", { p_id: id });
    if (error) setErro(error.message);
    router.refresh();
  }

  const cmd = `claude mcp add --transport http wyter-hub ${url} --header "Authorization: Bearer ${novo ?? "<TOKEN>"}"`;
  const cfg = JSON.stringify(
    {
      mcpServers: {
        "wyter-hub": {
          type: "http",
          url,
          headers: { Authorization: `Bearer ${novo ?? "<TOKEN>"}` },
        },
      },
    },
    null,
    2,
  );

  return (
    <div className="space-y-6">
      <form onSubmit={criar} className="space-y-4 rounded-md border border-border bg-surface p-4">
        <h2 className="font-title text-lg text-text">Novo token</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <div className="space-y-1">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Claude Code no notebook"
              maxLength={80}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dias">Validade (dias)</Label>
            <Input
              id="dias"
              type="number"
              min={1}
              max={365}
              value={dias}
              onChange={(e) => setDias(Number(e.target.value))}
              required
            />
          </div>
        </div>
        <fieldset className="space-y-1 text-sm">
          <legend className="mb-1 font-medium text-text">Permissão</legend>
          {(
            [
              ["leitura", "Somente leitura"],
              ["escrita", "Leitura e escrita (criar e atualizar tarefas, comentar)"],
            ] as const
          ).map(([v, l]) => (
            <label key={v} className="flex items-center gap-2 text-text">
              <input
                type="radio"
                name="escopo"
                checked={escopo === v}
                onChange={() => setEscopo(v)}
              />
              {l}
            </label>
          ))}
        </fieldset>
        {erro && (
          <p role="alert" className="text-sm text-red-700">
            {erro}
          </p>
        )}
        <Button type="submit" size="sm" disabled={ocupado}>
          Criar token
        </Button>
      </form>

      {novo && (
        <div className="space-y-2 rounded-md border border-border bg-surface p-4" role="status">
          <p className="text-sm font-medium text-text">
            Copie o token agora. Ele não será mostrado de novo.
          </p>
          <code className="block break-all rounded bg-background p-2 text-xs">{novo}</code>
          <div className="flex gap-2">
            <Copiar texto={novo} rotulo="Copiar token" />
            <Button type="button" variant="ghost" size="xs" onClick={() => setNovo(null)}>
              Já copiei
            </Button>
          </div>
        </div>
      )}

      <section className="space-y-2">
        <h2 className="font-title text-lg text-text">Seus tokens</h2>
        {tokens.length === 0 ? (
          <p className="text-sm text-text-muted">Nenhum token criado.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border bg-surface">
            {tokens.map((t) => {
              const vencido = new Date(t.expira_em) < new Date();
              const situacao = t.revogado_em ? "revogado" : vencido ? "expirado" : "ativo";
              return (
                <li key={t.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-text">
                      {t.nome} <span className="font-normal text-text-muted">({t.prefixo}…)</span>
                    </p>
                    <p className="text-xs tabular-nums text-text-muted">
                      {t.escopo === "escrita" ? "Leitura e escrita" : "Somente leitura"} · criado{" "}
                      {fmt(t.created_at)} · último uso {fmt(t.ultimo_uso_em)} · expira{" "}
                      {fmt(t.expira_em)} · {situacao}
                    </p>
                  </div>
                  {situacao === "ativo" && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => revogar(t.id)}
                    >
                      Revogar
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-title text-lg text-text">Conectar</h2>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text">Claude Code (terminal)</p>
            <Copiar texto={cmd} rotulo="Copiar" />
          </div>
          <pre className="overflow-x-auto rounded-md border border-border bg-surface p-3 text-xs">
            {cmd}
          </pre>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text">.mcp.json ou Claude desktop</p>
            <Copiar texto={cfg} rotulo="Copiar" />
          </div>
          <pre className="overflow-x-auto rounded-md border border-border bg-surface p-3 text-xs">
            {cfg}
          </pre>
          <p className="text-xs text-text-muted">
            No Claude desktop, a conexão remota depende de suporte a cabeçalhos; se não houver, use
            o Claude Code.
          </p>
        </div>
      </section>
    </div>
  );
}
