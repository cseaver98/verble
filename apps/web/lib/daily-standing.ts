import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type DailyStanding = { rank: number; cohortSize: number; topPercent: number | null };

export async function getDailyStanding(puzzleId: string, puzzleDate: string, guessesUsed: number, seconds: number): Promise<DailyStanding> {
  const supabase = getSupabaseAdmin();
  const base = () => supabase.schema("core").from("game_results")
    .select("id", { count: "exact", head: true })
    .eq("game_slug", "verble")
    .eq("puzzle_id", puzzleId)
    .eq("puzzle_date", puzzleDate)
    .eq("is_archive", false)
    .eq("is_win", true)
    .not("solve_duration_seconds", "is", null);
  const [total, fewerGuesses, fasterTie] = await Promise.all([
    base(),
    base().lt("guesses_used", guessesUsed),
    base().eq("guesses_used", guessesUsed).lt("solve_duration_seconds", seconds),
  ]);
  if (total.error || fewerGuesses.error || fasterTie.error) {
    throw total.error ?? fewerGuesses.error ?? fasterTie.error;
  }
  const cohortSize = total.count ?? 0;
  const rank = (fewerGuesses.count ?? 0) + (fasterTie.count ?? 0) + 1;
  return { rank, cohortSize, topPercent: cohortSize >= 5 ? Math.max(1, Math.ceil(rank / cohortSize * 100)) : null };
}
