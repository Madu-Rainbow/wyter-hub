-- Um e-mail autorizado pertence a uma única org: o trigger de cadastro resolve a org por e-mail.
CREATE UNIQUE INDEX IF NOT EXISTS email_autorizado_email_uniq
  ON public.email_autorizado (lower(email));
