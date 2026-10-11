"use client";

import { useEffect, useMemo, useState } from "react";
import type { PuzzlePlayStatus } from "@/lib/puzzle-play-status";

type ArchiveCompletionResponse = {
  results?: Array<{ puzzleDate: string } & PuzzlePlayStatus>;
  error?: string;
};

const emptyResults = new Map<string, PuzzlePlayStatus>();

export default function useArchiveCompletionStatus(gameSlug: string, puzzleDates: string[], refreshKey = 0) {
  const [results, setResults] = useState<Map<string, PuzzlePlayStatus>>(new Map());
  const [loadedKey, setLoadedKey] = useState("");
  const dateKey = useMemo(() => puzzleDates.join("|"), [puzzleDates]);
  const requestKey = `${gameSlug}:${dateKey}:${refreshKey}`;

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
        setResults(new Map(Array.isArray(payload.results) ? payload.results.map((result) => [result.puzzleDate, { daily: result.daily, archive: result.archive }]) : []));
        setLoadedKey(requestKey);
      } catch (error) {
        if (!active) return;
        console.warn(error instanceof Error ? error.message : "Failed to load archive completion status");
        setResults(new Map());
        setLoadedKey(requestKey);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [dateKey, gameSlug, refreshKey, requestKey, puzzleDates.length]);

  return { results: puzzleDates.length ? results : emptyResults, loaded: puzzleDates.length ? loadedKey === requestKey : true };
}
