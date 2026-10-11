import { allowedGameSlugs } from "@/lib/games";
import { getOrCreatePlayerId } from "@/lib/player-id";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-auth/server";
import type { PuzzlePlayStatus } from "@/lib/puzzle-play-status";
import { NextRequest, NextResponse } from "next/server";

type ArchiveCompletionRow = {
  puzzle_date: string;
  is_archive: boolean;
  is_win: boolean;
  guesses_used: number;
};

export async function GET(request: NextRequest) {
  try {
    const gameSlug = request.nextUrl.searchParams.get("gameSlug");
    if (!gameSlug || !allowedGameSlugs.has(gameSlug)) {
      return NextResponse.json({ error: "Invalid gameSlug" }, { status: 400 });
    }

    const authClient = await createSupabaseServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    const playerId = user ? null : await getOrCreatePlayerId();
    const supabase = getSupabaseAdmin();

    const query = supabase
      .schema("core")
      .from("game_results")
      .select("puzzle_date,is_archive,is_win,guesses_used")
      .eq("game_slug", gameSlug);

    const { data, error } = user
      ? await query.eq("user_id", user.id).returns<ArchiveCompletionRow[]>()
      : await query.eq("player_id", playerId).is("user_id", null).returns<ArchiveCompletionRow[]>();

    if (error) {
      return NextResponse.json({ error: "Failed to load archive completions", details: error.message }, { status: 500 });
    }

    const resultsByDate = new Map<string, PuzzlePlayStatus>();
    for (const row of data ?? []) {
      const status = resultsByDate.get(row.puzzle_date) ?? { daily: null, archive: null };
      status[row.is_archive ? "archive" : "daily"] = { isWin: row.is_win, guessesUsed: row.guesses_used };
      resultsByDate.set(row.puzzle_date, status);
    }

    return NextResponse.json({
      gameSlug,
      results: [...resultsByDate].map(([puzzleDate, status]) => ({ puzzleDate, ...status })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
