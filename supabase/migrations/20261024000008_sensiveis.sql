-- FR-008: valor novo do enum em migration própria (não pode ser usado na mesma transação)
ALTER TYPE public.dossie_tipo ADD VALUE IF NOT EXISTS 'retificacao';
