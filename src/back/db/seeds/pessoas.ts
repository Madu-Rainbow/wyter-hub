import { db } from "../drizzle.js";
import { emailAutorizado } from "../schema/email-autorizado.js";
import { pessoa } from "../schema/pessoa.js";

export const PESSOA_IDS = {
  marcia: "00000000-0000-4000-8000-000000000010",
  lucas: "00000000-0000-4000-8000-000000000011",
  ana: "00000000-0000-4000-8000-000000000012",
  pedro: "00000000-0000-4000-8000-000000000013",
  julia: "00000000-0000-4000-8000-000000000014",
};

export async function seedPessoas(orgId: string) {
  const pessoas = [
    {
      id: PESSOA_IDS.marcia,
      orgId,
      nome: "Márcia Oliveira",
      email: "marcia@wyter.com.br",
      papel: "diretor" as const,
      cargo: "Diretora de Operações",
      capacidadeSemanalHoras: 40,
      ativo: true,
    },
    {
      id: PESSOA_IDS.lucas,
      orgId,
      nome: "Lucas Ferreira",
      email: "lucas@wyter.com.br",
      papel: "consultor" as const,
      cargo: "Consultor Sênior",
      capacidadeSemanalHoras: 40,
      ativo: true,
    },
    {
      id: PESSOA_IDS.ana,
      orgId,
      nome: "Ana Costa",
      email: "ana@wyter.com.br",
      papel: "analista" as const,
      cargo: "Analista de Processos",
      capacidadeSemanalHoras: 40,
      ativo: true,
    },
    {
      id: PESSOA_IDS.pedro,
      orgId,
      nome: "Pedro Santos",
      email: "pedro@wyter.com.br",
      papel: "analista" as const,
      cargo: "Analista Contábil",
      capacidadeSemanalHoras: 40,
      ativo: true,
    },
    {
      id: PESSOA_IDS.julia,
      orgId,
      nome: "Júlia Mendes",
      email: "julia@wyter.com.br",
      papel: "analista" as const,
      cargo: "Analista Administrativa",
      capacidadeSemanalHoras: 40,
      ativo: true,
    },
  ];

  await db.insert(pessoa).values(pessoas);

  await db.insert(emailAutorizado).values(
    pessoas.map((p) => ({
      orgId,
      email: p.email,
      adicionadoPorId: PESSOA_IDS.marcia,
    })),
  );

  return PESSOA_IDS;
}
