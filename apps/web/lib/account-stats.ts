import { dailyGames } from "@/lib/games";
import { getTodayPuzzleDate } from "@/lib/puzzle-date";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getDailyStanding, type DailyStanding } from "@/lib/daily-standing";
import {
  calculateBestCompletionStreak,
  calculateCurrentCompletionStreak,
  dedupeDailyCompletions,
} from "@/lib/daily-completion-stats";

type GameResultRow = {
  id: string;
  puzzle_id: string;
  game_slug: string;
  puzzle_date: string;
  is_archive: boolean;
  is_win: boolean;
  guesses_used: number;
  max_guesses: number;
  completed_at: string;
  solve_duration_seconds: number | null;
};

export type GameStats = {
  gameSlug: string;
  gameName: string;
  played: number;
  dailyPlayed: number;
  archivePlayed: number;
  wins: number;
  losses: number;
  winRate: number | null;
  averageGuesses: number | null;
  bestGuesses: number | null;
  currentStreak: number;
  lastPlayedAt: string | null;
};

export type AccountStats = {
  generatedAt: string;
  userId: string;
  overall: {
    played: number;
    dailyPlayed: number;
    archivePlayed: number;
    wins: number;
    losses: number;
    winRate: number | null;
    averageGuesses: number | null;
    currentVerbleStreak: number;
    bestVerbleStreak: number;
    completedTodayCount: number;
    totalGamesToday: number;
    guessDistribution: number[];
    averageSolveSeconds: number | null;
    recordSolveSeconds: number | null;
    timedWins: number;
    latestDailyStanding: (DailyStanding & { puzzleDate: string }) | null;
  };
  games: GameStats[];
};

const roundRate = (value: number) => Math.round(value * 1000) / 1000;
const roundAverage = (value: number) => Math.round(value * 100) / 100;

const summarizeGame = (gameSlug: string, gameName: string, rows: GameResultRow[], today: string): GameStats => {
  const dailyRows = dedupeDailyCompletions(rows, new Set([gameSlug]));
  const archiveRows = rows.filter((row) => row.is_archive);
  const played = dailyRows.length;
  const wins = dailyRows.filter((row) => row.is_win).length;
  const losses = played - wins;
  const guesses = dailyRows.map((row) => row.guesses_used);
  const lastPlayedAt = rows.reduce<string | null>((latest, row) => {
    if (!latest || row.completed_at > latest) {
      return row.completed_at;
    }
    return latest;
  }, null);

  return {
    gameSlug,
    gameName,
    played,
    dailyPlayed: dailyRows.length,
    archivePlayed: archiveRows.length,
    wins,
    losses,
    winRate: played ? roundRate(wins / played) : null,
    averageGuesses: guesses.length ? roundAverage(guesses.reduce((sum, value) => sum + value, 0) / guesses.length) : null,
    bestGuesses: guesses.length ? Math.min(...guesses) : null,
    currentStreak: calculateCurrentCompletionStreak(dailyRows.map((row) => row.puzzle_date), today),
    lastPlayedAt,
  };
};

export async function getAccountStats(userId: string): Promise<AccountStats> {
  const rows: GameResultRow[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await getSupabaseAdmin()
      .schema("core")
      .from("game_results")
      .select("id,game_slug,puzzle_id,puzzle_date,is_archive,is_win,guesses_used,max_guesses,completed_at,solve_duration_seconds")
      .eq("user_id", userId)
      .order("puzzle_date", { ascending: false })
      .order("completed_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + pageSize - 1)
      .returns<GameResultRow[]>();
    if (error) throw new Error(`Failed to load account stats: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  const statsByGame = new Map<string, GameResultRow[]>();
  for (const row of rows) {
    const gameRows = statsByGame.get(row.game_slug) ?? [];
    gameRows.push(row);
    statsByGame.set(row.game_slug, gameRows);
  }

  const today = getTodayPuzzleDate();
  const gameStats = dailyGames.map((game) => summarizeGame(game.slug, game.name, statsByGame.get(game.slug) ?? [], today));
  const dailyRows = dedupeDailyCompletions(rows, new Set(dailyGames.map((game) => game.slug)));
  const archiveRows = rows.filter((row) => row.is_archive);
  const played = dailyRows.length;
  const wins = dailyRows.filter((row) => row.is_win).length;
  const dailyPlayed = dailyRows.length;
  const guesses = dailyRows.map((row) => row.guesses_used);
  const timedWins = dailyRows.filter((row) => row.is_win && row.solve_duration_seconds !== null);
  const timedSeconds = timedWins.map((row) => row.solve_duration_seconds!);
  const latestTimedWin = timedWins[0];
  const latestDailyStanding = latestTimedWin
    ? { ...await getDailyStanding(latestTimedWin.puzzle_id, latestTimedWin.puzzle_date, latestTimedWin.guesses_used, latestTimedWin.solve_duration_seconds!), puzzleDate: latestTimedWin.puzzle_date }
    : null;
  const completedTodayCount = new Set(
    rows
      .filter((row) => !row.is_archive && row.puzzle_date === today && dailyGames.some((game) => game.slug === row.game_slug))
      .map((row) => row.game_slug),
  ).size;

  return {
    generatedAt: new Date().toISOString(),
    userId,
    overall: {
      played,
      dailyPlayed,
      archivePlayed: archiveRows.length,
      wins,
      losses: played - wins,
      winRate: played ? roundRate(wins / played) : null,
      averageGuesses: guesses.length ? roundAverage(guesses.reduce((sum, value) => sum + value, 0) / guesses.length) : null,
      currentVerbleStreak: calculateCurrentCompletionStreak(dailyRows.map((row) => row.puzzle_date), today),
      bestVerbleStreak: calculateBestCompletionStreak(dailyRows.map((row) => row.puzzle_date), today),
      completedTodayCount,
      totalGamesToday: dailyGames.length,
      guessDistribution: Array.from({ length: 6 }, (_, index) => dailyRows.filter((row) => row.is_win && row.guesses_used === index + 1).length),
      averageSolveSeconds: timedSeconds.length ? Math.round(timedSeconds.reduce((sum, value) => sum + value, 0) / timedSeconds.length) : null,
      recordSolveSeconds: timedSeconds.length ? Math.min(...timedSeconds) : null,
      timedWins: timedSeconds.length,
      latestDailyStanding,
    },
    games: gameStats,
  };
}
