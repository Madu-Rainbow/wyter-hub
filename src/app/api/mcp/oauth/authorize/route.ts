import { createHmac, timingSafeEqual } from "node:crypto";
import { createSupabaseServer } from "@front/lib/supabase/server";
import { NextResponse } from "next/server";

const decode = (value: string) =>
  Buffer.from(
    value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (value.length % 4)) % 4),
    "base64",
  ).toString();

function assinar(value: string) {
  const secret = process.env.MCP_OAUTH_SECRET ?? "";
  if (!secret) throw new Error("MCP_OAUTH_SECRET ausente");
  const encoded = Buffer.from(value).toString("base64url");
  const signature = createHmac("sha256", secret).update(value).digest("base64url");
  return `${encoded}.${signature}`;
}

export async function GET(request: Request) {
  const input = new URL(request.url);
  const raw = input.searchParams.get("approval") ?? "";
  const [encoded, signature] = raw.split(".");
  if (!encoded || !signature)
    return new NextResponse("Solicitacao OAuth invalida.", { status: 400 });
  const value = decode(encoded);
  const expected = createHmac("sha256", process.env.MCP_OAUTH_SECRET ?? "")
    .update(value)
    .digest();
  const received = Buffer.from(
    signature.replaceAll("-", "+").replaceAll("_", "/") +
      "=".repeat((4 - (signature.length % 4)) % 4),
    "base64",
  );
  if (
    !process.env.MCP_OAUTH_SECRET ||
    received.length !== expected.length ||
    !timingSafeEqual(received, expected) ||
    !value.startsWith("approval:")
  ) {
    return new NextResponse("Solicitacao OAuth invalida.", { status: 400 });
  }
  const approval = JSON.parse(value.slice("approval:".length));
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const next = `/api/mcp/oauth/authorize?approval=${encodeURIComponent(raw)}`;
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, input.origin));
  }
  const approved = assinar(`approved:${JSON.stringify({ ...approval, auth_user_id: user.id })}`);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return new NextResponse("URL do Supabase nao configurada.", { status: 500 });
  const target = new URL(`${supabaseUrl}/functions/v1/mcp/oauth/approval`);
  target.searchParams.set("approval", approved);
  return NextResponse.redirect(target);
}
