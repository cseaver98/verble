"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ArcadeIcon from "../components/ArcadeIcon";
import ArchiveLockGate from "../components/ArchiveLockGate";
import LockedArchiveTile from "../components/LockedArchiveTile";
import useArchiveCompletionStatus from "../components/useArchiveCompletionStatus";
import LoadingLabel from "../components/LoadingLabel";
import MainNav from "../verble/components/MainNav";

type ArchiveItem = { puzzleDate: string };
type ArchiveAccess = { subscriptionsLaunched?: boolean; canAccessArchive?: boolean };
type ArchiveFilter = "all" | "unplayed" | "solved";

const formatDateLabel = (date: string): string => {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};

export default function ArchivePage() {
  const [items, setItems] = useState<ArchiveItem[]>([]);
  const [lockEnabled, setLockEnabled] = useState(false);
  const [archiveAccess, setArchiveAccess] = useState<ArchiveAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [displayMonth, setDisplayMonth] = useState("");
  const [filter, setFilter] = useState<ArchiveFilter>("all");
  const completedDates = useArchiveCompletionStatus("verble", items.map((item) => item.puzzleDate));

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/verble/puzzle/archive", { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Failed to load archive");
        if (!active) return;
        setItems(Array.isArray(payload.items) ? payload.items : []);
        const latest = Array.isArray(payload.items) ? payload.items[0]?.puzzleDate : null;
        if (typeof latest === "string") setDisplayMonth(latest.slice(0, 7));
        setLockEnabled(Boolean(payload.lockEnabled));
        setArchiveAccess(payload.archiveAccess ?? null);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Failed to load archive");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo(() => {
    const sequenceByDate = new Map([...items].sort((a, b) => a.puzzleDate.localeCompare(b.puzzleDate)).map((item, index) => [item.puzzleDate, index + 1]));
    return items.map((item) => {
      const archiveGameNumber = sequenceByDate.get(item.puzzleDate) ?? 1;
      return {
        ...item,
        archiveGameNumber,
        isLocked: lockEnabled && archiveGameNumber === 1,
        isCompleted: completedDates.has(item.puzzleDate),
        dateLabel: formatDateLabel(item.puzzleDate),
        hideDate: lockEnabled && archiveGameNumber === 1,
        tileLabel: lockEnabled && archiveGameNumber === 1 ? "?" : `#${lockEnabled ? archiveGameNumber - 1 : archiveGameNumber}`,
      };
    });
  }, [completedDates, items, lockEnabled]);

  const monthRows = useMemo(() => rows.filter((item) => item.puzzleDate.startsWith(displayMonth) && (filter === "all" || (filter === "solved" ? item.isCompleted : !item.isCompleted))), [rows, displayMonth, filter]);
  const monthItems = useMemo(() => {
    if (!/^\d{4}-\d{2}$/.test(displayMonth)) return [];
    const [year, month] = displayMonth.split("-").map(Number);
    const offset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const byDate = new Map(monthRows.map((item) => [item.puzzleDate, item]));
    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: days }, (_, index) => {
        const date = `${displayMonth}-${String(index + 1).padStart(2, "0")}`;
        return { day: index + 1, item: byDate.get(date) ?? null };
      }),
    ];
  }, [displayMonth, monthRows]);
  const monthTitle = displayMonth ? new Date(`${displayMonth}-01T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }) : "Past Days";
  const latestMonth = rows[0]?.puzzleDate.slice(0, 7) ?? "";
  const earliestMonth = rows.at(-1)?.puzzleDate.slice(0, 7) ?? "";
  const changeMonth = (delta: number) => {
    const [year, month] = displayMonth.split("-").map(Number);
    if (!year || !month) return;
    const next = new Date(Date.UTC(year, month - 1 + delta, 1));
    setDisplayMonth(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`);
  };
  const isSubscriptionLocked = Boolean(archiveAccess?.subscriptionsLaunched && !archiveAccess.canAccessArchive);

  return (
    <div className="verble-shell">
      <MainNav label="" />
      <main className="container">
        {isSubscriptionLocked ? (
          <ArchiveLockGate
            archiveHref="/"
            backLabel="Back to games"
            mode="subscription"
          />
        ) : (
        <section className="card legal-card archive-card arcade-archive-page">
          <div className="arcade-page-heading"><div><p className="arcade-eyebrow">Your Verble journey</p><h1 className="page-title">Past Days</h1><p className="page-subtle">Missed a phrase? Replay past daily challenges.</p></div><Link className="arcade-page-icon" href="/"><ArcadeIcon name="ticket" /> Today</Link></div>
          {loading ? <p className="page-subtle"><LoadingLabel text="Loading archive" /></p> : null}
          {!loading && error ? <p className="page-subtle error-text">{error}</p> : null}

          {!loading && !error ? (
            <>
              {rows.length === 0 ? <p className="page-subtle">No archived Verble games yet.</p> : <>
                <div className="arcade-calendar-toolbar">
                  <div className="arcade-month-switcher"><button type="button" onClick={() => changeMonth(-1)} disabled={displayMonth <= earliestMonth} aria-label="Previous month">‹</button><h2>{monthTitle}</h2><button type="button" onClick={() => changeMonth(1)} disabled={displayMonth >= latestMonth} aria-label="Next month">›</button></div>
                  <button type="button" className="arcade-jump-button" onClick={() => setDisplayMonth(latestMonth)}>Latest puzzles</button>
                </div>
                <div className="arcade-archive-filters" aria-label="Filter past games">
                  {(["all", "unplayed", "solved"] as ArchiveFilter[]).map((value) => <button type="button" key={value} onClick={() => setFilter(value)} aria-pressed={filter === value}>{value === "all" ? "All" : value === "unplayed" ? "Unplayed" : "Solved"}</button>)}
                </div>
                {rows[0] ? <Link href={`/archive/${rows[0].puzzleDate}`} className="arcade-replay-card"><span className="arcade-replay-icon"><ArcadeIcon name="refresh" /></span><span><strong>Ready for another round?</strong><small>Replay the latest past phrase · {rows[0].dateLabel}</small></span><span aria-hidden="true">→</span></Link> : null}
                <div className="arcade-weekdays" aria-hidden="true">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div>
                <div className="archive-grid arcade-calendar-grid">
                  {monthItems.map((day, index) => day ? <div className="arcade-calendar-day" key={day.day}><span className="arcade-day-number">{day.day}</span>{day.item ? <LockedArchiveTile href={`/archive/${day.item.puzzleDate}`} tileLabel={day.item.tileLabel} dateLabel={day.item.dateLabel} isLocked={day.item.isLocked} isCompleted={day.item.isCompleted} hideDate={day.item.hideDate} /> : null}</div> : <div key={`blank-${index}`} className="arcade-calendar-blank" />)}
                </div>
                {monthRows.length === 0 ? <p className="arcade-calendar-empty">No {filter === "all" ? "Verble puzzles" : filter === "solved" ? "solved puzzles" : "unplayed puzzles"} in this month.</p> : null}
              </>}
            </>
          ) : null}
        </section>
        )}
      </main>
    </div>
  );
}
