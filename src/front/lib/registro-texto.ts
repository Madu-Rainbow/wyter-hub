/** Parte pura do relatório (segura para o cliente): seções, (de)serialização e máscara. */

export const SECOES = [
  ["resumo", "Resumo do dia"],
  ["entregas", "Entregas"],
  ["andamento", "Em andamento"],
  ["bloqueios", "Bloqueios e riscos"],
  ["proximos", "Próximos passos"],
  ["obs", "Observações"],
] as const;
export type SecaoKey = (typeof SECOES)[number][0];
export type Secoes = Record<SecaoKey, string>;

/** Sem valores financeiros em texto livre (também antes de qualquer envio a IA). */
export const mascarar = (s: string) => s.replace(/R\$\s*[\d.,]+/gi, "[valor]");

export const secoesVazias = (): Secoes => ({
  resumo: "",
  entregas: "",
  andamento: "",
  bloqueios: "",
  proximos: "",
  obs: "",
});

export function secoesParaTexto(titulo: string, s: Secoes) {
  return `${titulo}\n\n${SECOES.map(([k, l]) => `## ${l}\n${s[k].trim()}`).join("\n\n")}\n`;
}

export function textoParaSecoes(texto: string): Secoes {
  const out = secoesVazias();
  let atual: SecaoKey | null = null;
  const buf: string[] = [];
  const fecha = () => {
    if (atual) out[atual] = buf.join("\n").trim();
    buf.length = 0;
  };
  for (const l of texto.split("\n")) {
    const m = l.match(/^##\s+(.*)$/);
    if (m) {
      fecha();
      atual = SECOES.find(([, lab]) => lab === m[1].trim())?.[0] ?? null;
    } else if (atual) buf.push(l);
  }
  fecha();
  return out;
}

/** Regenerar preservando edições: seção editada (diferente da última gerada) fica; as demais renovam. */
export function mesclar(atual: Secoes, base: Secoes, nova: Secoes): Secoes {
  const r = secoesVazias();
  for (const [k] of SECOES) r[k] = atual[k].trim() !== base[k].trim() ? atual[k] : nova[k];
  return r;
}
