-- S-16: limite de tentativas de login na aplicacao (o GoTrue so enxerga o IP do servidor Next).
-- O Next chama as RPCs com a anon key (sem service_role), entao EXECUTE vai para anon/authenticated e o portao
-- e o segredo proprio LOGIN_RL_SECRET, validado aqui contra um hash em tabela privada. Sem segredo cadastrado, tudo falha (falha fechada).
-- Cadastro do hash (uma vez, pelo SQL Editor/psql, sem commitar o valor):
--   insert into public.login_segredo (hash) values (sha256(convert_to('<LOGIN_RL_SECRET>', 'utf8')));

create table public.login_segredo (hash bytea primary key);
alter table public.login_segredo enable row level security;
revoke all on public.login_segredo from public, anon, authenticated;

create table public.login_tentativa (
  chave text primary key,
  contador int not null default 0,
  janela_inicio timestamptz not null default now(),
  bloqueado_ate timestamptz,
  nivel int not null default 0,
  atualizado_em timestamptz not null default now()
);
alter table public.login_tentativa enable row level security;
revoke all on public.login_tentativa from public, anon, authenticated;
create index login_tentativa_atualizado_idx on public.login_tentativa (atualizado_em);

create function public.login_segredo_ok(p_segredo text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select p_segredo is not null and exists (
    select 1 from public.login_segredo where hash = sha256(convert_to(p_segredo, 'utf8'))
  )
$$;
revoke all on function public.login_segredo_ok(text) from public, anon, authenticated;

-- Chaves: ei = e-mail+IP (5/15min; IP vazio = so e-mail), ip = IP/64 (20/15min, se conhecido),
-- e = agregado por e-mail (15/15min) contra rotacao de IP.
create function public.login_chaves(p_email text, p_ip text)
returns table (chave text, limite int)
language sql immutable
set search_path = ''
as $$
  with n as (select lower(btrim(coalesce(p_email, ''))) as e, btrim(coalesce(p_ip, '')) as ip)
  select encode(sha256(convert_to('ei|' || e || '|' || ip, 'utf8')), 'hex'), 5 from n
  union all
  select encode(sha256(convert_to('e|' || e, 'utf8')), 'hex'), 15 from n
  union all
  select encode(sha256(convert_to('ip|' || ip, 'utf8')), 'hex'), 20 from n where ip <> ''
$$;
revoke all on function public.login_chaves(text, text) from public, anon, authenticated;

-- Reserva a tentativa sob lock e devolve segundos de espera (0 = pode tentar). Segredo invalido = erro.
create function public.login_tentar(p_email text, p_ip text, p_segredo text)
returns int
language plpgsql security definer
set search_path = ''
as $$
declare
  k record;
  r public.login_tentativa%rowtype;
  v_espera int;
begin
  if not public.login_segredo_ok(p_segredo) then
    raise exception 'nao autorizado' using errcode = '42501';
  end if;

  -- trava todas as linhas em ordem fixa (sem deadlock) e checa bloqueio
  for k in select * from public.login_chaves(p_email, p_ip) order by chave loop
    insert into public.login_tentativa (chave) values (k.chave) on conflict (chave) do nothing;
    perform 1 from public.login_tentativa where chave = k.chave for update;
  end loop;

  select coalesce(max(ceil(extract(epoch from (t.bloqueado_ate - now())))), 0)::int
    into v_espera
  from public.login_chaves(p_email, p_ip) c
  join public.login_tentativa t on t.chave = c.chave
  where t.bloqueado_ate > now();
  if v_espera > 0 then
    return v_espera;
  end if;

  for k in select * from public.login_chaves(p_email, p_ip) loop
    select * into r from public.login_tentativa where chave = k.chave;
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

  if random() < 0.05 then
    delete from public.login_tentativa
    where atualizado_em < now() - interval '24 hours'
      and (bloqueado_ate is null or bloqueado_ate < now());
  end if;
  return 0;
end;
$$;

-- Sucesso: zera so o contador e-mail+IP (nao o agregado por e-mail nem o por IP).
create function public.login_sucesso(p_email text, p_ip text, p_segredo text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.login_segredo_ok(p_segredo) then
    raise exception 'nao autorizado' using errcode = '42501';
  end if;
  delete from public.login_tentativa
  where chave = encode(sha256(convert_to(
    'ei|' || lower(btrim(coalesce(p_email, ''))) || '|' || btrim(coalesce(p_ip, '')), 'utf8')), 'hex');
end;
$$;

revoke all on function public.login_tentar(text, text, text) from public;
revoke all on function public.login_sucesso(text, text, text) from public;
grant execute on function public.login_tentar(text, text, text) to anon, authenticated;
grant execute on function public.login_sucesso(text, text, text) to anon, authenticated;
