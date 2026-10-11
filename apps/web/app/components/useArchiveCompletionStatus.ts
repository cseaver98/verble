"use client";

import { useEffect, useMemo, useState } from "react";

type ArchiveCompletionResponse = {
  results?: Array<{ puzzleDate: string; isWin: boolean }>;
  error?: string;
};

const emptyResults = new Map<string, boolean>();

export default function useArchiveCompletionStatus(gameSlug: string, puzzleDates: string[]) {
  const [results, setResults] = useState<Map<string, boolean>>(new Map());
  const dateKey = useMemo(() => puzzleDates.join("|"), [puzzleDates]);

  useEffect(() => {
    if (!puzzleDates.length) {
      return;
    }

    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/completions/archive?gameSlug=${encodeURIComponent(gameSlug)}`, { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as ArchiveCompletionResponse;
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load archive completion status");
        }
        if (!active) return;
        setResults(new Map(Array.isArray(payload.results) ? payload.results.map((result) => [result.puzzleDate, result.isWin]) : []));
      } catch (error) {
        if (!active) return;
        console.warn(error instanceof Error ? error.message : "Failed to load archive completion status");
        setResults(new Map());
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [dateKey, gameSlug, puzzleDates.length]);

  return puzzleDates.length ? results : emptyResults;
}
