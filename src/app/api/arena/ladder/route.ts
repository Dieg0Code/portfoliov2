import { NextResponse } from "next/server";
import { LADDER, unlockedCount } from "@/lib/ataxx/ladder";
import { fetchLadderRows } from "@/lib/supabase/arena";

export const runtime = "nodejs";

const MAX_ROWS = 40;

export type LadderStanding = {
  displayName: string;
  /** Index of the highest rung fully beaten, -1 when none. */
  reached: number;
  reachedLabel: string;
  wins: number;
  games: number;
};

export async function GET() {
  try {
    const rows = await fetchLadderRows();

    const byPlayer = new Map<
      string,
      { displayName: string; wins: Record<string, number>; total: number; games: number }
    >();

    for (const row of rows) {
      let player = byPlayer.get(row.player_id);
      if (!player) {
        player = {
          displayName: row.display_name,
          wins: {},
          total: 0,
          games: 0
        };
        byPlayer.set(row.player_id, player);
      }
      player.games += 1;
      if (row.outcome === "win") {
        player.wins[row.opponent_id] = (player.wins[row.opponent_id] ?? 0) + 1;
        player.total += 1;
      }
    }

    const standings: LadderStanding[] = [...byPlayer.values()].map((player) => {
      // unlockedCount is 1 + rungs cleared, so the highest cleared rung is one back.
      const reached = unlockedCount(player.wins) - 2;
      return {
        displayName: player.displayName,
        reached,
        reachedLabel: reached >= 0 ? LADDER[reached].label : "—",
        wins: player.total,
        games: player.games
      };
    });

    // Highest rung beaten first; then most wins; then fewest games to get there.
    standings.sort(
      (left, right) =>
        right.reached - left.reached ||
        right.wins - left.wins ||
        left.games - right.games
    );

    return NextResponse.json(
      { standings: standings.slice(0, MAX_ROWS) },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("Arena ladder failed", error);
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }
}
