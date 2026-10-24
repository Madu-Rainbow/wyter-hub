import { db } from "../drizzle.js";
import { cliente } from "../schema/cliente.js";
import { contatoCliente } from "../schema/contato-cliente.js";
import type { PESSOA_IDS } from "./pessoas.js";

export const CLIENTE_IDS = {
  farmacia: "00000000-0000-4000-8000-000000000020",
  advocacia: "00000000-0000-4000-8000-000000000021",
  industria: "00000000-0000-4000-8000-000000000022",
};

export async function seedClientes(orgId: string, pessoas: typeof PESSOA_IDS) {
  await db.insert(cliente).values([
    {
      id: CLIENTE_IDS.farmacia,
      orgId,
      razaoSocial: "Farmácia Vida Plena LTDA",
      nomeFantasia: "Farmácia Vida Plena",
      segmento: "Saúde / Farmácia de Manipulação",
      cidade: "Cuiabá",
      uf: "MT",
      status: "ativo",
      responsavelId: pessoas.lucas,
      tags: ["manipulacao", "varejo", "cuiaba"],
    },
    {
      id: CLIENTE_IDS.advocacia,
      orgId,
      razaoSocial: "Ribeiro & Associados Advocacia",
      nomeFantasia: "Ribeiro Advocacia",
      segmento: "Jurídico",
      cidade: "Cuiabá",
      uf: "MT",
      status: "ativo",
      responsavelId: pessoas.lucas,
      tags: ["advocacia", "tributario", "cuiaba"],
    },
    {
      id: CLIENTE_IDS.industria,
      orgId,
      razaoSocial: "Milligrama Indústria e Comércio LTDA",
      nomeFantasia: "Milligrama",
      segmento: "Indústria / Cosméticos",
      cidade: "Várzea Grande",
      uf: "MT",
      status: "ativo",
      responsavelId: pessoas.marcia,
      tags: ["industria", "cosmeticos", "varzea-grande"],
    },
  ]);

  await db.insert(contatoCliente).values([
    {
      orgId,
      clienteId: CLIENTE_IDS.farmacia,
      nome: "Dr. Roberto Almeida",
      papelNoCliente: "decisor",
      email: "roberto@vidaplena.com.br",
      telefone: "(65) 99999-0001",
      canalPreferido: "WhatsApp",
    },
    {
      orgId,
      clienteId: CLIENTE_IDS.farmacia,
      nome: "Carla Souza",
      papelNoCliente: "operacional",
      email: "carla@vidaplena.com.br",
      telefone: "(65) 99999-0002",
      canalPreferido: "E-mail",
    },
    {
      orgId,
      clienteId: CLIENTE_IDS.advocacia,
      nome: "Dr. Henrique Ribeiro",
      papelNoCliente: "decisor",
      email: "henrique@ribeiro.adv.br",
      telefone: "(65) 99999-0003",
      canalPreferido: "E-mail",
    },
    {
      orgId,
      clienteId: CLIENTE_IDS.industria,
      nome: "Fernanda Lima",
      papelNoCliente: "decisor",
      email: "fernanda@milligrama.com.br",
      telefone: "(65) 99999-0004",
      canalPreferido: "WhatsApp",
    },
    {
      orgId,
      clienteId: CLIENTE_IDS.industria,
      nome: "Marcos Tavares",
      papelNoCliente: "contador",
      email: "marcos@contabil.com.br",
      telefone: "(65) 99999-0005",
      canalPreferido: "E-mail",
    },
  ]);

  return CLIENTE_IDS;
}
