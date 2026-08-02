-- Let the server remove a player and their games.
--
-- Needed to honour "take me off the board" requests, and to clear out test rows
-- without hand-editing the database. Matches cascade from the player row.

grant delete on table public.ataxx_players to service_role;
grant delete on table public.ataxx_matches to service_role;
