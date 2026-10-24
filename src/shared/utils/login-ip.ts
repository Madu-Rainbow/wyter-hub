/** Normaliza o e-mail usado como chave de limite de login. */
export const normalizarEmail = (e: string) => e.trim().toLowerCase();

function ipv4(s: string): string | null {
  const p = s.split(".");
  if (p.length !== 4 || !p.every((x) => /^\d{1,3}$/.test(x) && Number(x) <= 255)) return null;
  return p.map(Number).join(".");
}

/** Normaliza IP: IPv4 canônico; IPv6 vira o prefixo /64 canônico ("a:b:c:d::/64"); ::ffff:a.b.c.d vira IPv4. */
export function normalizarIp(bruto: string): string {
  let s = bruto
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
  s = s.split("%")[0];
  const v4 = ipv4(s);
  if (v4) return v4;
  if (!s.includes(":") || !/^[0-9a-f:.]+$/.test(s)) return "";

  // IPv4 embutido no fim (::ffff:1.2.3.4) vira dois grupos hex
  const m = s.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/);
  if (m) {
    const q = ipv4(m[2]);
    if (!q) return "";
    const [a, b, c, d] = q.split(".").map(Number);
    s = `${m[1]}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  if ((s.match(/::/g) ?? []).length > 1) return "";
  const [esq, dir] = s.split("::");
  const l = esq ? esq.split(":") : [];
  const r = dir === undefined ? [] : dir ? dir.split(":") : [];
  let g: string[];
  if (dir === undefined) g = l;
  else {
    if (l.length + r.length > 7) return "";
    g = [...l, ...Array(8 - l.length - r.length).fill("0"), ...r];
  }
  if (g.length !== 8 || !g.every((x) => /^[0-9a-f]{1,4}$/.test(x))) return "";
  const n = g.map((x) => Number.parseInt(x, 16));
  if (n.slice(0, 5).every((x) => x === 0) && n[5] === 0xffff)
    return `${n[6] >> 8}.${n[6] & 255}.${n[7] >> 8}.${n[7] & 255}`;
  return `${n
    .slice(0, 4)
    .map((x) => x.toString(16))
    .join(":")}::/64`;
}

/**
 * IP do cliente. Só confia em X-Forwarded-For se `saltos` (proxies confiáveis à frente do app) > 0:
 * pega o IP `saltos` posições a partir da direita (o que o proxy confiável anexou).
 * Sem proxy configurado devolve "" (header forjável): o limite cai para só e-mail.
 */
export function ipCliente(xff: string | null, realIp: string | null, saltos: number): string {
  if (saltos <= 0) return "";
  const partes = (xff ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return normalizarIp(partes.length >= saltos ? partes[partes.length - saltos] : (realIp ?? ""));
}
