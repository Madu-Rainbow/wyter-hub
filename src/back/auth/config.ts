import { db } from "@back/db/drizzle.js";
import { emailAutorizado } from "@back/db/schema/email-autorizado.js";
import { pessoa } from "@back/db/schema/pessoa.js";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { eq } from "drizzle-orm";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.NEXT_PUBLIC_APP_URL,

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },

  plugins: [admin()],

  user: {
    additionalFields: {
      papel: {
        type: "string",
        required: false,
        defaultValue: "analista",
      },
      orgId: {
        type: "string",
        required: false,
      },
    },
  },

  account: {
    accountLinking: {
      enabled: true,
    },
  },

  advanced: {
    cookiePrefix: "wyter",
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const email = user.email?.toLowerCase();
          if (!email) return false;

          const [autorizado] = await db
            .select()
            .from(emailAutorizado)
            .where(eq(emailAutorizado.email, email))
            .limit(1);

          if (!autorizado) return false;

          const [pessoaExistente] = await db
            .select()
            .from(pessoa)
            .where(eq(pessoa.email, email))
            .limit(1);

          if (pessoaExistente) {
            return {
              data: {
                ...user,
                papel: pessoaExistente.papel,
                orgId: pessoaExistente.orgId,
              },
            };
          }

          return {
            data: {
              ...user,
              orgId: autorizado.orgId,
            },
          };
        },
      },
    },
  },
});

export type Auth = typeof auth;
