/**
 * Supabase access for the Ataxx arena, over the REST API with the service role.
 * Mirrors the shape of `server-rest.ts`; no client ever touches these tables.
 */

type Locale = "es" | "en";

export type ArenaPlayer = {
  id: string;
  email: string;
  display_name: string;
  locale: Locale;
};

export type MatchOutcome = "win" | "loss" | "draw";

export type ArenaMatchInput = {
  playerId: string;
  opponentId: string;
  opponentKind: "heuristic" | "model";
  outcome: MatchOutcome;
  playerPieces: number;
  opponentPieces: number;
  halfMoves: number;
  moves: (number[] | null)[];
  engineFailures: number;
  durationMs: number | null;
  startingPlayer: 1 | -1;
};

export type StandingRow = {
  player_id: string;
  display_name: string;
  wins: number;
  losses: number;
  draws: number;
  games: number;
  last_played_at: string;
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase server configuration is missing.");
  }

  return { key, url };
}

function createHeaders(key: string, includeJson = false) {
  const headers: Record<string, string> = {
    apikey: key,
    Prefer: "return=representation"
  };

  if (!key.startsWith("sb_")) {
    headers.Authorization = `Bearer ${key}`;
  }

  if (includeJson) headers["Content-Type"] = "application/json";
  return headers;
}

async function parseSupabaseError(response: Response) {
  const message = await response.text();
  return new Error(
    `Supabase request failed (${response.status}): ${message.slice(0, 240)}`
  );
}

/** Look up by email, creating the player on first sight. */
export async function upsertArenaPlayer(input: {
  email: string;
  displayName: string;
  locale: Locale;
}): Promise<ArenaPlayer> {
  const { key, url } = getSupabaseConfig();
  const now = new Date().toISOString();
  const search = new URLSearchParams({
    select: "id,email,display_name,locale",
    email: `eq.${input.email}`
  });

  const existingResponse = await fetch(
    `${url}/rest/v1/ataxx_players?${search}`,
    { headers: createHeaders(key), cache: "no-store" }
  );
  if (!existingResponse.ok) throw await parseSupabaseError(existingResponse);
  const existing = (await existingResponse.json()) as ArenaPlayer[];

  if (existing[0]) {
    const params = new URLSearchParams({
      id: `eq.${existing[0].id}`,
      select: "id,email,display_name,locale"
    });
    const updateResponse = await fetch(
      `${url}/rest/v1/ataxx_players?${params}`,
      {
        method: "PATCH",
        headers: createHeaders(key, true),
        body: JSON.stringify({
          display_name: input.displayName,
          locale: input.locale,
          last_seen_at: now
        }),
        cache: "no-store"
      }
    );
    if (!updateResponse.ok) throw await parseSupabaseError(updateResponse);
    const updated = (await updateResponse.json()) as ArenaPlayer[];
    return updated[0] ?? existing[0];
  }

  const insertResponse = await fetch(`${url}/rest/v1/ataxx_players`, {
    method: "POST",
    headers: createHeaders(key, true),
    body: JSON.stringify({
      email: input.email,
      display_name: input.displayName,
      locale: input.locale,
      created_at: now,
      last_seen_at: now
    }),
    cache: "no-store"
  });
  if (!insertResponse.ok) throw await parseSupabaseError(insertResponse);
  const inserted = (await insertResponse.json()) as ArenaPlayer[];
  if (!inserted[0]?.id) {
    throw new Error("Supabase did not return an arena player id.");
  }
  return inserted[0];
}

export async function recordArenaMatch(input: ArenaMatchInput): Promise<void> {
  const { key, url } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/ataxx_matches`, {
    method: "POST",
    headers: { ...createHeaders(key, true), Prefer: "return=minimal" },
    body: JSON.stringify({
      player_id: input.playerId,
      opponent_id: input.opponentId,
      opponent_kind: input.opponentKind,
      outcome: input.outcome,
      player_pieces: input.playerPieces,
      opponent_pieces: input.opponentPieces,
      half_moves: input.halfMoves,
      moves: input.moves,
      engine_failures: input.engineFailures,
      duration_ms: input.durationMs,
      starting_player: input.startingPlayer
    }),
    cache: "no-store"
  });
  if (!response.ok) throw await parseSupabaseError(response);
}

/** Wins per opponent for one player, which is what drives the unlock logic. */
export async function fetchPlayerWins(
  playerId: string
): Promise<Record<string, number>> {
  const { key, url } = getSupabaseConfig();
  const search = new URLSearchParams({
    select: "opponent_id",
    player_id: `eq.${playerId}`,
    outcome: "eq.win",
    limit: "5000"
  });
  const response = await fetch(`${url}/rest/v1/ataxx_matches?${search}`, {
    headers: createHeaders(key),
    cache: "no-store"
  });
  if (!response.ok) throw await parseSupabaseError(response);

  const rows = (await response.json()) as { opponent_id: string }[];
  const wins: Record<string, number> = {};
  for (const row of rows) {
    wins[row.opponent_id] = (wins[row.opponent_id] ?? 0) + 1;
  }
  return wins;
}

/** Everything needed to rank the ladder: one row per player per opponent. */
export async function fetchLadderRows(): Promise<
  { player_id: string; display_name: string; opponent_id: string; outcome: MatchOutcome }[]
> {
  const { key, url } = getSupabaseConfig();
  const search = new URLSearchParams({
    select: "player_id,opponent_id,outcome,ataxx_players(display_name)",
    limit: "20000"
  });
  const response = await fetch(`${url}/rest/v1/ataxx_matches?${search}`, {
    headers: createHeaders(key),
    cache: "no-store"
  });
  if (!response.ok) throw await parseSupabaseError(response);

  const rows = (await response.json()) as {
    player_id: string;
    opponent_id: string;
    outcome: MatchOutcome;
    ataxx_players: { display_name: string } | null;
  }[];

  return rows.map((row) => ({
    player_id: row.player_id,
    display_name: row.ataxx_players?.display_name ?? "—",
    opponent_id: row.opponent_id,
    outcome: row.outcome
  }));
}
