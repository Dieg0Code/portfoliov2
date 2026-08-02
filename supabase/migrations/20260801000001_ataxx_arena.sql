-- Ataxx arena: who is climbing the ladder, and every game they played.
--
-- Identity is an email the player types in, bound to a signed HttpOnly cookie.
-- It is not verified: it identifies a colleague on a leaderboard, it does not
-- protect anything. Nothing sensitive may ever be keyed off these rows.
--
-- Writes only happen from the server with the service role; visitors cannot
-- read, insert, update or delete rows through the Data API.

create table public.ataxx_players (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null
    check (char_length(display_name) between 2 and 40),
  locale text not null default 'es'
    check (locale in ('es', 'en')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index ataxx_players_last_seen_idx
  on public.ataxx_players (last_seen_at desc);

comment on table public.ataxx_players is
  'Self-declared identities for the Ataxx ladder. Email is unverified on purpose.';

-- One row per finished game. This is also the training corpus: `moves` holds the
-- full game as [from, to] index pairs (null for a pass), which replays exactly
-- through nemesis_runtime.history_to_board.
create table public.ataxx_matches (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null
    references public.ataxx_players (id) on delete cascade,
  opponent_id text not null
    check (char_length(opponent_id) between 1 and 40),
  opponent_kind text not null
    check (opponent_kind in ('heuristic', 'model')),
  -- 'win' / 'loss' / 'draw' are from the human player's point of view.
  outcome text not null
    check (outcome in ('win', 'loss', 'draw')),
  player_pieces smallint not null check (player_pieces between 0 and 49),
  opponent_pieces smallint not null check (opponent_pieces between 0 and 49),
  half_moves smallint not null check (half_moves >= 0),
  moves jsonb not null,
  engine_failures smallint not null default 0,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create index ataxx_matches_player_idx
  on public.ataxx_matches (player_id, opponent_id);

create index ataxx_matches_created_idx
  on public.ataxx_matches (created_at desc);

-- Wins per player per rung: the only aggregate the unlock logic needs.
create index ataxx_matches_wins_idx
  on public.ataxx_matches (player_id, opponent_id)
  where outcome = 'win';

comment on table public.ataxx_matches is
  'Every finished arena game, including the full move list for later training.';

alter table public.ataxx_players enable row level security;
alter table public.ataxx_matches enable row level security;

revoke all on table public.ataxx_players from anon, authenticated;
revoke all on table public.ataxx_matches from anon, authenticated;

grant select, insert, update on table public.ataxx_players to service_role;
grant select, insert on table public.ataxx_matches to service_role;

-- Leaderboard: highest rung beaten, then total wins, then fewest games.
-- Exposed through the service role only; the API route decides what to publish.
create view public.ataxx_ladder_standings
with (security_invoker = true) as
select
  p.id as player_id,
  p.display_name,
  count(*) filter (where m.outcome = 'win') as wins,
  count(*) filter (where m.outcome = 'loss') as losses,
  count(*) filter (where m.outcome = 'draw') as draws,
  count(*) as games,
  max(m.created_at) as last_played_at
from public.ataxx_players p
join public.ataxx_matches m on m.player_id = p.id
group by p.id, p.display_name;

revoke all on public.ataxx_ladder_standings from anon, authenticated;
grant select on public.ataxx_ladder_standings to service_role;
