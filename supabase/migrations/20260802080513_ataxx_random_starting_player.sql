alter table public.ataxx_matches
  add column starting_player smallint not null default 1
  check (starting_player in (1, -1));

comment on column public.ataxx_matches.starting_player is
  'Which side took the first turn: 1 for the human, -1 for the rival.';
