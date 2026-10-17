begin;
create table if not exists public.ranger_players (
 id uuid primary key references auth.users(id) on delete cascade,
 alias text not null unique check (alias ~ '^[a-z0-9_-]{3,16}$'),
 state jsonb not null default '{"profile":null,"mission":null}'::jsonb,
 version bigint not null default 0,
 caught integer not null default 0,
 unique_species integer not null default 0,
 rarity_points bigint not null default 0,
 rarity_counts jsonb not null default '{"Common":0,"Uncommon":0,"Rare":0,"Epic":0,"Legendary":0}'::jsonb,
 missions integer not null default 0,
 recovery_hash text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists ranger_ranking on public.ranger_players (rarity_points desc, unique_species desc, caught desc);
alter table public.ranger_players enable row level security;
revoke all on public.ranger_players from anon, authenticated;
grant all on public.ranger_players to service_role;
create table if not exists public.ranger_rate_limits (scope text primary key, hits integer not null, expires_at timestamptz not null);
alter table public.ranger_rate_limits enable row level security;
revoke all on public.ranger_rate_limits from anon, authenticated;
grant all on public.ranger_rate_limits to service_role;
create or replace function public.ranger_consume_limit(p_scope text,p_max integer,p_seconds integer)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_hits integer;
begin
 insert into ranger_rate_limits(scope,hits,expires_at) values(p_scope,1,now()+make_interval(secs=>p_seconds))
 on conflict(scope) do update set hits=case when ranger_rate_limits.expires_at<now() then 1 else ranger_rate_limits.hits+1 end,
 expires_at=case when ranger_rate_limits.expires_at<now() then now()+make_interval(secs=>p_seconds) else ranger_rate_limits.expires_at end returning hits into v_hits;
 -- Bounded opportunistic cleanup; no account information is stored in these keys.
 delete from ranger_rate_limits where scope in(select scope from ranger_rate_limits where expires_at<now()-interval '1 day' limit 100);
 return v_hits<=p_max;
end $$;
revoke all on function public.ranger_consume_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.ranger_consume_limit(text,integer,integer) to service_role;
commit;
