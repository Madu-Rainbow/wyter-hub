export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      aditivo: {
        Row: {
          contrato_id: string;
          created_at: string;
          data: string;
          id: string;
          impacto_escopo: string | null;
          impacto_prazo: string | null;
          impacto_valor: number | null;
          motivo: string;
          org_id: string;
        };
        Insert: {
          contrato_id: string;
          created_at?: string;
          data: string;
          id?: string;
          impacto_escopo?: string | null;
          impacto_prazo?: string | null;
          impacto_valor?: number | null;
          motivo: string;
          org_id: string;
        };
        Update: {
          contrato_id?: string;
          created_at?: string;
          data?: string;
          id?: string;
          impacto_escopo?: string | null;
          impacto_prazo?: string | null;
          impacto_valor?: number | null;
          motivo?: string;
          org_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "aditivo_contrato_id_fkey";
            columns: ["contrato_id"];
            isOneToOne: false;
            referencedRelation: "contrato";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "aditivo_contrato_id_fkey";
            columns: ["contrato_id"];
            isOneToOne: false;
            referencedRelation: "contrato_andamento";
            referencedColumns: ["contrato_id"];
          },
          {
            foreignKeyName: "aditivo_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacao";
            referencedColumns: ["id"];
          },
        ];
      };
      anexo: {
        Row: {
          created_at: string;
          entidade_id: string;
          entidade_tipo: string;
          id: string;
          nome_arquivo: string;
          org_id: string;
          tamanho_bytes: number | null;
          tipo_arquivo: string | null;
          url_ou_caminho: string;
        };
        Insert: {
          created_at?: string;
          entidade_id: string;
          entidade_tipo: string;
          id?: string;
          nome_arquivo: string;
          org_id: string;
          tamanho_bytes?: number | null;
          tipo_arquivo?: string | null;
          url_ou_caminho: string;
        };
        Update: {
          created_at?: string;
          entidade_id?: string;
          entidade_tipo?: string;
          id?: string;
          nome_arquivo?: string;
          org_id?: string;
          tamanho_bytes?: number | null;
          tipo_arquivo?: string | null;
          url_ou_caminho?: string;
        };
        Relationships: [
          {
            foreignKeyName: "anexo_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacao";
            referencedColumns: ["id"];
          },
        ];
      };
      aprovacao: {
        Row: {
          aprovador_id: string;
          created_at: string;
          custo: number | null;
          decidida_em: string | null;
          decisao_comentario: string | null;
          escopo_extra_id: string | null;
          id: string;
          manutencao_futura: string;
          org_id: string;
          risco_se_nao_fizer: string;
          situacao_atual: string;
          solicitante_id: string;
          status: Database["public"]["Enums"]["aprovacao_status"];
          tarefa_id: string | null;
          updated_at: string;
        };
        Insert: {
          aprovador_id: string;
          created_at?: string;
          custo?: number | null;
          decidida_em?: string | null;
          decisao_comentario?: string | null;
          escopo_extra_id?: string | null;
          id?: string;
          manutencao_futura: string;
          org_id: string;
          risco_se_nao_fizer: string;
          situacao_atual: string;
          solicitante_id: string;
          status?: Database["public"]["Enums"]["aprovacao_status"];
          tarefa_id?: string | null;
          updated_at?: string;
        };
        Update: {
          aprovador_id?: string;
          created_at?: string;
          custo?: number | null;
          decidida_em?: string | null;
          decisao_comentario?: string | null;
          escopo_extra_id?: string | null;
          id?: string;
          manutencao_futura?: string;
          org_id?: string;
          risco_se_nao_fizer?: string;
          situacao_atual?: string;
          solicitante_id?: string;
          status?: Database["public"]["Enums"]["aprovacao_status"];
          tarefa_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "aprovacao_aprovador_id_fkey";
            columns: ["aprovador_id"];
            isOneToOne: false;
            referencedRelation: "pessoa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "aprovacao_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacao";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "aprovacao_solicitante_id_fkey";
            columns: ["solicitante_id"];
            isOneToOne: false;
            referencedRelation: "pessoa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "aprovacao_tarefa_id_fkey";
            columns: ["tarefa_id"];
            isOneToOne: false;
            referencedRelation: "tarefa";
            referencedColumns: ["id"];
          },
        ];
      };
      cliente: {
        Row: {
          cidade: string | null;
          created_at: string;
          deleted_at: string | null;
          id: string;
          latitude: number | null;
          longitude: number | null;
          nome_fantasia: string | null;
          org_id: string;
          razao_social: string;
          responsavel_id: string | null;
          segmento: string | null;
          status: Database["public"]["Enums"]["cliente_status"];
          tags: string[] | null;
          uf: string | null;
          updated_at: string;
        };
        Insert: {
          cidade?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          nome_fantasia?: string | null;
          org_id: string;
          razao_social: string;
          responsavel_id?: string | null;
          segmento?: string | null;
          status?: Database["public"]["Enums"]["cliente_status"];
          tags?: string[] | null;
          uf?: string | null;
          updated_at?: string;
        };
        Update: {
          cidade?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          latitude?: number | null;
          longitude?: number | null;
          nome_fantasia?: string | null;
          org_id?: string;
          razao_social?: string;
          responsavel_id?: string | null;
          segmento?: string | null;
          status?: Database["public"]["Enums"]["cliente_status"];
          tags?: string[] | null;
          uf?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cliente_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacao";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cliente_responsavel_id_fkey";
            columns: ["responsavel_id"];
            isOneToOne: false;
            referencedRelation: "pessoa";
            referencedColumns: ["id"];
          },
        ];
      };
      comentario: {
        Row: {
          autor_id: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          org_id: string;
          tarefa_id: string;
          texto: string;
          updated_at: string;
        };
        Insert: {
          autor_id: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          org_id: string;
          tarefa_id: string;
          texto: string;
          updated_at?: string;
        };
        Update: {
          autor_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          org_id?: string;
          tarefa_id?: string;
          texto?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comentario_autor_id_fkey";
            columns: ["autor_id"];
            isOneToOne: false;
            referencedRelation: "pessoa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comentario_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacao";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comentario_tarefa_id_fkey";
            columns: ["tarefa_id"];
            isOneToOne: false;
            referencedRelation: "tarefa";
            referencedColumns: ["id"];
          },
        ];
      };
      contato_cliente: {
        Row: {
          canal_preferido: string | null;
          cliente_id: string;
          created_at: string;
          deleted_at: string | null;
          email: string | null;
          id: string;
          nome: string;
          org_id: string;
          papel_no_cliente: Database["public"]["Enums"]["papel_no_cliente"] | null;
          telefone: string | null;
          updated_at: string;
        };
        Insert: {
          canal_preferido?: string | null;
          cliente_id: string;
          created_at?: string;
          deleted_at?: string | null;
          email?: string | null;
          id?: string;
          nome: string;
          org_id: string;
          papel_no_cliente?: Database["public"]["Enums"]["papel_no_cliente"] | null;
          telefone?: string | null;
          updated_at?: string;
        };
        Update: {
          canal_preferido?: string | null;
          cliente_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          email?: string | null;
          id?: string;
          nome?: string;
          org_id?: string;
          papel_no_cliente?: Database["public"]["Enums"]["papel_no_cliente"] | null;
          telefone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contato_cliente_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "cliente";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contato_cliente_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacao";
            referencedColumns: ["id"];
          },
        ];
      };
      contrato: {
        Row: {
          arquivo_url: string | null;
          cliente_id: string;
          created_at: string;
          deleted_at: string | null;
          forma_pagamento: string | null;
          id: string;
          numero: string | null;
          org_id: string;
          tipo: string;
          updated_at: string;
          valor: number | null;
          vigencia_fim: string | null;
          vigencia_inicio: string;
        };
        Insert: {
          arquivo_url?: string | null;
          cliente_id: string;
          created_at?: string;
          deleted_at?: string | null;
          forma_pagamento?: string | null;
          id?: string;
          numero?: string | null;
          org_id: string;
          tipo: string;
          updated_at?: string;
          valor?: number | null;
          vigencia_fim?: string | null;
          vigencia_inicio: string;
        };
        Update: {
          arquivo_url?: string | null;
          cliente_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          forma_pagamento?: string | null;
          id?: string;
          numero?: string | null;
          org_id?: string;
          tipo?: string;
          updated_at?: string;
          valor?: number | null;
          vigencia_fim?: string | null;
          vigencia_inicio?: string;
        };
        Relationships: [
          {
            foreignKeyName: "contrato_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "cliente";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contrato_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacao";
            referencedColumns: ["id"];
          },
        ];
      };
      dado_sensivel: {
        Row: {
          campo: string;
          cliente_id: string;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          entidade: string;
          entidade_id: string;
          id: string;
          org_id: string;
          valor_cifrado: string;
        };
        Insert: {
          campo: string;
          cliente_id: string;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          entidade?: string;
          entidade_id: string;
          id?: string;
          org_id: string;
          valor_cifrado: string;
        };
        Update: {
          campo?: string;
          cliente_id?: string;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          entidade?: string;
          entidade_id?: string;
          id?: string;
          org_id?: string;
          valor_cifrado?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dado_sensivel_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "cliente";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dado_sensivel_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "pessoa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dado_sensivel_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacao";
            referencedColumns: ["id"];
          },
        ];
      };
      dossie_cliente: {
        Row: {
          cliente_id: string;
          confianca: Database["public"]["Enums"]["dossie_confianca"];
          conteudo: string;
          created_at: string;
          data_referencia: string | null;
          deleted_at: string | null;
          evento_origem_id: string | null;
          fonte: string | null;
          id: string;
          org_id: string;
          retifica_id: string | null;
          tipo: Database["public"]["Enums"]["dossie_tipo"];
          updated_at: string;
        };
        Insert: {
          cliente_id: string;
          confianca?: Database["public"]["Enums"]["dossie_confianca"];
          conteudo: string;
          created_at?: string;
          data_referencia?: string | null;
          deleted_at?: string | null;
          evento_origem_id?: string | null;
          fonte?: string | null;
          id?: string;
          org_id: string;
          retifica_id?: string | null;
          tipo: Database["public"]["Enums"]["dossie_tipo"];
          updated_at?: string;
        };
        Update: {
          cliente_id?: string;
          confianca?: Database["public"]["Enums"]["dossie_confianca"];
          conteudo?: string;
          created_at?: string;
          data_referencia?: string | null;
          deleted_at?: string | null;
          evento_origem_id?: string | null;
          fonte?: string | null;
          id?: string;
          org_id?: string;
          retifica_id?: string | null;
          tipo?: Database["public"]["Enums"]["dossie_tipo"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dossie_cliente_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "cliente";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dossie_cliente_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacao";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dossie_cliente_retifica_id_fkey";
            columns: ["retifica_id"];
            isOneToOne: false;
            referencedRelation: "dossie_cliente";
            referencedColumns: ["id"];
          },
        ];
      };
      email_autorizado: {
        Row: {
          adicionado_por_id: string | null;
          created_at: string;
          email: string;
          id: string;
          org_id: string;
        };
        Insert: {
          adicionado_por_id?: string | null;
          created_at?: string;
          email: string;
          id?: string;
          org_id: string;
        };
        Update: {
          adicionado_por_id?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          org_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "email_autorizado_adicionado_por_id_fkey";
            columns: ["adicionado_por_id"];
            isOneToOne: false;
            referencedRelation: "pessoa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "email_autorizado_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacao";
            referencedColumns: ["id"];
          },
        ];
      };
      escopo: {
        Row: {
          contrato_id: string;
          created_at: string;
          descricao: string;
          id: string;
          org_id: string;
        };
        Insert: {
          contrato_id: string;
          created_at?: string;
          descricao: string;
          id?: string;
          org_id: string;
        };
        Update: {
          contrato_id?: string;
          created_at?: string;
          descricao?: string;
          id?: string;
          org_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "escopo_contrato_id_fkey";
            columns: ["contrato_id"];
            isOneToOne: false;
            referencedRelation: "contrato";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "escopo_contrato_id_fkey";
            columns: ["contrato_id"];
            isOneToOne: false;
            referencedRelation: "contrato_andamento";
            referencedColumns: ["contrato_id"];
          },
          {
            foreignKeyName: "escopo_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacao";
            referencedColumns: ["id"];
          },
        ];
      };
      escopo_extra: {
        Row: {
          aprovado_por_id: string | null;
          cliente_id: string;
          contrato_id: string | null;
          created_at: string;
          descricao: string;
          id: string;
          org_id: string;
          status: Database["public"]["Enums"]["escopo_extra_status"];
          updated_at: string;
        };
        Insert: {
          aprovado_por_id?: string | null;
          cliente_id: string;
          contrato_id?: string | null;
          created_at?: string;
          descricao: string;
          id?: string;
          org_id: string;
          status?: Database["public"]["Enums"]["escopo_extra_status"];
          updated_at?: string;
        };
        Update: {
          aprovado_por_id?: string | null;
          cliente_id?: string;
          contrato_id?: string | null;
          created_at?: string;
          descricao?: string;
          id?: string;
          org_id?: string;
          status?: Database["public"]["Enums"]["escopo_extra_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "escopo_extra_aprovado_por_id_fkey";
            columns: ["aprovado_por_id"];
            isOneToOne: false;
            referencedRelation: "pessoa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "escopo_extra_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "cliente";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "escopo_extra_contrato_id_fkey";
            columns: ["contrato_id"];
            isOneToOne: false;
            referencedRelation: "contrato";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "escopo_extra_contrato_id_fkey";
            columns: ["contrato_id"];
            isOneToOne: false;
            referencedRelation: "contrato_andamento";
            referencedColumns: ["contrato_id"];
          },
          {
            foreignKeyName: "escopo_extra_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacao";
            referencedColumns: ["id"];
          },
        ];
      };
      evento: {
        Row: {
          antes: Json | null;
          cliente_id: string | null;
          contrato_id: string | null;
          created_at: string;
          depois: Json | null;
          entidade: string;
          entidade_id: string;
          id: string;
          org_id: string;
          origem: Database["public"]["Enums"]["origem"];
          projeto_id: string | null;
          quando: string;
          quem_id: string;
          verbo: string;
        };
        Insert: {
          antes?: Json | null;
          cliente_id?: string | null;
          contrato_id?: string | null;
          created_at?: string;
          depois?: Json | null;
          entidade: string;
          entidade_id: string;
          id?: string;
          org_id: string;
          origem?: Database["public"]["Enums"]["origem"];
          projeto_id?: string | null;
          quando?: string;
          quem_id: string;
          verbo: string;
        };
        Update: {
          antes?: Json | null;
          cliente_id?: string | null;
          contrato_id?: string | null;
          created_at?: string;
          depois?: Json | null;
          entidade?: string;
          entidade_id?: string;
          id?: string;
          org_id?: string;
          origem?: Database["public"]["Enums"]["origem"];
          projeto_id?: string | null;
          quando?: string;
          quem_id?: string;
          verbo?: string;
        };
        Relationships: [
          {
            foreignKeyName: "evento_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "cliente";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evento_contrato_id_fkey";
            columns: ["contrato_id"];
            isOneToOne: false;
            referencedRelation: "contrato";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evento_contrato_id_fkey";
            columns: ["contrato_id"];
            isOneToOne: false;
            referencedRelation: "contrato_andamento";
            referencedColumns: ["contrato_id"];
          },
          {
            foreignKeyName: "evento_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacao";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evento_projeto_id_fkey";
            columns: ["projeto_id"];
            isOneToOne: false;
            referencedRelation: "projeto";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evento_quem_id_fkey";
            columns: ["quem_id"];
            isOneToOne: false;
            referencedRelation: "pessoa";
            referencedColumns: ["id"];
          },
        ];
      };
      integracao: {
        Row: {
          config: Json | null;
          created_at: string;
          id: string;
          org_id: string;
          servico: string;
          ultimo_cursor: string | null;
          updated_at: string;
        };
        Insert: {
          config?: Json | null;
          created_at?: string;
          id?: string;
          org_id: string;
          servico: string;
          ultimo_cursor?: string | null;
          updated_at?: string;
        };
        Update: {
          config?: Json | null;
          created_at?: string;
          id?: string;
          org_id?: string;
          servico?: string;
          ultimo_cursor?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "integracao_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacao";
            referencedColumns: ["id"];
          },
        ];
      };
      municipio_geo: {
        Row: {
          lat: number;
          lng: number;
          nome: string;
          uf: string;
        };
        Insert: {
          lat: number;
          lng: number;
          nome: string;
          uf: string;
        };
        Update: {
          lat?: number;
          lng?: number;
          nome?: string;
          uf?: string;
        };
        Relationships: [];
      };
      organizacao: {
        Row: {
          created_at: string;
          id: string;
          nome: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          nome: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          nome?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pessoa: {
        Row: {
          ativo: boolean;
          auth_user_id: string | null;
          capacidade_semanal_horas: number | null;
          cargo: string | null;
          created_at: string;
          deleted_at: string | null;
          email: string;
          id: string;
          nome: string;
          org_id: string;
          papel: Database["public"]["Enums"]["papel"];
          updated_at: string;
        };
        Insert: {
          ativo?: boolean;
          auth_user_id?: string | null;
          capacidade_semanal_horas?: number | null;
          cargo?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          email: string;
          id?: string;
          nome: string;
          org_id: string;
          papel?: Database["public"]["Enums"]["papel"];
          updated_at?: string;
        };
        Update: {
          ativo?: boolean;
          auth_user_id?: string | null;
          capacidade_semanal_horas?: number | null;
          cargo?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          email?: string;
          id?: string;
          nome?: string;
          org_id?: string;
          papel?: Database["public"]["Enums"]["papel"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pessoa_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacao";
            referencedColumns: ["id"];
          },
        ];
      };
      projeto: {
        Row: {
          chave: string;
          cliente_id: string;
          contrato_id: string | null;
          created_at: string;
          data_fim: string | null;
          data_inicio: string | null;
          deleted_at: string | null;
          frente: string | null;
          id: string;
          nome: string;
          org_id: string;
          parent_id: string | null;
          responsavel_id: string | null;
          status: Database["public"]["Enums"]["projeto_status"];
          tipo: Database["public"]["Enums"]["projeto_tipo"];
          updated_at: string;
        };
        Insert: {
          chave: string;
          cliente_id: string;
          contrato_id?: string | null;
          created_at?: string;
          data_fim?: string | null;
          data_inicio?: string | null;
          deleted_at?: string | null;
          frente?: string | null;
          id?: string;
          nome: string;
          org_id: string;
          parent_id?: string | null;
          responsavel_id?: string | null;
          status?: Database["public"]["Enums"]["projeto_status"];
          tipo?: Database["public"]["Enums"]["projeto_tipo"];
          updated_at?: string;
        };
        Update: {
          chave?: string;
          cliente_id?: string;
          contrato_id?: string | null;
          created_at?: string;
          data_fim?: string | null;
          data_inicio?: string | null;
          deleted_at?: string | null;
          frente?: string | null;
          id?: string;
          nome?: string;
          org_id?: string;
          parent_id?: string | null;
          responsavel_id?: string | null;
          status?: Database["public"]["Enums"]["projeto_status"];
          tipo?: Database["public"]["Enums"]["projeto_tipo"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "projeto_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "cliente";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projeto_contrato_id_fkey";
            columns: ["contrato_id"];
            isOneToOne: false;
            referencedRelation: "contrato";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projeto_contrato_id_fkey";
            columns: ["contrato_id"];
            isOneToOne: false;
            referencedRelation: "contrato_andamento";
            referencedColumns: ["contrato_id"];
          },
          {
            foreignKeyName: "projeto_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacao";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projeto_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "projeto";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "projeto_responsavel_id_fkey";
            columns: ["responsavel_id"];
            isOneToOne: false;
            referencedRelation: "pessoa";
            referencedColumns: ["id"];
          },
        ];
      };
      registro_diario: {
        Row: {
          cliente_id: string;
          created_at: string;
          data: string;
          id: string;
          importado: boolean;
          o_que_descobri: string | null;
          o_que_fiz: string;
          o_que_subi: string | null;
          org_id: string;
          pedido_ao_cliente: string | null;
          pendencias: Json | null;
          pessoa_id: string;
          pilar: string | null;
          precisa_aprovacao: boolean;
          publicado: boolean;
          trava: string | null;
          treinamento_diretoria: Database["public"]["Enums"]["treinamento_diretoria"] | null;
          updated_at: string;
        };
        Insert: {
          cliente_id: string;
          created_at?: string;
          data: string;
          id?: string;
          importado?: boolean;
          o_que_descobri?: string | null;
          o_que_fiz: string;
          o_que_subi?: string | null;
          org_id: string;
          pedido_ao_cliente?: string | null;
          pendencias?: Json | null;
          pessoa_id: string;
          pilar?: string | null;
          precisa_aprovacao?: boolean;
          publicado?: boolean;
          trava?: string | null;
          treinamento_diretoria?: Database["public"]["Enums"]["treinamento_diretoria"] | null;
          updated_at?: string;
        };
        Update: {
          cliente_id?: string;
          created_at?: string;
          data?: string;
          id?: string;
          importado?: boolean;
          o_que_descobri?: string | null;
          o_que_fiz?: string;
          o_que_subi?: string | null;
          org_id?: string;
          pedido_ao_cliente?: string | null;
          pendencias?: Json | null;
          pessoa_id?: string;
          pilar?: string | null;
          precisa_aprovacao?: boolean;
          publicado?: boolean;
          trava?: string | null;
          treinamento_diretoria?: Database["public"]["Enums"]["treinamento_diretoria"] | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "registro_diario_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "cliente";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "registro_diario_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacao";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "registro_diario_pessoa_id_fkey";
            columns: ["pessoa_id"];
            isOneToOne: false;
            referencedRelation: "pessoa";
            referencedColumns: ["id"];
          },
        ];
      };
      sincronizacao: {
        Row: {
          created_at: string;
          entidade_interna: string;
          erros: Json | null;
          id: string;
          id_externo: string;
          id_interno: string;
          integracao_id: string;
          org_id: string;
          ultima_sync: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          entidade_interna: string;
          erros?: Json | null;
          id?: string;
          id_externo: string;
          id_interno: string;
          integracao_id: string;
          org_id: string;
          ultima_sync?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          entidade_interna?: string;
          erros?: Json | null;
          id?: string;
          id_externo?: string;
          id_interno?: string;
          integracao_id?: string;
          org_id?: string;
          ultima_sync?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sincronizacao_integracao_id_fkey";
            columns: ["integracao_id"];
            isOneToOne: false;
            referencedRelation: "integracao";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sincronizacao_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacao";
            referencedColumns: ["id"];
          },
        ];
      };
      tarefa: {
        Row: {
          bloqueada_por_id: string | null;
          categoria: string | null;
          checklist: Json | null;
          created_at: string;
          data_inicio: string | null;
          data_prazo: string | null;
          deleted_at: string | null;
          descricao: string | null;
          esforco: number;
          estimativa_horas: number | null;
          id: string;
          link_externo: string | null;
          numero: number;
          org_id: string;
          origem: Database["public"]["Enums"]["origem"];
          parent_id: string | null;
          prioridade: Database["public"]["Enums"]["prioridade"];
          projeto_id: string;
          responsavel_id: string | null;
          status: Database["public"]["Enums"]["tarefa_status"];
          titulo: string;
          updated_at: string;
          urgencia: number;
        };
        Insert: {
          bloqueada_por_id?: string | null;
          categoria?: string | null;
          checklist?: Json | null;
          created_at?: string;
          data_inicio?: string | null;
          data_prazo?: string | null;
          deleted_at?: string | null;
          descricao?: string | null;
          esforco?: number;
          estimativa_horas?: number | null;
          id?: string;
          link_externo?: string | null;
          numero: number;
          org_id: string;
          origem?: Database["public"]["Enums"]["origem"];
          parent_id?: string | null;
          prioridade?: Database["public"]["Enums"]["prioridade"];
          projeto_id: string;
          responsavel_id?: string | null;
          status?: Database["public"]["Enums"]["tarefa_status"];
          titulo: string;
          updated_at?: string;
          urgencia?: number;
        };
        Update: {
          bloqueada_por_id?: string | null;
          categoria?: string | null;
          checklist?: Json | null;
          created_at?: string;
          data_inicio?: string | null;
          data_prazo?: string | null;
          deleted_at?: string | null;
          descricao?: string | null;
          esforco?: number;
          estimativa_horas?: number | null;
          id?: string;
          link_externo?: string | null;
          numero?: number;
          org_id?: string;
          origem?: Database["public"]["Enums"]["origem"];
          parent_id?: string | null;
          prioridade?: Database["public"]["Enums"]["prioridade"];
          projeto_id?: string;
          responsavel_id?: string | null;
          status?: Database["public"]["Enums"]["tarefa_status"];
          titulo?: string;
          updated_at?: string;
          urgencia?: number;
        };
        Relationships: [
          {
            foreignKeyName: "tarefa_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacao";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tarefa_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "tarefa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tarefa_projeto_id_fkey";
            columns: ["projeto_id"];
            isOneToOne: false;
            referencedRelation: "projeto";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tarefa_responsavel_id_fkey";
            columns: ["responsavel_id"];
            isOneToOne: false;
            referencedRelation: "pessoa";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      contrato_andamento: {
        Row: {
          cliente_id: string | null;
          contrato_id: string | null;
          org_id: string | null;
          situacao: string | null;
          tarefas_entregues: number | null;
          total_projetos: number | null;
          total_tarefas: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "contrato_cliente_id_fkey";
            columns: ["cliente_id"];
            isOneToOne: false;
            referencedRelation: "cliente";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contrato_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizacao";
            referencedColumns: ["id"];
          },
        ];
      };
      dw_aresta: {
        Row: {
          destino: string | null;
          origem: string | null;
          relacao: string | null;
        };
        Relationships: [];
      };
      dw_no: {
        Row: {
          atributos: Json | null;
          cliente_id: string | null;
          id: string | null;
          org_id: string | null;
          rotulo: string | null;
          status: string | null;
          tipo: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      atualizar_usuario: {
        Args: {
          p_ativo: boolean;
          p_capacidade: number;
          p_cargo: string;
          p_papel: Database["public"]["Enums"]["papel"];
          p_pessoa_id: string;
        };
        Returns: undefined;
      };
      convidar_usuario: {
        Args: {
          p_capacidade?: number;
          p_cargo?: string;
          p_email: string;
          p_nome?: string;
          p_papel: Database["public"]["Enums"]["papel"];
        };
        Returns: string;
      };
      dw_eventos: {
        Args: {
          p_ate?: string;
          p_cliente?: string;
          p_de?: string;
          p_limite?: number;
          p_pessoa?: string;
        };
        Returns: Json;
      };
      dw_vizinhanca: {
        Args: { no_id: string; profundidade?: number };
        Returns: Json;
      };
      geo_norm: { Args: { s: string }; Returns: string };
      gerar_chave_projeto: {
        Args: { p_nome: string; p_org: string };
        Returns: string;
      };
      get_my_pessoa: {
        Args: never;
        Returns: {
          id: string;
          org_id: string;
          papel: Database["public"]["Enums"]["papel"];
        }[];
      };
      gravar_sensivel: {
        Args: { p_campo: string; p_cliente: string; p_valor: string };
        Returns: string;
      };
      log_evento_tarefa: {
        Args: {
          p_antes: Json;
          p_depois: Json;
          p_verbo: string;
          t: Database["public"]["Tables"]["tarefa"]["Row"];
        };
        Returns: undefined;
      };
      my_org_id: { Args: never; Returns: string };
      my_papel: { Args: never; Returns: Database["public"]["Enums"]["papel"] };
      revelar_sensivel: { Args: { p_id: string }; Returns: string };
      revogar_convite: { Args: { p_email: string }; Returns: undefined };
      ultimo_acesso_usuarios: {
        Args: never;
        Returns: {
          pessoa_id: string;
          ultimo_acesso: string;
        }[];
      };
    };
    Enums: {
      aprovacao_status: "pendente" | "aprovada" | "recusada";
      cliente_status: "ativo" | "inativo" | "arquivado";
      dossie_confianca: "fato" | "a_confirmar";
      dossie_tipo:
        | "fato"
        | "decisao"
        | "restricao"
        | "sistema"
        | "glossario"
        | "pessoa_chave"
        | "retificacao";
      escopo_extra_status: "proposto" | "aprovado" | "recusado" | "faturado";
      origem: "ui" | "trello" | "email" | "drive" | "mcp" | "ia" | "sistema" | "importador";
      papel: "diretor" | "consultor" | "analista" | "convidado";
      papel_no_cliente: "decisor" | "operacional" | "fornecedor" | "contador" | "advogado";
      prioridade: "critica" | "alta" | "media" | "baixa";
      projeto_status: "planejado" | "em_andamento" | "pausado" | "concluido" | "cancelado";
      projeto_tipo: "continuo" | "pontual";
      tarefa_status:
        | "backlog"
        | "a_fazer"
        | "em_andamento"
        | "aguardando"
        | "revisao"
        | "concluida"
        | "cancelada";
      treinamento_diretoria: "nao_iniciado" | "em_andamento" | "concluido";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      aprovacao_status: ["pendente", "aprovada", "recusada"],
      cliente_status: ["ativo", "inativo", "arquivado"],
      dossie_confianca: ["fato", "a_confirmar"],
      dossie_tipo: [
        "fato",
        "decisao",
        "restricao",
        "sistema",
        "glossario",
        "pessoa_chave",
        "retificacao",
      ],
      escopo_extra_status: ["proposto", "aprovado", "recusado", "faturado"],
      origem: ["ui", "trello", "email", "drive", "mcp", "ia", "sistema", "importador"],
      papel: ["diretor", "consultor", "analista", "convidado"],
      papel_no_cliente: ["decisor", "operacional", "fornecedor", "contador", "advogado"],
      prioridade: ["critica", "alta", "media", "baixa"],
      projeto_status: ["planejado", "em_andamento", "pausado", "concluido", "cancelado"],
      projeto_tipo: ["continuo", "pontual"],
      tarefa_status: [
        "backlog",
        "a_fazer",
        "em_andamento",
        "aguardando",
        "revisao",
        "concluida",
        "cancelada",
      ],
      treinamento_diretoria: ["nao_iniciado", "em_andamento", "concluido"],
    },
  },
} as const;
