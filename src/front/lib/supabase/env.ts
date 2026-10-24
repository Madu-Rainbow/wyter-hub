function env(nome: string, valor: string | undefined): string {
  if (!valor) throw new Error(`Variável de ambiente ausente: ${nome}`);
  return valor;
}

// Referências estáticas: o Next só inlina NEXT_PUBLIC_* assim no bundle do browser.
export const SUPABASE_URL = env("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = env(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
