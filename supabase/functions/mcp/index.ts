// Servidor MCP (Streamable HTTP, stateless) do Wyter Hub. Spec 004.
// Auth: PAT proprio (verify_jwt=false). Dados: sessao REAL do usuario (RLS vale).
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@4.6.7";
import { dossieCliente, limpar, tools, type Ctx } from "./tools.ts";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, mcp-protocol-version, mcp-session-id, accept",
  "access-control-allow-methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(body === null ? null : JSON.stringify(body), {
    status, headers: { ...CORS, ...(body === null ? {} : { "content-type": "application/json" }) },
  });
const rpcErr = (id: unknown, code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

const sha256 = async (s: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))]
    .map((b) => b.toString(16).padStart(2, "0")).join("");

// Sessao do usuario (generateLink + verifyOtp: login real, sem e-mail). Cache por instancia.
const sessoes = new Map<string, { db: SupabaseClient; ate: number }>();
async function clienteDoUsuario(authUserId: string): Promise<SupabaseClient> {
  const c = sessoes.get(authUserId);
  if (c && c.ate > Date.now()) return c.db;
  const u = await admin.auth.admin.getUserById(authUserId);
  const email = u.data.user?.email;
  if (!email) throw new Error("usuario sem e-mail");
  const l = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const hash = l.data?.properties?.hashed_token;
  if (!hash) throw new Error("falha ao abrir sessao do usuario");
  const anon = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const v = await anon.auth.verifyOtp({ type: "email", token_hash: hash });
  const s = v.data.session;
  if (!s) throw new Error("falha ao abrir sessao do usuario");
  const db = createClient(URL_, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${s.access_token}`, "x-wyter-origem": "mcp" } },
  });
  sessoes.set(authUserId, { db, ate: Date.now() + Math.max((s.expires_in - 300) * 1000, 60_000) });
  return db;
}

const jsonSchema = (t: (typeof tools)[number]) => {
  const { $schema: _s, ...rest } = z.toJSONSchema(t.schema, { io: "input" }) as Record<string, unknown>;
  return rest;
};

const PROMPTS = [
  { name: "fechar_o_dia", description: "Fecha o dia: monta o relatorio narrativo a partir do log e orienta a revisao. Nunca envia e-mail.",
    arguments: [{ name: "data", description: "AAAA-MM-DD (padrao: hoje)", required: false }] },
  { name: "briefing_cliente", description: "Resumo do cliente para preparar uma reuniao.",
    arguments: [{ name: "cliente_id", description: "UUID do cliente", required: true }] },
];
const promptTexto = (n: string, a: Record<string, string>) =>
  n === "fechar_o_dia"
    ? `Feche meu dia no Wyter Hub${a.data ? ` (${a.data})` : ""}. Chame a ferramenta relatorio_diario${a.data ? ` com data ${a.data}` : ""} e meu_dia, revise o texto em portugues, aponte pendencias e bloqueios e sugira os proximos passos. NAO envie e-mail nem crie nada: apenas apresente o rascunho para eu revisar.`
    : `Prepare um briefing para reuniao com o cliente ${a.cliente_id}: use obter_cliente e listar_tarefas (cliente_id, atrasadas) e resuma contexto, andamento dos contratos, pendencias e riscos. Nao inclua valores financeiros.`;

type Me = Ctx["me"] & { token_id: string; auth_user_id: string };

async function despachar(msg: any, me: Me): Promise<unknown | null> {
  const { id, method, params } = msg ?? {};
  if (typeof method !== "string") return rpcErr(id, -32600, "Requisicao invalida");
  if (id === undefined) return null; // notificacao
  const ctxDb = () => clienteDoUsuario(me.auth_user_id);
  try {
    switch (method) {
      case "initialize":
        return { jsonrpc: "2.0", id, result: {
          protocolVersion: params?.protocolVersion ?? "2025-06-18",
          capabilities: { tools: {}, resources: {}, prompts: {} },
          serverInfo: { name: "wyter-hub", version: "1.0.0" },
          instructions: "Wyter Hub: consulta e atualiza clientes, projetos e tarefas com as permissoes do usuario. Valores financeiros e dados sensiveis nao sao expostos. Nenhuma ferramenta envia e-mail.",
        } };
      case "ping": return { jsonrpc: "2.0", id, result: {} };
      case "tools/list":
        return { jsonrpc: "2.0", id, result: { tools: tools
          .filter((t) => !t.gestor || ["diretor", "consultor"].includes(me.papel))
          .map((t) => ({ name: t.name, description: t.description + (t.escrita ? " [escrita]" : ""), inputSchema: jsonSchema(t),
            annotations: { readOnlyHint: !t.escrita } })) } };
      case "tools/call": {
        const t = tools.find((x) => x.name === params?.name);
        if (!t) return rpcErr(id, -32602, `Ferramenta desconhecida: ${params?.name}`);
        const t0 = Date.now();
        let sucesso = false;
        let content: string;
        try {
          if (t.escrita && me.escopo !== "escrita") throw new Error("Token somente leitura: crie um token com escopo leitura+escrita.");
          if (t.gestor && !["diretor", "consultor"].includes(me.papel)) throw new Error("Ferramenta restrita a diretor e consultor.");
          const p = t.schema.safeParse(params?.arguments ?? {});
          if (!p.success) throw new Error("Argumentos invalidos: " + p.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
          const r = await t.run({ db: await ctxDb(), me }, p.data);
          content = typeof r === "string" ? limpar(r) : JSON.stringify(limpar(r), null, 1);
          sucesso = true;
        } catch (e) {
          content = limpar(String((e as Error).message ?? e));
        }
        await admin.rpc("mcp_auditar", { p_token: me.token_id, p_ferramenta: t.name, p_escopo: me.escopo, p_ok: sucesso, p_ms: Date.now() - t0 });
        if (content.length > 60000) content = content.slice(0, 60000) + "\n[... truncado]";
        return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: content }], isError: !sucesso } };
      }
      case "resources/list": {
        const r = await (await ctxDb()).from("cliente").select("id, razao_social, nome_fantasia").is("deleted_at", null).order("razao_social").limit(50);
        return { jsonrpc: "2.0", id, result: { resources: (r.data ?? []).map((c: any) => ({
          uri: `wyter://cliente/${c.id}`, name: `Dossie: ${c.nome_fantasia || c.razao_social}`, mimeType: "text/markdown" })) } };
      }
      case "resources/templates/list":
        return { jsonrpc: "2.0", id, result: { resourceTemplates: [{ uriTemplate: "wyter://cliente/{id}", name: "Dossie do cliente", mimeType: "text/markdown" }] } };
      case "resources/read": {
        const m = String(params?.uri ?? "").match(/^wyter:\/\/cliente\/([0-9a-f-]{36})$/i);
        if (!m) return rpcErr(id, -32602, "URI invalida");
        const md = limpar(await dossieCliente({ db: await ctxDb(), me }, m[1]));
        return { jsonrpc: "2.0", id, result: { contents: [{ uri: params.uri, mimeType: "text/markdown", text: md }] } };
      }
      case "prompts/list": return { jsonrpc: "2.0", id, result: { prompts: PROMPTS } };
      case "prompts/get": {
        if (!PROMPTS.some((p) => p.name === params?.name)) return rpcErr(id, -32602, "Prompt desconhecido");
        return { jsonrpc: "2.0", id, result: { messages: [{ role: "user", content: { type: "text", text: promptTexto(params.name, params.arguments ?? {}) } }] } };
      }
      default: return rpcErr(id, -32601, `Metodo nao suportado: ${method}`);
    }
  } catch (e) {
    return rpcErr(id, -32603, "Erro interno");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(null, 204);
  if (req.method !== "POST") return json(rpcErr(null, -32000, "Use POST"), 405);

  const tk = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!tk.startsWith("wyh_")) return json(rpcErr(null, -32001, "Token ausente ou invalido"), 401);
  const v = await admin.rpc("mcp_validar_token", { p_hash: await sha256(tk) });
  const row = Array.isArray(v.data) ? v.data[0] : null;
  if (!row) return json(rpcErr(null, -32001, "Token invalido, expirado ou revogado"), 401);
  const me: Me = { token_id: row.token_id, pessoa_id: row.pessoa_id, org_id: row.org_id, papel: row.papel, escopo: row.escopo, auth_user_id: row.auth_user_id };

  let body: any;
  try { body = await req.json(); } catch { return json(rpcErr(null, -32700, "JSON invalido"), 400); }

  const lote = Array.isArray(body) ? body : [body];
  if (lote.length > 20) return json(rpcErr(null, -32600, "Lote grande demais"), 400);
  if (lote.some((m) => m?.method === "tools/call")) {
    const tx = await admin.rpc("mcp_checar_taxa", { p_token: me.token_id });
    const r = Array.isArray(tx.data) ? tx.data[0] : null;
    if (r && (r.ultimo_minuto >= 60 || r.ultimo_dia >= 2000)) return json(rpcErr(body?.id, -32029, "Limite de chamadas excedido (60/min, 2000/dia)"), 429);
  }
  const out = (await Promise.all(lote.map((m) => despachar(m, me)))).filter((x) => x !== null);
  if (!out.length) return json(null, 202);
  return json(Array.isArray(body) ? out : out[0]);
});
