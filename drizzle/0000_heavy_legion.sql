CREATE TYPE "public"."aprovacao_status" AS ENUM('pendente', 'aprovada', 'recusada');--> statement-breakpoint
CREATE TYPE "public"."cliente_status" AS ENUM('ativo', 'inativo', 'arquivado');--> statement-breakpoint
CREATE TYPE "public"."papel_no_cliente" AS ENUM('decisor', 'operacional', 'fornecedor', 'contador', 'advogado');--> statement-breakpoint
CREATE TYPE "public"."dossie_confianca" AS ENUM('fato', 'a_confirmar');--> statement-breakpoint
CREATE TYPE "public"."dossie_tipo" AS ENUM('fato', 'decisao', 'restricao', 'sistema', 'glossario', 'pessoa_chave');--> statement-breakpoint
CREATE TYPE "public"."escopo_extra_status" AS ENUM('proposto', 'aprovado', 'recusado', 'faturado');--> statement-breakpoint
CREATE TYPE "public"."origem" AS ENUM('ui', 'trello', 'email', 'drive', 'mcp', 'ia');--> statement-breakpoint
CREATE TYPE "public"."papel" AS ENUM('diretor', 'consultor', 'analista', 'convidado');--> statement-breakpoint
CREATE TYPE "public"."prioridade" AS ENUM('critica', 'alta', 'media', 'baixa');--> statement-breakpoint
CREATE TYPE "public"."projeto_status" AS ENUM('planejado', 'em_andamento', 'pausado', 'concluido', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."projeto_tipo" AS ENUM('continuo', 'pontual');--> statement-breakpoint
CREATE TYPE "public"."tarefa_status" AS ENUM('backlog', 'a_fazer', 'em_andamento', 'aguardando', 'revisao', 'concluida', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."treinamento_diretoria" AS ENUM('nao_iniciado', 'em_andamento', 'concluido');--> statement-breakpoint
CREATE TABLE "aditivo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"contrato_id" uuid NOT NULL,
	"data" date NOT NULL,
	"motivo" text NOT NULL,
	"impacto_valor" numeric,
	"impacto_prazo" text,
	"impacto_escopo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anexo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"entidade_tipo" text NOT NULL,
	"entidade_id" uuid NOT NULL,
	"nome_arquivo" text NOT NULL,
	"url_ou_caminho" text NOT NULL,
	"tipo_arquivo" text,
	"tamanho_bytes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aprovacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"tarefa_id" uuid,
	"escopo_extra_id" uuid,
	"solicitante_id" uuid NOT NULL,
	"aprovador_id" uuid NOT NULL,
	"situacao_atual" text NOT NULL,
	"risco_se_nao_fizer" text NOT NULL,
	"manutencao_futura" text NOT NULL,
	"custo" numeric,
	"status" "aprovacao_status" DEFAULT 'pendente' NOT NULL,
	"decisao_comentario" text,
	"decidida_em" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cliente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"razao_social" text NOT NULL,
	"nome_fantasia" text,
	"segmento" text,
	"cidade" text,
	"uf" char(2),
	"status" "cliente_status" DEFAULT 'ativo' NOT NULL,
	"responsavel_id" uuid,
	"tags" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "comentario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"tarefa_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "contato_cliente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"papel_no_cliente" "papel_no_cliente",
	"email" text,
	"telefone" text,
	"canal_preferido" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "contrato" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"vigencia_inicio" date NOT NULL,
	"vigencia_fim" date,
	"valor" numeric,
	"forma_pagamento" text,
	"numero" text,
	"arquivo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "dossie_cliente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"tipo" "dossie_tipo" NOT NULL,
	"conteudo" text NOT NULL,
	"fonte" text,
	"data_referencia" date,
	"confianca" "dossie_confianca" DEFAULT 'a_confirmar' NOT NULL,
	"evento_origem_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "email_autorizado" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"email" text NOT NULL,
	"adicionado_por_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escopo_extra" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"contrato_id" uuid,
	"cliente_id" uuid NOT NULL,
	"descricao" text NOT NULL,
	"status" "escopo_extra_status" DEFAULT 'proposto' NOT NULL,
	"aprovado_por_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escopo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"contrato_id" uuid NOT NULL,
	"descricao" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"quem_id" uuid NOT NULL,
	"quando" timestamp with time zone DEFAULT now() NOT NULL,
	"entidade" text NOT NULL,
	"entidade_id" uuid NOT NULL,
	"verbo" text NOT NULL,
	"antes" jsonb,
	"depois" jsonb,
	"origem" "origem" DEFAULT 'ui' NOT NULL,
	"cliente_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integracao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"servico" text NOT NULL,
	"config" jsonb,
	"ultimo_cursor" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizacao_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "pessoa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"papel" "papel" DEFAULT 'analista' NOT NULL,
	"cargo" text,
	"capacidade_semanal_horas" integer,
	"ativo" boolean DEFAULT true NOT NULL,
	"better_auth_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "projeto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"parent_id" uuid,
	"nome" text NOT NULL,
	"tipo" "projeto_tipo" DEFAULT 'pontual' NOT NULL,
	"frente" text,
	"data_inicio" date,
	"data_fim" date,
	"status" "projeto_status" DEFAULT 'planejado' NOT NULL,
	"responsavel_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "registro_diario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"pessoa_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"data" date NOT NULL,
	"o_que_fiz" text NOT NULL,
	"o_que_subi" text,
	"o_que_descobri" text,
	"pendencias" jsonb,
	"precisa_aprovacao" text,
	"treinamento_diretoria" "treinamento_diretoria",
	"trava" text,
	"pedido_ao_cliente" text,
	"pilar" text,
	"publicado" boolean DEFAULT false NOT NULL,
	"importado" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sincronizacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"integracao_id" uuid NOT NULL,
	"entidade_interna" text NOT NULL,
	"id_interno" uuid NOT NULL,
	"id_externo" text NOT NULL,
	"ultima_sync" timestamp with time zone DEFAULT now() NOT NULL,
	"erros" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tarefa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"projeto_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text,
	"responsavel_id" uuid,
	"categoria" text,
	"prioridade" "prioridade" DEFAULT 'media' NOT NULL,
	"urgencia" integer DEFAULT 3 NOT NULL,
	"esforco" integer DEFAULT 3 NOT NULL,
	"estimativa_horas" numeric,
	"data_inicio" date,
	"data_prazo" date,
	"status" "tarefa_status" DEFAULT 'backlog' NOT NULL,
	"bloqueada_por_id" uuid,
	"checklist" jsonb,
	"origem" "origem" DEFAULT 'ui' NOT NULL,
	"link_externo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "aditivo" ADD CONSTRAINT "aditivo_org_id_organizacao_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aditivo" ADD CONSTRAINT "aditivo_contrato_id_contrato_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contrato"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anexo" ADD CONSTRAINT "anexo_org_id_organizacao_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aprovacao" ADD CONSTRAINT "aprovacao_org_id_organizacao_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aprovacao" ADD CONSTRAINT "aprovacao_tarefa_id_tarefa_id_fk" FOREIGN KEY ("tarefa_id") REFERENCES "public"."tarefa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aprovacao" ADD CONSTRAINT "aprovacao_solicitante_id_pessoa_id_fk" FOREIGN KEY ("solicitante_id") REFERENCES "public"."pessoa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aprovacao" ADD CONSTRAINT "aprovacao_aprovador_id_pessoa_id_fk" FOREIGN KEY ("aprovador_id") REFERENCES "public"."pessoa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_org_id_organizacao_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cliente" ADD CONSTRAINT "cliente_responsavel_id_pessoa_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."pessoa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentario" ADD CONSTRAINT "comentario_org_id_organizacao_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentario" ADD CONSTRAINT "comentario_tarefa_id_tarefa_id_fk" FOREIGN KEY ("tarefa_id") REFERENCES "public"."tarefa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentario" ADD CONSTRAINT "comentario_autor_id_pessoa_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."pessoa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contato_cliente" ADD CONSTRAINT "contato_cliente_org_id_organizacao_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contato_cliente" ADD CONSTRAINT "contato_cliente_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato" ADD CONSTRAINT "contrato_org_id_organizacao_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contrato" ADD CONSTRAINT "contrato_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dossie_cliente" ADD CONSTRAINT "dossie_cliente_org_id_organizacao_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dossie_cliente" ADD CONSTRAINT "dossie_cliente_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dossie_cliente" ADD CONSTRAINT "dossie_cliente_evento_origem_id_evento_id_fk" FOREIGN KEY ("evento_origem_id") REFERENCES "public"."evento"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_autorizado" ADD CONSTRAINT "email_autorizado_org_id_organizacao_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_autorizado" ADD CONSTRAINT "email_autorizado_adicionado_por_id_pessoa_id_fk" FOREIGN KEY ("adicionado_por_id") REFERENCES "public"."pessoa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escopo_extra" ADD CONSTRAINT "escopo_extra_org_id_organizacao_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escopo_extra" ADD CONSTRAINT "escopo_extra_contrato_id_contrato_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contrato"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escopo_extra" ADD CONSTRAINT "escopo_extra_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escopo_extra" ADD CONSTRAINT "escopo_extra_aprovado_por_id_pessoa_id_fk" FOREIGN KEY ("aprovado_por_id") REFERENCES "public"."pessoa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escopo" ADD CONSTRAINT "escopo_org_id_organizacao_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escopo" ADD CONSTRAINT "escopo_contrato_id_contrato_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contrato"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento" ADD CONSTRAINT "evento_org_id_organizacao_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento" ADD CONSTRAINT "evento_quem_id_pessoa_id_fk" FOREIGN KEY ("quem_id") REFERENCES "public"."pessoa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evento" ADD CONSTRAINT "evento_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integracao" ADD CONSTRAINT "integracao_org_id_organizacao_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pessoa" ADD CONSTRAINT "pessoa_org_id_organizacao_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projeto" ADD CONSTRAINT "projeto_org_id_organizacao_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projeto" ADD CONSTRAINT "projeto_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projeto" ADD CONSTRAINT "projeto_responsavel_id_pessoa_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."pessoa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro_diario" ADD CONSTRAINT "registro_diario_org_id_organizacao_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro_diario" ADD CONSTRAINT "registro_diario_pessoa_id_pessoa_id_fk" FOREIGN KEY ("pessoa_id") REFERENCES "public"."pessoa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registro_diario" ADD CONSTRAINT "registro_diario_cliente_id_cliente_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."cliente"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sincronizacao" ADD CONSTRAINT "sincronizacao_org_id_organizacao_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sincronizacao" ADD CONSTRAINT "sincronizacao_integracao_id_integracao_id_fk" FOREIGN KEY ("integracao_id") REFERENCES "public"."integracao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarefa" ADD CONSTRAINT "tarefa_org_id_organizacao_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizacao"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarefa" ADD CONSTRAINT "tarefa_projeto_id_projeto_id_fk" FOREIGN KEY ("projeto_id") REFERENCES "public"."projeto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarefa" ADD CONSTRAINT "tarefa_responsavel_id_pessoa_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."pessoa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evento_quem_quando_idx" ON "evento" USING btree ("quem_id","quando");--> statement-breakpoint
CREATE INDEX "evento_cliente_quando_idx" ON "evento" USING btree ("cliente_id","quando");