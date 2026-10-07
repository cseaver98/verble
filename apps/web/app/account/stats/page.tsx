import type { Metadata } from "next";
import Link from "next/link";
import MainNav from "../../verble/components/MainNav";
import AccountLoginPanel from "../AccountLoginPanel";
import ArcadeIcon, { type ArcadeIconName } from "../../components/ArcadeIcon";
import { getAccountStats } from "@/lib/account-stats";
import { createSupabaseServerClient } from "@/lib/supabase-auth/server";
import { formatSolveTime } from "@/lib/solve-metrics";

export const metadata: Metadata = {
  title: "Verble Stats",
  description: "View your Verble streak and game stats.",
  robots: { index: false, follow: false },
};

const formatPercent = (value: number | null) => value === null ? "—" : `${Math.round(value * 100)}%`;
const formatAverage = (value: number | null) => value === null ? "—" : value.toFixed(value % 1 === 0 ? 0 : 1);

export default async function AccountStatsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <div className="verble-shell arcade-stats-shell"><MainNav label="" /><main className="arcade-stats-main"><div className="arcade-stats-intro"><p className="arcade-eyebrow">Your performance</p><h1>Verble Stats</h1><p>Keep your streak and results together.</p></div><AccountLoginPanel /></main></div>;

  const stats = await getAccountStats(user.id);
  const gameStats = stats.games.find((game) => game.gameSlug === "verble");
  const distribution = stats.overall.guessDistribution;
  const largestBucket = Math.max(1, ...distribution);
  const cards: Array<{ label: string; value: string; caption: string; icon: ArcadeIconName; tone: string }> = [
    { label: "Challenges", value: String(stats.overall.played), caption: "Daily phrases played", icon: "ticket", tone: "violet" },
    { label: "Win Rate", value: formatPercent(stats.overall.winRate), caption: `${stats.overall.wins} solved`, icon: "check", tone: "mint" },
    { label: "Current Streak", value: String(stats.overall.currentVerbleStreak), caption: "Consecutive days", icon: "bolt", tone: "amber" },
    { label: "Best Streak", value: String(stats.overall.bestVerbleStreak), caption: "Personal best", icon: "sparkle", tone: "violet" },
  ];

  return <div className="verble-shell arcade-stats-shell"><MainNav label="" />
    <main className="arcade-stats-main">
      <div className="arcade-stats-intro"><p className="arcade-eyebrow">Your performance</p><h1>Verble Stats</h1><p>Your daily phrase solving progress.</p></div>
      <div className="arcade-stats-grid">{cards.map((card) => <section key={card.label} className={`arcade-stat-card ${card.tone}`}><div className="arcade-stat-card-top"><span>{card.label}</span><ArcadeIcon name={card.icon} /></div><strong>{card.value}</strong><small>{card.caption}</small></section>)}</div>

      <section className="arcade-stats-panel"><div className="arcade-panel-heading"><div><h2>Guess Distribution</h2><p>Attempts needed to solve the daily phrase</p></div><span className="arcade-panel-pill">{stats.overall.wins} Wins</span></div>
        {stats.overall.wins ? <div className="arcade-distribution">{distribution.map((count, index) => <div className="arcade-distribution-row" key={index}><span>{index + 1}</span><div className="arcade-distribution-track"><div style={{ width: `${Math.max(9, count / largestBucket * 100)}%` }} className={count === largestBucket ? "top" : ""}>{count}</div></div><span>{Math.round(count / stats.overall.wins * 100)}%</span></div>)}</div> : <p className="arcade-empty-stats">Solve your first daily phrase to see your guess distribution.</p>}
      </section>

      <section className="arcade-stats-panel"><div className="arcade-panel-heading"><div><h2>Your Verble breakdown</h2><p>How you play across daily and past puzzles</p></div></div><div className="arcade-breakdown-grid"><div><span>Daily played</span><strong>{stats.overall.dailyPlayed}</strong></div><div><span>Archive played</span><strong>{stats.overall.archivePlayed}</strong></div><div><span>Average guesses</span><strong>{formatAverage(stats.overall.averageGuesses)}</strong></div><div><span>Best solve</span><strong>{gameStats?.bestGuesses ?? "—"}</strong></div></div></section>

      <section className="arcade-stats-panel"><div className="arcade-panel-heading"><div><h2>Solving pace</h2><p>Timed daily wins, measured from your first letter to your final guess</p></div><span className="arcade-panel-pill">{stats.overall.timedWins} timed</span></div>
        <div className="arcade-breakdown-grid"><div><span>Average time</span><strong>{formatSolveTime(stats.overall.averageSolveSeconds)}</strong></div><div><span>Record time</span><strong>{formatSolveTime(stats.overall.recordSolveSeconds)}</strong></div><div><span>Latest standing</span><strong>{stats.overall.latestDailyStanding?.topPercent ? `Top ${stats.overall.latestDailyStanding.topPercent}%` : "—"}</strong></div><div><span>Players compared</span><strong>{stats.overall.latestDailyStanding?.cohortSize ?? "—"}</strong></div></div>
        <p className="arcade-metric-note">{stats.overall.latestDailyStanding ? `Latest standing: ${stats.overall.latestDailyStanding.puzzleDate}. ` : ""}Standing compares timed wins on the same daily puzzle. Fewer guesses rank first; solve time breaks ties. Percentiles appear once five players qualify. Earlier results have no time.</p>
      </section>

      <div className="arcade-stats-actions"><Link href="/" className="arcade-primary-link"><ArcadeIcon name="ticket" />{stats.overall.completedTodayCount ? "Review today's Verble" : "Play today's Verble"}</Link><Link href="/archive" className="arcade-secondary-link"><ArcadeIcon name="calendar" /> Past Days</Link></div>
    </main>
  </div>;
}
