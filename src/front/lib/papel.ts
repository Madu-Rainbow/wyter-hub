/** Valores de contrato (valor, forma de pagamento, impacto_valor) só para diretor/consultor (FR-006-05). */
export const ehGestor = (papel?: string | null) => papel === "diretor" || papel === "consultor";
