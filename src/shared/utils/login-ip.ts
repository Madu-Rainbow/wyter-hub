/** Normaliza o e-mail usado como chave de limite de login. */
export const normalizarEmail = (e: string) => e.trim().toLowerCase();

const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6 = /^[0-9a-f:]+$/i;
const valido = (s: string) => IPV4.test(s) || (s.includes(":") && IPV6.test(s));

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
  const cand = partes.length >= saltos ? partes[partes.length - saltos] : (realIp ?? "").trim();
  return valido(cand) ? cand.toLowerCase() : "";
}
