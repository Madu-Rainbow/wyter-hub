-- S-16: limite de tentativas de login na aplicacao (o GoTrue so enxerga o IP do servidor Next).
-- Acesso so por funcoes SECURITY DEFINER; chaves guardadas como SHA-256 (sem e-mail/IP em claro).

create table public.login_tentativa (
  chave text primary key,
  contador int not null default 0,
  janela_inicio timestamptz not null default now(),
  bloqueado_ate timestamptz,
  nivel int not null default 0,
  atualizado_em timestamptz not null default now()
);
alter table public.login_tentativa enable row level security;
-- sem policies: authenticated/anon nao acessam a tabela diretamente
revoke all on public.login_tentativa from anon, authenticated;
create index login_tentativa_atualizado_idx on public.login_tentativa (atualizado_em);

-- Chaves: ei = e-mail+IP (5/15min), ip = IP (20/15min), e = so e-mail (5/15min) quando o IP e desconhecido.
create function public.login_chaves(p_email text, p_ip text)
returns table (chave text, limite int)
language sql immutable
set search_path = ''
as $$
  with n as (select lower(btrim(coalesce(p_email, ''))) as e, btrim(coalesce(p_ip, '')) as ip)
  select encode(sha256(convert_to('ei|' || e || '|' || ip, 'utf8')), 'hex'), 5 from n where ip <> ''
  union all
  select encode(sha256(convert_to('ip|' || ip, 'utf8')), 'hex'), 20 from n where ip <> ''
  union all
  select encode(sha256(convert_to('e|' || e, 'utf8')), 'hex'), 5 from n where ip = ''
$$;
revoke all on function public.login_chaves(text, text) from public, anon, authenticated;

-- Retorna segundos de espera (0 = liberado).
create function public.login_checar(p_email text, p_ip text)
returns int
language sql stable security definer
set search_path = ''
as $$
  select coalesce(max(ceil(extract(epoch from (t.bloqueado_ate - now())))), 0)::int
  from public.login_chaves(p_email, p_ip) k
  join public.login_tentativa t on t.chave = k.chave
  where t.bloqueado_ate > now()
$$;

create function public.login_registrar(p_email text, p_ip text, p_sucesso boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  k record;
  r public.login_tentativa%rowtype;
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if p_sucesso then
    -- so vale com sessao real do mesmo e-mail: impede zerar contador alheio via chamada direta
    if lower(coalesce(auth.jwt() ->> 'email', '')) is distinct from v_email then
      return;
    end if;
    delete from public.login_tentativa t
    using public.login_chaves(v_email, p_ip) c
    where t.chave = c.chave and c.limite = 5;
    return;
  end if;

  for k in select * from public.login_chaves(v_email, p_ip) loop
    insert into public.login_tentativa (chave, contador) values (k.chave, 0)
    on conflict (chave) do nothing;
    select * into r from public.login_tentativa where chave = k.chave for update;

    if r.bloqueado_ate is not null and r.bloqueado_ate > now() then
      continue; -- ja bloqueado: nao estende
    end if;
    if r.janela_inicio < now() - interval '15 minutes' then
      r.contador := 0;
      r.janela_inicio := now();
    end if;
    r.contador := r.contador + 1;
    if r.contador >= k.limite then
      r.nivel := r.nivel + 1;
      r.bloqueado_ate := now() + least(60, 5 * (2 ^ least(r.nivel - 1, 6))::int) * interval '1 minute';
      r.contador := 0;
      r.janela_inicio := now();
    end if;
    update public.login_tentativa
       set contador = r.contador, janela_inicio = r.janela_inicio,
           bloqueado_ate = r.bloqueado_ate, nivel = r.nivel, atualizado_em = now()
     where chave = k.chave;
  end loop;

  -- limpeza oportunista (nivel de bloqueio zera apos 24h sem atividade)
  if random() < 0.05 then
    delete from public.login_tentativa
    where atualizado_em < now() - interval '24 hours'
      and (bloqueado_ate is null or bloqueado_ate < now());
  end if;
end;
$$;

revoke all on function public.login_checar(text, text) from public;
revoke all on function public.login_registrar(text, text, boolean) from public;
grant execute on function public.login_checar(text, text) to anon, authenticated;
grant execute on function public.login_registrar(text, text, boolean) to anon, authenticated;
