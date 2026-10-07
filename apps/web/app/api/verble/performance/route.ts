import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-auth/server";
import { getExistingPlayerId } from "@/lib/player-id";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getDailyStanding } from "@/lib/daily-standing";

type ResultRow = {
  puzzle_id: string;
  is_archive: boolean;
  is_win: boolean;
  guesses_used: number;
  solve_duration_seconds: number | null;
};

export async function GET(request: NextRequest) {
  const puzzleId = request.nextUrl.searchParams.get("puzzleId");
  const puzzleDate = request.nextUrl.searchParams.get("puzzleDate");
  const isArchive = request.nextUrl.searchParams.get("isArchive") === "true";
  if (!puzzleId || !/^\d{4}-\d{2}-\d{2}$/.test(puzzleDate ?? "")) {
    return NextResponse.json({ error: "Invalid puzzle" }, { status: 400 });
  }

  try {
    const authClient = await createSupabaseServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    const playerId = user ? null : await getExistingPlayerId();
    if (!user && !playerId) return NextResponse.json(null);

    const supabase = getSupabaseAdmin();
    const ownQuery = supabase.schema("core").from("game_results")
      .select("puzzle_id,is_archive,is_win,guesses_used,solve_duration_seconds")
      .eq("game_slug", "verble")
      .eq("puzzle_id", puzzleId)
      .eq("puzzle_date", puzzleDate!)
      .eq("is_archive", isArchive);
    const { data: own, error: ownError } = user
      ? await ownQuery.eq("user_id", user.id).maybeSingle<ResultRow>()
      : await ownQuery.eq("player_id", playerId!).is("user_id", null).maybeSingle<ResultRow>();
    if (ownError) throw ownError;
    if (!own) return NextResponse.json(null);

    const seconds = own.solve_duration_seconds;
    if (isArchive || !own.is_win || seconds === null) {
      return NextResponse.json({ rank: null, cohortSize: 0, topPercent: null, solveDurationSeconds: seconds });
    }

    const standing = await getDailyStanding(puzzleId, puzzleDate!, own.guesses_used, seconds);
    return NextResponse.json({
      ...standing,
      solveDurationSeconds: seconds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load performance";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
