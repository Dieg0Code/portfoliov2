-- Contact details exchanged for an expiring CV download.
-- Writes only happen from the server with the service role; visitors cannot
-- read, insert, update, or delete rows through the Data API.

create table public.portfolio_cv_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null
    check (char_length(name) between 2 and 100),
  email text unique,
  phone text unique,
  locale text not null default 'es'
    check (locale in ('es', 'en')),
  source text not null default 'portfolio_cv',
  consented_at timestamptz not null default now(),
  first_requested_at timestamptz not null default now(),
  last_requested_at timestamptz not null default now(),
  downloaded_at timestamptz,
  constraint portfolio_cv_leads_one_contact
    check (num_nonnulls(email, phone) = 1)
);

create index portfolio_cv_leads_created_idx
  on public.portfolio_cv_leads (first_requested_at desc);

alter table public.portfolio_cv_leads enable row level security;

revoke all on table public.portfolio_cv_leads from anon, authenticated;
grant select, insert, update on table public.portfolio_cv_leads to service_role;

comment on table public.portfolio_cv_leads is
  'Contact details voluntarily exchanged for a temporary CV download.';

-- A deliberately non-sensitive row used by the scheduled keepalive request.
create table public.portfolio_keepalive (
  id smallint primary key default 1 check (id = 1),
  label text not null default 'portfolio'
);

insert into public.portfolio_keepalive (id, label)
values (1, 'portfolio');

alter table public.portfolio_keepalive enable row level security;

revoke all on table public.portfolio_keepalive from anon, authenticated;
grant select on table public.portfolio_keepalive to anon, service_role;

create policy "Public read for project keepalive"
  on public.portfolio_keepalive
  for select
  to anon
  using (true);
