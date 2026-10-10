"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { VerbleUnavailable } from "@verble/ui";
import ArchiveLockGate from "../../components/ArchiveLockGate";
import HowToPlayDialog from "../../components/HowToPlayDialog";
import ResultDialogActions from "../../components/ResultDialogActions";
import ResultOutcomeEffects from "../../components/ResultOutcomeEffects";
import MainNav from "./MainNav";
import { normalizePhraseWithPunctuation } from "../../../lib/verble/puzzle-repository";
import { toPublicAppUrl } from "../../../lib/app-url";
import { recordGameCompletionQuietly } from "../../../lib/record-game-completion";
import { buildResultPayload } from "../../../lib/result-payload";
import { buildGameShareText, shareResultText } from "../../../lib/share-results";
import { fetchStoredGameResult, getResultPayloadAnswer, getResultPayloadAttempts } from "../../../lib/stored-game-result";
import { useNextGameCountdown } from "../../../lib/use-next-game-countdown";
import LoadingLabel from "../../components/LoadingLabel";
import GuessProgressChip from "../../components/GuessProgressChip";
import useHowToPlayDialog from "../../components/useHowToPlayDialog";
import { trackGameStarted } from "../../../lib/analytics-client";
import { formatSolveTime, getSolveDurationSeconds } from "../../../lib/solve-metrics";

type VerbleGameClientProps = {
  apiUrl: string;
  navLabel?: string;
  archiveHref?: string;
  storagePrefix?: string;
  completionPrefix?: string;
  lockDailyCompletion?: boolean;
};

type Slot = {
  index: number;
  length: number;
  display: string;
  separator: string;
};

type DisplayChar =
  | { kind: "letter"; value: string; letterIndex: number; trailingFixed: string }
  | { kind: "fixed"; value: string; letterIndex: null; trailingFixed?: never };

type VerblePuzzle = {
  puzzleId: string;
  puzzleDate: string;
  archiveGameNumber?: number;
  phraseTemplate: string;
  sourceNote: string | null;
  slots: Slot[];
  maxGuesses: number;
  answerWords: string[];
};

type LetterFeedback = "correct" | "present" | "absent";
type KeyboardState = "unknown" | "absent" | "present" | "resolved";
type GameState = "playing" | "won" | "lost";
type ResultAccountStats = { overall: { played: number; winRate: number | null; currentVerbleStreak: number; bestVerbleStreak: number } };
type ResultPerformance = { rank: number | null; cohortSize: number; topPercent: number | null; solveDurationSeconds: number | null };

type WordAttempt = {
  slotIndex: number;
  guess: string;
  feedback: LetterFeedback[];
};

const toShareFeedbackBlock = (feedback: LetterFeedback | "empty") => {
  if (feedback === "correct") return "🟩";
  if (feedback === "present") return "🟨";
  return "🟥";
};

const buildVerbleShareRow = ({
  slots,
  slotMarks,
  didWin,
}: {
  slots: Slot[];
  slotMarks: SlotMarks;
  didWin: boolean;
}) => slots
  .map((slot) => Array.from({ length: slot.length }, (_, index) => (
    toShareFeedbackBlock(didWin ? "correct" : slotMarks[slot.index]?.[index] || "empty")
  )).join("\u2060"))
  .join(" ");

type SlotDrafts = Record<number, string[]>;
type SlotLocks = Record<number, boolean[]>;
type SlotMarks = Record<number, Array<LetterFeedback | "empty">>;

type GuessWordResponse = {
  feedback?: LetterFeedback[];
  isCorrect?: boolean;
  normalizedGuess?: string;
  error?: string;
};

type RestoredVerbleState = {
  gameState: GameState;
  message: string;
  selectedSlot: number | null;
  wordAttempts: WordAttempt[];
  solvedWords: Record<number, string>;
  slotDrafts: SlotDrafts;
  slotLocks: SlotLocks;
  slotMarks: SlotMarks;
  guessesUsed: number;
  startedAt?: number | null;
  solveDurationSeconds?: number | null;
};

type VerbleCompletionSnapshot = {
  puzzleId: string;
  gameState: Exclude<GameState, "playing">;
  message: string;
  wordAttempts: WordAttempt[];
  solvedWords: Record<number, string>;
  slotDrafts: SlotDrafts;
  slotLocks: SlotLocks;
  slotMarks: SlotMarks;
  guessesUsed: number;
  startedAt?: number | null;
  solveDurationSeconds?: number | null;
};

const ALPHA_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const FLIP_DURATION_MS = 260;
const FLIP_STAGGER_MS = 208;
const WORD_REVEAL_STAGGER_MS = 180;
const GLOBAL_REVEAL_DELAY_MS = 180;
const SLOW_FLIP_DURATION_MS = FLIP_DURATION_MS * 2;

const normalizeWord = (value: string): string => value.toLowerCase().replace(/[^a-z]/g, "");

const buildVerbleCompletionSnapshot = ({
  puzzleId,
  gameState,
  message = "",
  wordAttempts,
  solvedWords,
  slotDrafts,
  slotLocks,
  slotMarks,
  guessesUsed,
  startedAt = null,
  solveDurationSeconds = null,
}: VerbleCompletionSnapshot): VerbleCompletionSnapshot => ({
  puzzleId,
  gameState,
  message,
  wordAttempts,
  solvedWords,
  slotDrafts,
  slotLocks,
  slotMarks,
  guessesUsed,
  startedAt,
  solveDurationSeconds,
});

const getFlipVisual = (feedback: LetterFeedback | "empty") => {
  if (feedback === "correct") {
    return { bg: "#10b981", color: "#ffffff" };
  }
  if (feedback === "present") {
    return { bg: "#fbbf24", color: "#181445" };
  }
  if (feedback === "absent") {
    return { bg: "#94a3b8", color: "#ffffff" };
  }
  return { bg: "#ffffff", color: "#181445" };
};

const buildDisplayedWordChars = (slot: Slot, letters: string[]): DisplayChar[] => {
  let letterCursor = 0;
  return slot.display.split("").reduce<DisplayChar[]>((items, char) => {
    if (/[A-Za-z]/.test(char)) {
      const next = letters[letterCursor] || "";
      const currentIndex = letterCursor;
      letterCursor += 1;
      items.push({ kind: "letter", value: next, letterIndex: currentIndex, trailingFixed: "" });
      return items;
    }
    const previous = items[items.length - 1];
    if (previous?.kind === "letter") {
      previous.trailingFixed += char;
      return items;
    }
    items.push({ kind: "fixed", value: char, letterIndex: null });
    return items;
  }, []);
};

const buildSurfaceWordGuess = (slot: Slot, letters: string[]): string => {
  let letterCursor = 0;
  return slot.display.split("").map((char) => {
    if (/[A-Za-z]/.test(char)) {
      const next = letters[letterCursor] || "";
      letterCursor += 1;
      return next;
    }
    return char;
  }).join("");
};

const getPerformanceLabel = (didWin: boolean, attemptsUsed: number, maxGuesses: number) => {
  if (!didWin) return "Better luck next time.";
  if (attemptsUsed <= 1) return "Perfect!";
  if (attemptsUsed === 2) return "Amazing!";
  if (attemptsUsed === 3) return "Brilliant!";
  if (attemptsUsed === 4) return "Splendid!";
  if (maxGuesses >= 6 && attemptsUsed === 5) return "Nicely done!";
  return "Just in time!";
};


export default function VerbleGameClient({
  apiUrl,
  navLabel = "Verble",
  archiveHref = "/archive",
  storagePrefix = "verble:v1:today",
  completionPrefix = "verble:v1:completed",
  lockDailyCompletion = true,
}: VerbleGameClientProps) {
  const isArchiveView = apiUrl.includes("/by-date");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [puzzle, setPuzzle] = useState<VerblePuzzle | null>(null);
  const [gameState, setGameState] = useState<GameState>("playing");
  const [message, setMessage] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [invalidGuessFeedback, setInvalidGuessFeedback] = useState<{ slotIndex: number; sequence: number } | null>(null);
  const invalidGuessSequenceRef = useRef(0);
  const [wordAttempts, setWordAttempts] = useState<WordAttempt[]>([]);
  const [solvedWords, setSolvedWords] = useState<Record<number, string>>({});
  const [slotDrafts, setSlotDrafts] = useState<SlotDrafts>({});
  const [slotLocks, setSlotLocks] = useState<SlotLocks>({});
  const [slotMarks, setSlotMarks] = useState<SlotMarks>({});
  const [guessesUsed, setGuessesUsed] = useState(0);
  const [copyStatus, setCopyStatus] = useState("");
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [resultAccountStats, setResultAccountStats] = useState<ResultAccountStats | null>(null);
  const [resultPerformance, setResultPerformance] = useState<ResultPerformance | null>(null);
  const [solveDurationSeconds, setSolveDurationSeconds] = useState<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const timingEligibleRef = useRef(true);
  const { isHowToPlayOpen, openHowToPlay, closeHowToPlay } = useHowToPlayDialog("verble", Boolean(puzzle) && !loading);
  const [isPhraseConfirmOpen, setIsPhraseConfirmOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [archiveLock, setArchiveLock] = useState<{ title: string; description: string } | null>(null);
  const [revealState, setRevealState] = useState<{
    slotIndex: number;
    letters: string[];
    feedback: LetterFeedback[];
    revealIndices: number[];
    startFeedback: Array<LetterFeedback | "empty">;
  } | null>(null);
  const [heldRevealState, setHeldRevealState] = useState<{
    slotIndex: number;
    letters: string[];
    feedback: LetterFeedback[];
    revealIndices: number[];
    startFeedback: Array<LetterFeedback | "empty">;
  } | null>(null);
  const [phraseRevealState, setPhraseRevealState] = useState<Array<{
    slotIndex: number;
    letters: string[];
    feedback: LetterFeedback[];
    wordDelayMs: number;
    revealIndices: number[];
  }> | null>(null);
  const [globalRevealState, setGlobalRevealState] = useState<{
    entries: Array<{
      slotIndex: number;
      letters: string[];
      feedback: LetterFeedback[];
      revealIndices: number[];
      wordDelayMs: number;
    }>;
  } | null>(null);
  const [postRevealState, setPostRevealState] = useState<{
    slotIndex: number;
    letters: string[];
    feedback: Array<LetterFeedback | "empty">;
    revealIndices: number[];
  } | null>(null);
  const [isResolvingGuess, setIsResolvingGuess] = useState(false);
  const shouldShowNextGameCountdown = lockDailyCompletion && !isArchiveView && gameState !== "playing";
  const nextGameCountdown = useNextGameCountdown(shouldShowNextGameCountdown);

  useEffect(() => {
    if (!invalidGuessFeedback) return;
    const timeoutId = window.setTimeout(() => setInvalidGuessFeedback(null), 650);
    return () => window.clearTimeout(timeoutId);
  }, [invalidGuessFeedback]);

  useEffect(() => {
    if (!isResultOpen || gameState === "playing") return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/account/stats", { cache: "no-store", signal: controller.signal });
        if (response.ok) setResultAccountStats(await response.json() as ResultAccountStats);
      } catch {
        // Guest results remain useful without account stats.
      }
    }, 700);
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [isResultOpen, gameState]);

  useEffect(() => {
    if (!isResultOpen || gameState === "playing" || !puzzle) return;
    let active = true;
    const load = async (attempt: number) => {
      const params = new URLSearchParams({ puzzleId: puzzle.puzzleId, puzzleDate: puzzle.puzzleDate, isArchive: String(isArchiveView) });
      try {
        const response = await fetch(`/api/verble/performance?${params}`, { cache: "no-store" });
        if (!active) return;
        if (response.ok) {
          const payload = await response.json() as ResultPerformance | null;
          if (payload) {
            setResultPerformance(payload);
            setSolveDurationSeconds(payload.solveDurationSeconds);
            return;
          }
        }
      } catch { /* A locally saved result can still be shown while offline. */ }
      if (active && attempt < 3) window.setTimeout(() => void load(attempt + 1), 700);
    };
    void load(0);
    return () => { active = false; };
  }, [isResultOpen, gameState, puzzle, isArchiveView]);

  const createInitialSlotDrafts = (slots: Slot[]): SlotDrafts =>
    Object.fromEntries(slots.map((slot) => [slot.index, Array.from({ length: slot.length }, () => "")]));

  const createInitialSlotLocks = (slots: Slot[]): SlotLocks =>
    Object.fromEntries(slots.map((slot) => [slot.index, Array.from({ length: slot.length }, () => false)]));

  const createInitialSlotMarks = (slots: Slot[]): SlotMarks =>
    Object.fromEntries(slots.map((slot) => [slot.index, Array.from({ length: slot.length }, () => "empty")]));

  const getDefaultRestoredState = (targetPuzzle: VerblePuzzle): RestoredVerbleState => ({
    gameState: "playing",
    message: "",
    selectedSlot: null,
    wordAttempts: [],
    solvedWords: {},
    slotDrafts: createInitialSlotDrafts(targetPuzzle.slots || []),
    slotLocks: createInitialSlotLocks(targetPuzzle.slots || []),
    slotMarks: createInitialSlotMarks(targetPuzzle.slots || []),
    guessesUsed: 0,
    startedAt: null,
    solveDurationSeconds: null,
  });

  const restoreVerbleState = ({
    targetPuzzle,
    progressKey,
    completionKey,
    lockDailyCompletion,
  }: {
    targetPuzzle: VerblePuzzle;
    progressKey: string;
    completionKey: string;
    lockDailyCompletion: boolean;
  }): RestoredVerbleState => {
    const parseStored = (raw: string, key: string, includeDraftState: boolean) => {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.puzzleId && parsed.puzzleId !== targetPuzzle.puzzleId) {
          return getDefaultRestoredState(targetPuzzle);
        }

        const parsedState = parsed.gameState;
        const solvedWords = parsed.solvedWords && typeof parsed.solvedWords === "object" ? parsed.solvedWords : {};
        const fallbackSlotDrafts = createInitialSlotDrafts(targetPuzzle.slots || []);
        const fallbackSlotLocks = createInitialSlotLocks(targetPuzzle.slots || []);
        const fallbackSlotMarks = createInitialSlotMarks(targetPuzzle.slots || []);
        targetPuzzle.slots.forEach((slot) => {
          const solvedWord = typeof solvedWords[slot.index] === "string" ? solvedWords[slot.index] : "";
          if (!solvedWord) {
            return;
          }
          fallbackSlotDrafts[slot.index] = solvedWord.split("");
          fallbackSlotLocks[slot.index] = Array.from({ length: slot.length }, () => true);
          fallbackSlotMarks[slot.index] = Array.from({ length: slot.length }, () => "correct");
        });

        return {
          gameState: parsedState === "won" || parsedState === "lost" ? parsedState : "playing",
          message: typeof parsed.message === "string" ? parsed.message : "",
          selectedSlot: includeDraftState && typeof parsed.selectedSlot === "number" ? parsed.selectedSlot : null,
          wordAttempts: Array.isArray(parsed.wordAttempts) ? parsed.wordAttempts : [],
          solvedWords,
          slotDrafts:
            includeDraftState && parsed.slotDrafts && typeof parsed.slotDrafts === "object"
              ? parsed.slotDrafts
              : fallbackSlotDrafts,
          slotLocks:
            includeDraftState && parsed.slotLocks && typeof parsed.slotLocks === "object"
              ? parsed.slotLocks
              : fallbackSlotLocks,
          slotMarks:
            includeDraftState && parsed.slotMarks && typeof parsed.slotMarks === "object"
              ? parsed.slotMarks
              : fallbackSlotMarks,
          guessesUsed: Number.isFinite(parsed.guessesUsed) ? Number(parsed.guessesUsed) : 0,
          startedAt: typeof parsed.startedAt === "number" && Number.isFinite(parsed.startedAt) ? parsed.startedAt : null,
          solveDurationSeconds: typeof parsed.solveDurationSeconds === "number" ? parsed.solveDurationSeconds : null,
        } satisfies RestoredVerbleState;
      } catch {
        window.localStorage.removeItem(key);
        return getDefaultRestoredState(targetPuzzle);
      }
    };

    if (lockDailyCompletion) {
      const completionRaw = window.localStorage.getItem(completionKey);
      if (completionRaw) {
        return parseStored(completionRaw, completionKey, true);
      }
    }

    const raw = window.localStorage.getItem(progressKey);
    if (!raw) {
      return getDefaultRestoredState(targetPuzzle);
    }

    const restored = parseStored(raw, progressKey, true);
    if (!lockDailyCompletion && restored.gameState !== "playing") {
      window.localStorage.removeItem(progressKey);
      return getDefaultRestoredState(targetPuzzle);
    }
    return restored;
  };

  useEffect(() => {
    let active = true;

    const loadPuzzle = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(apiUrl, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (response.status === 423) {
          if (active) {
            setPuzzle(null);
            setArchiveLock({
              title: typeof payload.lockTitle === "string" ? payload.lockTitle : "Archive Game #1 is locked",
              description: typeof payload.lockDescription === "string" ? payload.lockDescription : "Enter the shared password to open this retired archive game.",
            });
            setError("");
          }
          return;
        }
        if (!response.ok) {
          if (response.status === 404) {
            if (active) {
              setPuzzle(null);
              setArchiveLock(null);
              setError("");
            }
            return;
          }
          throw new Error(payload.error || "Failed to load Verble puzzle");
        }
        if (!active) return;

        const progressKey = `${storagePrefix}:${payload.puzzleId}`;
        const completionKey = `${completionPrefix}:${payload.puzzleId}`;
        const storedResult = await fetchStoredGameResult({
          gameSlug: "verble",
          puzzleId: payload.puzzleId,
          puzzleDate: payload.puzzleDate,
          isArchive: isArchiveView,
        });
        if (storedResult) {
          const localState = storedResult.resultPayload.localState && typeof storedResult.resultPayload.localState === "object" && !Array.isArray(storedResult.resultPayload.localState)
            ? storedResult.resultPayload.localState
            : null;
          const answer = getResultPayloadAnswer(storedResult);
          const words = answer.words && typeof answer.words === "object" && !Array.isArray(answer.words)
            ? answer.words as Record<string, string>
            : payload.answerWords;
          const completedDrafts = Object.fromEntries(
            payload.slots.map((slot: Slot) => [slot.index, (words[slot.index] || "").split("")]),
          );
          const completedLocks = Object.fromEntries(
            payload.slots.map((slot: Slot) => [slot.index, Array.from({ length: slot.length }, () => storedResult.isWin)]),
          );
          const completedMarks = Object.fromEntries(
            payload.slots.map((slot: Slot) => [slot.index, Array.from({ length: slot.length }, () => storedResult.isWin ? "correct" : "absent")]),
          );
          window.localStorage.setItem(
            completionKey,
            JSON.stringify(
              localState ?? {
                puzzleId: payload.puzzleId,
                gameState: storedResult.isWin ? "won" : "lost",
                message: "",
                wordAttempts: getResultPayloadAttempts(storedResult),
                solvedWords: storedResult.isWin ? words : {},
                slotDrafts: completedDrafts,
                slotLocks: completedLocks,
                slotMarks: completedMarks,
                guessesUsed: storedResult.guessesUsed,
                solveDurationSeconds: storedResult.solveDurationSeconds,
              },
            ),
          );
        }

        const restoredState = restoreVerbleState({
          targetPuzzle: payload,
          progressKey,
          completionKey,
          lockDailyCompletion,
        });
        setPuzzle(payload);
        setArchiveLock(null);
        setGameState(restoredState.gameState);
        setMessage(restoredState.message);
        setWordAttempts(restoredState.wordAttempts);
        setSolvedWords(restoredState.solvedWords);
        setSlotDrafts(restoredState.slotDrafts);
        setSlotLocks(restoredState.slotLocks);
        setSlotMarks(restoredState.slotMarks);
        setGuessesUsed(restoredState.guessesUsed);
        startedAtRef.current = restoredState.startedAt ?? null;
        timingEligibleRef.current = restoredState.startedAt != null || (restoredState.wordAttempts.length === 0 && Object.values(restoredState.slotDrafts).every((letters) => letters.every((letter) => !letter)));
        setSolveDurationSeconds(storedResult?.solveDurationSeconds ?? restoredState.solveDurationSeconds ?? null);
        setResultPerformance(null);
        setSelectedSlot(restoredState.selectedSlot);
        setCopyStatus("");
        setIsResultOpen(restoredState.gameState !== "playing");
        setIsPhraseConfirmOpen(false);
        setIsHistoryOpen(false);
        setRevealState(null);
        setHeldRevealState(null);
        setPhraseRevealState(null);
        setGlobalRevealState(null);
        setPostRevealState(null);
        setIsResolvingGuess(false);
      } catch (loadError) {
        if (!active) return;
        setArchiveLock(null);
        setError(loadError instanceof Error ? loadError.message : "Failed to load Verble puzzle");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPuzzle();
    return () => {
      active = false;
    };
  }, [apiUrl, completionPrefix, lockDailyCompletion, storagePrefix]);

  const progressKey = useMemo(() => {
    if (!puzzle?.puzzleId) return null;
    return `${storagePrefix}:${puzzle.puzzleId}`;
  }, [puzzle, storagePrefix]);

  const completionKey = useMemo(() => {
    if (!puzzle?.puzzleId) return null;
    return `${completionPrefix}:${puzzle.puzzleId}`;
  }, [completionPrefix, puzzle]);

  useEffect(() => {
    if (!progressKey || !puzzle) return;
    window.localStorage.setItem(
      progressKey,
      JSON.stringify({
        gameState,
        message,
        selectedSlot,
        wordAttempts,
        solvedWords,
        slotDrafts,
        slotLocks,
        slotMarks,
        guessesUsed,
        startedAt: startedAtRef.current,
        solveDurationSeconds,
      }),
    );
  }, [gameState, message, selectedSlot, wordAttempts, solvedWords, slotDrafts, slotLocks, slotMarks, guessesUsed, solveDurationSeconds, progressKey, puzzle]);

  useEffect(() => {
    if (!completionKey || !lockDailyCompletion || gameState === "playing" || !puzzle) return;
    window.localStorage.setItem(
      completionKey,
      JSON.stringify(buildVerbleCompletionSnapshot({
        puzzleId: puzzle.puzzleId,
        gameState,
        message,
        wordAttempts,
        solvedWords,
        slotDrafts,
        slotLocks,
        slotMarks,
        guessesUsed,
        startedAt: startedAtRef.current,
        solveDurationSeconds,
      })),
    );
  }, [completionKey, gameState, guessesUsed, lockDailyCompletion, message, puzzle, slotDrafts, slotLocks, slotMarks, solvedWords, wordAttempts, solveDurationSeconds]);


  useEffect(() => {
    if (!revealState) {
      return;
    }

    const revealTotalMs = Math.max(0, (revealState.revealIndices.length - 1) * FLIP_STAGGER_MS + FLIP_DURATION_MS + 120);
    const timeoutId = window.setTimeout(() => setRevealState(null), revealTotalMs);
    return () => window.clearTimeout(timeoutId);
  }, [revealState]);

  const maxGuesses = Number.isFinite(puzzle?.maxGuesses) ? Number(puzzle?.maxGuesses) : 6;
  const allSolved = puzzle ? puzzle.slots.every((slot) => Boolean(solvedWords[slot.index])) : false;
  const selectedSlotMeta = puzzle?.slots.find((slot) => slot.index === selectedSlot);
  const selectedSlotDraft = selectedSlotMeta ? slotDrafts[selectedSlotMeta.index] || Array.from({ length: selectedSlotMeta.length }, () => "") : [];
  const selectedSlotLockState = selectedSlotMeta ? slotLocks[selectedSlotMeta.index] || Array.from({ length: selectedSlotMeta.length }, () => false) : [];
  const buildCurrentPhraseGuess = () => {
    if (!puzzle) return "";
    return puzzle.slots.map((slot) => {
      const draft = slotDrafts[slot.index] || Array.from({ length: slot.length }, () => "");
      return `${buildSurfaceWordGuess(slot, draft)}${slot.separator}`;
    }).join("");
  };
  const canSubmitFullPhraseGuess =
    gameState === "playing"
    && !isResolvingGuess
    && !!puzzle
    && puzzle.slots.every((slot) => {
      if (solvedWords[slot.index]) {
        return true;
      }
      const draft = slotDrafts[slot.index] || [];
      return draft.length === slot.length && draft.every(Boolean);
    });
  const canSubmitWordGuess =
    gameState === "playing"
    && !isResolvingGuess
    && Boolean(selectedSlotMeta)
    && selectedSlotDraft.length === (selectedSlotMeta?.length || 0)
    && selectedSlotDraft.every((letter) => Boolean(letter));
  const shouldSubmitLastUnsolvedWord =
    canSubmitWordGuess
    && !!puzzle
    && !!selectedSlotMeta
    && puzzle.slots.every((slot) => (
      slot.index === selectedSlotMeta.index || Boolean(solvedWords[slot.index])
    ));
  const canOpenFullPhraseConfirm = canSubmitFullPhraseGuess && !shouldSubmitLastUnsolvedWord;
  const shouldShowPickWordLift =
    gameState === "playing"
    && !selectedSlotMeta
    && !isResolvingGuess;

  const moveSelectedSlot = (direction: 1 | -1) => {
    if (!puzzle || gameState !== "playing" || isResolvingGuess) {
      return;
    }

    const playableSlots = puzzle.slots.filter((slot) => !solvedWords[slot.index]);
    if (playableSlots.length === 0) {
      return;
    }

    const currentIndex = playableSlots.findIndex((slot) => slot.index === selectedSlot);
    if (currentIndex === -1) {
      setInvalidGuessFeedback(null);
      setSelectedSlot(direction > 0 ? playableSlots[0].index : playableSlots[playableSlots.length - 1].index);
      setMessage("");
      return;
    }

    const nextIndex = (currentIndex + direction + playableSlots.length) % playableSlots.length;
    setInvalidGuessFeedback(null);
    setSelectedSlot(playableSlots[nextIndex].index);
    setMessage("");
  };

  const updateSelectedDraft = (updater: (current: string[], locks: boolean[]) => string[]) => {
    if (!selectedSlotMeta || selectedSlot === null || gameState !== "playing" || isResolvingGuess || Boolean(solvedWords[selectedSlot])) {
      return;
    }

    const applyDraftUpdate = (current: SlotDrafts) => {
      const currentDraft = current[selectedSlotMeta.index] || Array.from({ length: selectedSlotMeta.length }, () => "");
      const currentLocks = slotLocks[selectedSlotMeta.index] || Array.from({ length: selectedSlotMeta.length }, () => false);
      const nextDraft = updater([...currentDraft], [...currentLocks]).slice(0, selectedSlotMeta.length);
      while (nextDraft.length < selectedSlotMeta.length) {
        nextDraft.push("");
      }
      return {
        ...current,
        [selectedSlotMeta.index]: nextDraft.map((letter) => normalizeWord(letter).slice(-1)),
      };
    };

    setSlotDrafts(applyDraftUpdate);
  };

  const appendWordGuessChar = (char: string) => {
    if (selectedSlotMeta && gameState === "playing" && timingEligibleRef.current && startedAtRef.current === null) {
      startedAtRef.current = Date.now();
    }
    updateSelectedDraft((current, locks) => {
      const next = [...current];
      const openIndex = next.findIndex((letter, index) => !locks[index] && !letter);
      if (openIndex === -1) {
        return next;
      }
      next[openIndex] = char;
      return next;
    });
  };

  const removeWordGuessChar = () => {
    updateSelectedDraft((current, locks) => {
      const next = [...current];
      for (let index = next.length - 1; index >= 0; index -= 1) {
        if (!locks[index] && next[index]) {
          next[index] = "";
          break;
        }
      }
      return next;
    });
  };

  const clearWordGuess = () => {
    updateSelectedDraft((current, locks) => current.map((letter, index) => (locks[index] ? letter : "")));
  };

  const keyboardState = useMemo(() => {
    if (!puzzle) return {} as Record<string, KeyboardState>;
    const answerCounts: Record<string, number> = {};
    puzzle.answerWords.forEach((word) => {
      word.split("").forEach((ch) => {
        answerCounts[ch] = (answerCounts[ch] || 0) + 1;
      });
    });

    const resolvedCounts: Record<string, number> = {};
    puzzle.slots.forEach((slot) => {
      const draft = slotDrafts[slot.index] || Array.from({ length: slot.length }, () => "");
      const locks = slotLocks[slot.index] || Array.from({ length: slot.length }, () => false);
      draft.forEach((ch, index) => {
        if (!locks[index] || !ch) {
          return;
        }
        resolvedCounts[ch] = (resolvedCounts[ch] || 0) + 1;
      });
    });

    const seenLetters = new Set<string>();
    wordAttempts.forEach((attempt) => {
      attempt.guess.split("").forEach((ch) => seenLetters.add(ch));
    });

    const presentHints = new Set<string>();
    wordAttempts.forEach((attempt) => {
      attempt.guess.split("").forEach((ch, idx) => {
        const mark = attempt.feedback[idx];
        if (mark === "correct" || mark === "present") {
          presentHints.add(ch);
        }
      });
    });

    const states: Record<string, KeyboardState> = {};
    for (let code = 97; code <= 122; code += 1) {
      const ch = String.fromCharCode(code);
      const total = answerCounts[ch] || 0;
      const resolved = resolvedCounts[ch] || 0;
      const seen = seenLetters.has(ch);
      const knowsPresent = (seen && total > 0) || presentHints.has(ch) || resolved > 0;

      if (total > 0 && resolved >= total) {
        states[ch] = "resolved";
      } else if (knowsPresent) {
        states[ch] = "present";
      } else if (seen && total === 0) {
        states[ch] = "absent";
      } else {
        states[ch] = "unknown";
      }
    }

    return states;
  }, [puzzle, slotDrafts, slotLocks, wordAttempts]);

  const submitWordGuess = async () => {
    if (!puzzle || gameState !== "playing" || !selectedSlotMeta || isResolvingGuess) return;

    const surfacedGuess = buildSurfaceWordGuess(selectedSlotMeta, selectedSlotDraft);
    const normalizedGuess = normalizeWord(surfacedGuess);
    if (normalizedGuess.length !== selectedSlotMeta.length) {
      setMessage(`Word must be ${selectedSlotMeta.length} letters for this slot.`);
      return;
    }

    trackGameStarted("verble", puzzle.puzzleDate, isArchiveView);

    let responsePayload: GuessWordResponse = {};
    try {
      const response = await fetch("/api/verble/puzzle/guess-word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzleId: puzzle.puzzleId,
          slotIndex: selectedSlotMeta.index,
          guessWord: surfacedGuess,
        }),
      });
      responsePayload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responsePayload.error || "Could not validate guess");
      }
    } catch (submitError) {
      const errorMessage = submitError instanceof Error ? submitError.message : "Could not validate guess";
      setMessage(errorMessage);
      if (errorMessage === "That word is not in the allowed dictionary.") {
        invalidGuessSequenceRef.current += 1;
        setInvalidGuessFeedback({ slotIndex: selectedSlotMeta.index, sequence: invalidGuessSequenceRef.current });
      }
      return;
    }

    setInvalidGuessFeedback(null);

    const feedback = Array.isArray(responsePayload.feedback) ? responsePayload.feedback : [];
    const submittedAt = Date.now();
    const appliedGuess = responsePayload.normalizedGuess || normalizedGuess;
    const submittedLetters = [...selectedSlotDraft];
    const isCorrect = Boolean(responsePayload.isCorrect);
    const nextAttempts = [...wordAttempts, { slotIndex: selectedSlotMeta.index, guess: appliedGuess, feedback }];
    const nextSolved = { ...solvedWords };
    const existingDraft = slotDrafts[selectedSlotMeta.index] || Array.from({ length: selectedSlotMeta.length }, () => "");
    const existingLocks = slotLocks[selectedSlotMeta.index] || Array.from({ length: selectedSlotMeta.length }, () => false);
    const animatedGuessDraft = submittedLetters.map((letter, index) => (existingLocks[index] ? existingDraft[index] || letter : letter));
    const persistedGuessDraft = submittedLetters.map((letter, index) => (
      existingLocks[index] || feedback[index] === "correct" ? letter : ""
    ));
    const startFeedback = existingLocks.map((isLocked) => (isLocked ? "correct" : "empty")) as Array<LetterFeedback | "empty">;
    const nextSlotLocks = {
      ...slotLocks,
      [selectedSlotMeta.index]: feedback.map((state, index) => existingLocks[index] || state === "correct"),
    };
    const nextSlotMarks = {
      ...slotMarks,
      [selectedSlotMeta.index]: feedback.map((state, index) => ((existingLocks[index] || state === "correct") ? "correct" : "empty")),
    };
    const nextSlotDrafts = {
      ...slotDrafts,
      [selectedSlotMeta.index]: persistedGuessDraft,
    };
    if (isCorrect) {
      nextSolved[selectedSlotMeta.index] = puzzle.answerWords[selectedSlotMeta.index];
    }

    const postGuessSolved = { ...nextSolved };
    const postGuessSlotDrafts = { ...nextSlotDrafts };
    const postGuessSlotLocks = { ...nextSlotLocks };
    const postGuessSlotMarks = { ...nextSlotMarks };

    const revealIndices = feedback.flatMap((state, index) => (
      nextSlotLocks[selectedSlotMeta.index][index] && existingLocks[index]
        ? []
        : [index]
    ));

    setIsResolvingGuess(true);
    setSelectedSlot(null);
    setRevealState({
      slotIndex: selectedSlotMeta.index,
      letters: animatedGuessDraft,
      feedback,
      revealIndices,
      startFeedback,
    });
    setHeldRevealState({
      slotIndex: selectedSlotMeta.index,
      letters: animatedGuessDraft,
      feedback,
      revealIndices,
      startFeedback,
    });

    setWordAttempts(nextAttempts);
    setSolvedWords(postGuessSolved);
    setSlotDrafts(postGuessSlotDrafts);
    setSlotLocks(postGuessSlotLocks);
    setSlotMarks(postGuessSlotMarks);
    setMessage("");

    const nextGuessesUsed = guessesUsed + 1;
    setGuessesUsed(nextGuessesUsed);

    const finalSolved = { ...postGuessSolved };
    const finalSlotDrafts = { ...postGuessSlotDrafts };
    const finalSlotLocks = { ...postGuessSlotLocks };
    const finalSlotMarks = { ...postGuessSlotMarks };
    const phaseTwoSolved = { ...postGuessSolved };
    const phaseTwoSlotDrafts = { ...postGuessSlotDrafts };
    const phaseTwoSlotLocks = { ...postGuessSlotLocks };
    const phaseTwoSlotMarks = { ...postGuessSlotMarks };
    const phaseTwoEntries: Array<{
      slotIndex: number;
      letters: string[];
      feedback: LetterFeedback[];
      revealIndices: number[];
      wordDelayMs: number;
    }> = [];
    const deferredSelectedIndices: number[] = [];
    const guessedLetters = Array.from(
      new Set(
        appliedGuess
          .split("")
          .filter((letter, index) => {
            const mark = feedback[index];
            return mark === "correct" || mark === "present";
          }),
      ),
    );
    const newlyRevealedLetters = new Set<string>();

    puzzle.slots.forEach((slot) => {
      if (finalSolved[slot.index]) {
        return;
      }
      const answer = puzzle.answerWords[slot.index] || "";
      if (!answer) {
        return;
      }

      const currentLocks = [...(finalSlotLocks[slot.index] || Array.from({ length: slot.length }, () => false))];
      const currentDraft = [...(finalSlotDrafts[slot.index] || Array.from({ length: slot.length }, () => ""))];
      const currentMarks = [...(finalSlotMarks[slot.index] || Array.from({ length: slot.length }, () => "empty"))];
      const justRevealedIndices: number[] = [];

      answer.split("").forEach((letter, letterIndex) => {
        if (!guessedLetters.includes(letter) || currentLocks[letterIndex]) {
          return;
        }
        currentDraft[letterIndex] = answer[letterIndex];
        currentLocks[letterIndex] = true;
        currentMarks[letterIndex] = "correct";
        justRevealedIndices.push(letterIndex);
        newlyRevealedLetters.add(letter);
      });

      if (slot.index === selectedSlotMeta.index) {
        deferredSelectedIndices.push(...justRevealedIndices);
        finalSlotDrafts[slot.index] = currentDraft;
        finalSlotLocks[slot.index] = currentLocks;
        finalSlotMarks[slot.index] = currentMarks;
        if (currentLocks.every(Boolean)) {
          finalSolved[slot.index] = answer;
        }
        return;
      }

      phaseTwoSlotDrafts[slot.index] = currentDraft;
      phaseTwoSlotLocks[slot.index] = currentLocks;
      phaseTwoSlotMarks[slot.index] = currentMarks;
      finalSlotDrafts[slot.index] = currentDraft;
      finalSlotLocks[slot.index] = currentLocks;
      finalSlotMarks[slot.index] = currentMarks;

      if (justRevealedIndices.length > 0) {
        phaseTwoEntries.push({
          slotIndex: slot.index,
          letters: currentDraft,
          feedback: Array.from({ length: slot.length }, () => "correct" as LetterFeedback),
          revealIndices: justRevealedIndices,
          wordDelayMs: 0,
        });
      }

      if (currentLocks.every(Boolean)) {
        phaseTwoSolved[slot.index] = answer;
        finalSolved[slot.index] = answer;
      }
    });

    const revealTotalMs = Math.max(0, (revealIndices.length - 1) * FLIP_STAGGER_MS + FLIP_DURATION_MS + GLOBAL_REVEAL_DELAY_MS);
    const phaseTwoTotalMs = phaseTwoEntries.reduce((max) => {
      const entryTotal = SLOW_FLIP_DURATION_MS + 120;
      return Math.max(max, entryTotal);
    }, 0);
    const finalSelectedIndices = Array.from({ length: selectedSlotMeta.length }, (_, index) => index).filter((index) => {
      const heldLetter = animatedGuessDraft[index] || "";
      const heldMark = feedback[index] || "empty";
      const nextLetter = finalSlotDrafts[selectedSlotMeta.index][index] || "";
      const nextMark = finalSlotMarks[selectedSlotMeta.index][index] || "empty";
      return heldLetter !== nextLetter || heldMark !== nextMark;
    });
    const phaseThreeTotalMs = Math.max(0, (finalSelectedIndices.length - 1) * FLIP_STAGGER_MS + FLIP_DURATION_MS + 120);
    window.setTimeout(() => {
      const finishResolution = (resolvedSolved: Record<number, string>) => {
        setHeldRevealState(null);
        const solvedAll = puzzle.slots.every((slot) => resolvedSolved[slot.index]);
        if (solvedAll) {
          const duration = timingEligibleRef.current ? getSolveDurationSeconds(startedAtRef.current, submittedAt) : null;
          setSolveDurationSeconds(duration);
          setGameState("won");
          setIsResolvingGuess(false);
          setIsResultOpen(true);
          recordGameCompletionQuietly({
            gameSlug: "verble",
            puzzleId: puzzle.puzzleId,
            puzzleDate: puzzle.puzzleDate,
            isArchive: isArchiveView,
            isWin: true,
            guessesUsed: nextGuessesUsed,
            maxGuesses,
            solveDurationSeconds: duration,
            resultPayload: {
              ...buildResultPayload({
                attempts: nextAttempts,
                answer: { phraseTemplate: puzzle.phraseTemplate, words: puzzle.answerWords },
                final: { type: "word", slotIndex: selectedSlotMeta.index, guess: appliedGuess },
                isWin: true,
                guessesUsed: nextGuessesUsed,
                maxGuesses,
              }),
              localState: buildVerbleCompletionSnapshot({
                puzzleId: puzzle.puzzleId,
                gameState: "won",
                message: "",
                wordAttempts: nextAttempts,
                solvedWords: resolvedSolved,
                slotDrafts: finalSlotDrafts,
                slotLocks: finalSlotLocks,
                slotMarks: finalSlotMarks,
                guessesUsed: nextGuessesUsed,
                startedAt: startedAtRef.current,
                solveDurationSeconds: duration,
              }),
            },
          });
          return;
        }

        if (nextGuessesUsed >= maxGuesses) {
          const duration = timingEligibleRef.current ? getSolveDurationSeconds(startedAtRef.current, submittedAt) : null;
          setSolveDurationSeconds(duration);
          setGameState("lost");
          setIsResolvingGuess(false);
          setIsResultOpen(true);
          recordGameCompletionQuietly({
            gameSlug: "verble",
            puzzleId: puzzle.puzzleId,
            puzzleDate: puzzle.puzzleDate,
            isArchive: isArchiveView,
            isWin: false,
            guessesUsed: nextGuessesUsed,
            maxGuesses,
            solveDurationSeconds: duration,
            resultPayload: {
              ...buildResultPayload({
                attempts: nextAttempts,
                answer: { phraseTemplate: puzzle.phraseTemplate, words: puzzle.answerWords },
                final: { type: "word", slotIndex: selectedSlotMeta.index, guess: appliedGuess },
                isWin: false,
                guessesUsed: nextGuessesUsed,
                maxGuesses,
              }),
              localState: buildVerbleCompletionSnapshot({
                puzzleId: puzzle.puzzleId,
                gameState: "lost",
                message: "",
                wordAttempts: nextAttempts,
                solvedWords: resolvedSolved,
                slotDrafts: finalSlotDrafts,
                slotLocks: finalSlotLocks,
                slotMarks: finalSlotMarks,
                guessesUsed: nextGuessesUsed,
                startedAt: startedAtRef.current,
                solveDurationSeconds: duration,
              }),
            },
          });
          return;
        }

        setSelectedSlot(null);
        setIsResolvingGuess(false);
      };

      const revealedLabel = Array.from(newlyRevealedLetters).map((letter) => letter.toUpperCase()).join(", ");
      setMessage(revealedLabel ? `New letters revealed: ${revealedLabel}` : "");

      const runPhaseThree = () => {
        if (finalSelectedIndices.length === 0) {
          setSolvedWords(phaseTwoSolved);
          setSlotDrafts(phaseTwoSlotDrafts);
          setSlotLocks(phaseTwoSlotLocks);
          setSlotMarks(phaseTwoSlotMarks);
          finishResolution(phaseTwoSolved);
          return;
        }

        setSolvedWords(phaseTwoSolved);
        setSlotDrafts(phaseTwoSlotDrafts);
        setSlotLocks(phaseTwoSlotLocks);
        setSlotMarks(phaseTwoSlotMarks);
        setPostRevealState({
          slotIndex: selectedSlotMeta.index,
          letters: finalSlotDrafts[selectedSlotMeta.index],
          feedback: finalSlotMarks[selectedSlotMeta.index],
          revealIndices: finalSelectedIndices,
        });

        window.setTimeout(() => {
          setPostRevealState(null);
          setSolvedWords(finalSolved);
          setSlotDrafts(finalSlotDrafts);
          setSlotLocks(finalSlotLocks);
          setSlotMarks(finalSlotMarks);
          finishResolution(finalSolved);
        }, phaseThreeTotalMs);
      };

      if (phaseTwoEntries.length === 0) {
        runPhaseThree();
        return;
      }

      setGlobalRevealState({ entries: phaseTwoEntries });
      window.setTimeout(() => {
        setGlobalRevealState(null);
        runPhaseThree();
      }, phaseTwoTotalMs);
    }, revealTotalMs);
  };

  const submitPhraseGuess = (phraseGuessValue: string) => {
    if (!puzzle || gameState !== "playing") return;

    const normalized = normalizePhraseWithPunctuation(phraseGuessValue);
    const submittedAt = Date.now();
    if (!normalized) {
      setMessage("Fill in the phrase before submitting.");
      return;
    }

    setIsPhraseConfirmOpen(false);

    const target = normalizePhraseWithPunctuation(
      puzzle.slots.map((slot) => `${slot.display}${slot.separator}`).join("")
    );
    if (normalized === target) {
      const nextGuessesUsed = Math.min(maxGuesses, guessesUsed + 1);
      const allSolvedWords: Record<number, string> = {};
      const solvedDrafts: SlotDrafts = {};
      const solvedLocks: SlotLocks = {};
      const solvedMarks: SlotMarks = {};
      let animatedWordCount = 0;
      const revealEntries = puzzle.slots.map((slot) => {
        const word = puzzle.answerWords[slot.index] || "";
        const currentLocks = slotLocks[slot.index] || Array.from({ length: slot.length }, () => false);
        const currentMarks = slotMarks[slot.index] || Array.from({ length: slot.length }, () => "empty");
        const revealIndices = word
          .split("")
          .flatMap((_, index) => (currentLocks[index] || currentMarks[index] === "correct" ? [] : [index]));
        const wordDelayMs = revealIndices.length > 0 ? animatedWordCount++ * WORD_REVEAL_STAGGER_MS : 0;
        allSolvedWords[slot.index] = word;
        solvedDrafts[slot.index] = word.split("");
        solvedLocks[slot.index] = Array.from({ length: slot.length }, () => true);
        solvedMarks[slot.index] = Array.from({ length: slot.length }, () => "correct");
        return {
          slotIndex: slot.index,
          letters: word.split(""),
          feedback: Array.from({ length: slot.length }, () => "correct" as LetterFeedback),
          wordDelayMs,
          revealIndices,
        };
      });

      const revealTotalMs = revealEntries.reduce((max, entry) => {
        const entryTotal = entry.wordDelayMs + Math.max(0, (entry.revealIndices.length - 1) * FLIP_STAGGER_MS + FLIP_DURATION_MS + 120);
        return Math.max(max, entryTotal);
      }, 0);

      setIsResolvingGuess(true);
      setSelectedSlot(null);
      setMessage("");
      setPhraseRevealState(revealEntries);

      window.setTimeout(() => {
        const duration = timingEligibleRef.current ? getSolveDurationSeconds(startedAtRef.current, submittedAt) : null;
        setSolveDurationSeconds(duration);
        setPhraseRevealState(null);
        setSolvedWords(allSolvedWords);
        setSlotDrafts(solvedDrafts);
        setSlotLocks(solvedLocks);
        setSlotMarks(solvedMarks);
        setGuessesUsed(nextGuessesUsed);
        setGameState("won");
        setIsResolvingGuess(false);
        setIsResultOpen(true);
        recordGameCompletionQuietly({
          gameSlug: "verble",
          puzzleId: puzzle.puzzleId,
          puzzleDate: puzzle.puzzleDate,
          isArchive: isArchiveView,
          isWin: true,
          guessesUsed: nextGuessesUsed,
          maxGuesses,
          solveDurationSeconds: duration,
          resultPayload: {
            ...buildResultPayload({
              attempts: wordAttempts,
              answer: { phraseTemplate: puzzle.phraseTemplate, words: puzzle.answerWords },
              final: { type: "phrase", guess: normalized, isCorrect: true },
              isWin: true,
              guessesUsed: nextGuessesUsed,
              maxGuesses,
              submittedGuesses: wordAttempts.length + 1,
              stats: { usedFullPhraseGuess: true },
            }),
            localState: buildVerbleCompletionSnapshot({
              puzzleId: puzzle.puzzleId,
              gameState: "won",
              message: "",
              wordAttempts,
              solvedWords: allSolvedWords,
              slotDrafts: solvedDrafts,
              slotLocks: solvedLocks,
              slotMarks: solvedMarks,
              guessesUsed: nextGuessesUsed,
              startedAt: startedAtRef.current,
              solveDurationSeconds: duration,
            }),
          },
        });
      }, revealTotalMs);
      return;
    }

    const revealedDrafts: SlotDrafts = {};
    const revealedLocks: SlotLocks = {};
    const revealedMarks: SlotMarks = {};
    let animatedWordCount = 0;
    const revealEntries = puzzle.slots.map((slot) => {
      const word = puzzle.answerWords[slot.index] || "";
      const letters = word.split("");
      const currentLocks = slotLocks[slot.index] || Array.from({ length: slot.length }, () => false);
      const currentMarks = slotMarks[slot.index] || Array.from({ length: slot.length }, () => "empty");
      const feedback = letters.map((_, index): LetterFeedback => (
        currentLocks[index] || currentMarks[index] === "correct" ? "correct" : "absent"
      ));
      const revealIndices = letters.flatMap((_, index) => (feedback[index] === "correct" ? [] : [index]));
      const wordDelayMs = revealIndices.length > 0 ? animatedWordCount++ * WORD_REVEAL_STAGGER_MS : 0;
      revealedDrafts[slot.index] = letters;
      revealedLocks[slot.index] = feedback.map((state) => state === "correct");
      revealedMarks[slot.index] = feedback;
      return {
        slotIndex: slot.index,
        letters,
        feedback,
        wordDelayMs,
        revealIndices,
      };
    });

    const revealTotalMs = revealEntries.reduce((max, entry) => {
      const entryTotal = entry.wordDelayMs + Math.max(0, (entry.revealIndices.length - 1) * FLIP_STAGGER_MS + FLIP_DURATION_MS + 120);
      return Math.max(max, entryTotal);
    }, 0);

    setIsResolvingGuess(true);
    setSelectedSlot(null);
    setMessage("");
    setRevealState(null);
    setHeldRevealState(null);
    setGlobalRevealState(null);
    setPostRevealState(null);
    setPhraseRevealState(revealEntries);

    window.setTimeout(() => {
      const duration = timingEligibleRef.current ? getSolveDurationSeconds(startedAtRef.current, submittedAt) : null;
      setSolveDurationSeconds(duration);
      setPhraseRevealState(null);
      setSolvedWords({});
      setSlotDrafts(revealedDrafts);
      setSlotLocks(revealedLocks);
      setSlotMarks(revealedMarks);
      setGuessesUsed(maxGuesses);
      setGameState("lost");
      setIsResolvingGuess(false);
      setIsResultOpen(true);
      recordGameCompletionQuietly({
        gameSlug: "verble",
        puzzleId: puzzle.puzzleId,
        puzzleDate: puzzle.puzzleDate,
        isArchive: isArchiveView,
        isWin: false,
        guessesUsed: maxGuesses,
        maxGuesses,
        solveDurationSeconds: duration,
        resultPayload: {
          ...buildResultPayload({
            attempts: wordAttempts,
            answer: { phraseTemplate: puzzle.phraseTemplate, words: puzzle.answerWords },
            final: { type: "phrase", guess: normalized, isCorrect: false },
            isWin: false,
            guessesUsed: maxGuesses,
            maxGuesses,
            submittedGuesses: wordAttempts.length + 1,
            stats: { usedFullPhraseGuess: true },
          }),
          localState: buildVerbleCompletionSnapshot({
            puzzleId: puzzle.puzzleId,
            gameState: "lost",
            message: "",
            wordAttempts,
            solvedWords: {},
            slotDrafts: revealedDrafts,
            slotLocks: revealedLocks,
            slotMarks: revealedMarks,
            guessesUsed: maxGuesses,
            startedAt: startedAtRef.current,
            solveDurationSeconds: duration,
          }),
        },
      });
    }, revealTotalMs);
    setGuessesUsed(maxGuesses);
  };

  const getShareText = () => {
    if (!puzzle || gameState === "playing") return "";
    const shareBlocks = buildVerbleShareRow({
      slots: puzzle.slots,
      slotMarks,
      didWin: gameState === "won",
    });
    return buildGameShareText({
      gameName: "Verble",
      isArchiveView,
      puzzleDate: puzzle.puzzleDate,
      didWin: gameState === "won",
      guessesUsed,
      maxGuesses,
      visualRows: shareBlocks ? [shareBlocks] : [],
      url: toPublicAppUrl("/"),
    });
  };

  const shareResult = async () => {
    const text = getShareText();
    if (!text) return;
    const result = await shareResultText("Verble", text);
    if (result === "shared") setCopyStatus("Shared");
    if (result === "copied") setCopyStatus("Copied to clipboard");
    if (result === "failed") setCopyStatus("Share failed");
  };

  useEffect(() => {
    if (gameState !== "playing" || !selectedSlotMeta || isResolvingGuess) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (canOpenFullPhraseConfirm) {
          setIsPhraseConfirmOpen(true);
          return;
        }
        if (canSubmitWordGuess) {
          void submitWordGuess();
        }
        return;
      }

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        moveSelectedSlot(1);
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        moveSelectedSlot(-1);
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        removeWordGuessChar();
        return;
      }

      if (/^[a-z]$/i.test(event.key)) {
        event.preventDefault();
        appendWordGuessChar(event.key.toLowerCase());
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canOpenFullPhraseConfirm, canSubmitWordGuess, gameState, isResolvingGuess, selectedSlotMeta, solvedWords]);
 
  const latestAttempt = wordAttempts.length > 0 ? wordAttempts[wordAttempts.length - 1] : null;
  const earlierAttempts = wordAttempts.slice(0, -1).reverse();

  if (loading) {
    return (
      <div className="verble-shell">
        <MainNav label={navLabel} />
        <main className="container">
          <section className="card legal-card">
            <p className="page-title" role="status"><LoadingLabel text="Loading puzzle" /></p>
          </section>
        </main>
      </div>
    );
  }

  if (archiveLock) {
    return (
      <div className="verble-shell">
        <MainNav label={navLabel} />
        <main className="container">
          <ArchiveLockGate archiveHref={archiveHref} title={archiveLock.title} description={archiveLock.description} />
        </main>
      </div>
    );
  }

  if (error || !puzzle) {
    return (
      <div className="verble-shell">
        <MainNav label={navLabel} />
        <main className="container">
          <VerbleUnavailable
            title="Verble unavailable"
            message={error || "No puzzle available right now."}
          />
        </main>
      </div>
    );
  }

  const resultLabel = getPerformanceLabel(gameState === "won", guessesUsed, maxGuesses);
  const contextChipLabel = isArchiveView
    ? `ARCHIVE GAME #${puzzle.archiveGameNumber ?? ""}`.trim()
    : "TODAY'S GAME";
  const statusChipLabel = shouldShowNextGameCountdown
    ? `Next Verble in ${nextGameCountdown || "--:--:--"}`
    : contextChipLabel;
  return (
    <div className="verble-shell">
      <MainNav label={navLabel} />
      <main className="container">
        <section className="card verble-card">
          <div className="game-meta-row">
            <span className="chip arcade-game-chip"><span className="arcade-live-dot" />{statusChipLabel}{!isArchiveView && puzzle.archiveGameNumber ? ` · #${puzzle.archiveGameNumber}` : ""}</span>
            <button className="how-to-play-btn" type="button" onClick={openHowToPlay}>
              <span aria-hidden="true">ⓘ</span> How to play
            </button>
            <GuessProgressChip used={guessesUsed} total={maxGuesses} />
          </div>

          <div className="arcade-board">
          <div className={`phrase-layout ${selectedSlot !== null && gameState === "playing" ? "has-selected-word" : ""}`}>
            {puzzle.slots.map((slot) => {
              const solved = solvedWords[slot.index];
              const isSelected = selectedSlot === slot.index;
              const isPlayable = gameState === "playing" && !solved && !isResolvingGuess;
              const isRevealing = revealState?.slotIndex === slot.index;
              const heldRevealForSlot = heldRevealState?.slotIndex === slot.index ? heldRevealState : null;
              const phraseRevealForSlot = phraseRevealState?.find((entry) => entry.slotIndex === slot.index) || null;
              const globalRevealForSlot = globalRevealState?.entries.find((entry) => entry.slotIndex === slot.index);
              const postRevealForSlot = postRevealState?.slotIndex === slot.index ? postRevealState : null;
              const persistedLocks = slotLocks[slot.index] || Array.from({ length: slot.length }, () => false);
              const persistedMarks = slotMarks[slot.index] || Array.from({ length: slot.length }, () => "empty");
              const baseLetters = heldRevealForSlot?.letters
                || slotDrafts[slot.index]
                || Array.from({ length: slot.length }, () => "");
              const tileLetters = phraseRevealForSlot
                ? phraseRevealForSlot.letters
                : solved
                  ? solved.split("")
                  : baseLetters.map((letter, letterIndex) => {
                      if (postRevealForSlot?.revealIndices.includes(letterIndex)) {
                        return postRevealForSlot.letters[letterIndex] ?? "";
                      }
                      if (globalRevealForSlot?.revealIndices.includes(letterIndex)) {
                        return globalRevealForSlot.letters[letterIndex] || letter;
                      }
                      if (isRevealing && revealState?.revealIndices.includes(letterIndex)) {
                        return revealState.letters[letterIndex] || letter;
                      }
                      return letter;
                    });
              const displayChars = buildDisplayedWordChars(slot, tileLetters);
              return (
                <div key={slot.index} className={`slot-cluster ${isSelected ? "selected" : ""}`}>
                  <button
                    type="button"
                    aria-label={`Word ${slot.index + 1}, ${slot.length} letters${solved ? ", solved" : ""}`}
                    aria-pressed={isPlayable ? isSelected : undefined}
                    className={`slot-word-button ${solved ? "solved" : ""} ${isSelected ? "selected" : ""} ${shouldShowPickWordLift && isPlayable ? "pick-word-lift" : ""} ${isSelected && invalidGuessFeedback?.slotIndex === slot.index ? "invalid-guess" : ""}`}
                    onClick={() => {
                      if (!isPlayable) {
                        return;
                      }
                      setInvalidGuessFeedback(null);
                      setSelectedSlot(slot.index);
                      setMessage("");
                    }}
                    onFocus={() => {
                      if (!isPlayable) {
                        return;
                      }
                      setInvalidGuessFeedback(null);
                      setSelectedSlot(slot.index);
                      setMessage("");
                    }}
                    disabled={!isPlayable}
                  >
                    <span className="slot-tiles" key={invalidGuessFeedback?.slotIndex === slot.index ? invalidGuessFeedback.sequence : "ready"} style={shouldShowPickWordLift && isPlayable ? { animationDelay: `${slot.index * 180}ms` } : undefined}>
                      {displayChars.map((item, index) => (
                        (() => {
                          const letterIndex = item.letterIndex ?? -1;
                          const slotRevealIndex = item.kind === "letter"
                            && revealState?.slotIndex === slot.index
                            && !!revealState?.revealIndices.includes(letterIndex);
                          const slotRevealOrder = revealState?.slotIndex === slot.index
                            ? revealState.revealIndices.indexOf(letterIndex)
                            : -1;
                          const heldRevealIndex = item.kind === "letter"
                            && heldRevealForSlot?.slotIndex === slot.index
                            && !!heldRevealForSlot.revealIndices.includes(letterIndex);
                          const postRevealIndex = item.kind === "letter"
                            && postRevealForSlot?.slotIndex === slot.index
                            && !!postRevealForSlot.revealIndices.includes(letterIndex);
                          const postRevealOrder = postRevealForSlot?.slotIndex === slot.index
                            ? postRevealForSlot.revealIndices.indexOf(letterIndex)
                            : -1;
                          const phraseRevealIndex = item.kind === "letter" && !!phraseRevealForSlot?.revealIndices.includes(letterIndex);
                          const phraseRevealOrder = phraseRevealForSlot?.revealIndices.indexOf(letterIndex) ?? -1;
                          const globalRevealIndex = item.kind === "letter" && !!globalRevealForSlot?.revealIndices.includes(letterIndex);
                          const activeRevealIndex = slotRevealIndex || postRevealIndex || globalRevealIndex || phraseRevealIndex;
                          const preRevealLetter = item.kind === "letter" ? (baseLetters[letterIndex] ?? "") : "";
                          const finalRevealLetter = item.kind === "letter" ? (item.value || "") : "";

                          let feedbackClass = "";
                          let currentVisualFeedback: LetterFeedback | "empty" = "empty";
                          if (item.kind === "letter") {
                            if (slotRevealIndex) {
                              currentVisualFeedback = revealState?.startFeedback[letterIndex] || "empty";
                            } else if (solved && !phraseRevealIndex) {
                              currentVisualFeedback = "correct";
                            } else if (heldRevealIndex) {
                              currentVisualFeedback = heldRevealForSlot?.feedback[letterIndex] || "empty";
                            } else {
                              currentVisualFeedback = persistedMarks[letterIndex] || "empty";
                            }

                            if (slotRevealIndex) {
                              feedbackClass = revealState?.feedback[letterIndex] || "absent";
                            } else if (postRevealIndex) {
                              feedbackClass = postRevealForSlot?.feedback[letterIndex] || "empty";
                            } else if (globalRevealIndex) {
                              feedbackClass = globalRevealForSlot?.feedback[letterIndex] || "correct";
                            } else if (phraseRevealIndex) {
                              feedbackClass = phraseRevealForSlot?.feedback[letterIndex] || "correct";
                            } else if (heldRevealIndex) {
                              feedbackClass = heldRevealForSlot?.feedback[letterIndex] || "absent";
                            } else if (!solved) {
                              feedbackClass = persistedMarks[letterIndex] || "empty";
                            }
                          }

                          const flipStartVisual = getFlipVisual(currentVisualFeedback);
                          const flipEndVisual = getFlipVisual((feedbackClass as LetterFeedback | "empty") || "empty");

                          return (
                            <span key={`${slot.index}-${index}`} className="slot-char-group">
                              <span
                                className={`slot-tile ${item.kind === "fixed" ? "fixed" : ""} ${item.kind === "letter" && solved && !phraseRevealForSlot ? "solved" : ""} ${item.kind === "letter" && isSelected ? "selected" : ""} ${item.kind === "letter" && item.value ? "filled" : ""} ${item.kind === "letter" && canOpenFullPhraseConfirm ? "phrase-ready" : ""} ${item.kind === "letter" && !activeRevealIndex ? feedbackClass : ""} ${item.kind === "letter" && activeRevealIndex ? "reveal" : ""} ${item.kind === "letter" && postRevealIndex ? "reveal-swap" : ""} ${item.kind === "letter" && persistedLocks[letterIndex] ? "locked" : ""}`}
                                style={
                                  item.kind === "letter" && activeRevealIndex
                                    ? ({
                                        "--flip-start-bg": flipStartVisual.bg,
                                        "--flip-start-color": flipStartVisual.color,
                                        "--flip-end-bg": flipEndVisual.bg,
                                        "--flip-end-color": flipEndVisual.color,
                                        "--flip-delay": `${
                                          slotRevealIndex
                                            ? Math.max(0, slotRevealOrder) * FLIP_STAGGER_MS
                                            : postRevealIndex
                                              ? Math.max(0, postRevealOrder) * FLIP_STAGGER_MS
                                              : globalRevealIndex
                                                ? 0
                                                : (phraseRevealForSlot?.wordDelayMs || 0) + Math.max(0, phraseRevealOrder) * FLIP_STAGGER_MS
                                        }ms`,
                                        "--flip-duration": `${
                                          globalRevealIndex ? SLOW_FLIP_DURATION_MS : FLIP_DURATION_MS
                                        }ms`,
                                      } as CSSProperties)
                                    : undefined
                                }
                              >
                                {item.kind === "letter" && postRevealIndex ? (
                                  <span className="tile-letter-stack" aria-hidden="true">
                                    <span className="tile-letter-face tile-letter-face-front">{preRevealLetter}</span>
                                    <span className="tile-letter-face tile-letter-face-back">{finalRevealLetter}</span>
                                  </span>
                                ) : (
                                  item.value || ""
                                )}
                              </span>
                              {item.kind === "letter" && item.trailingFixed ? (
                                <span
                                  className={`slot-inline-fixed ${item.trailingFixed.includes("'") ? "apostrophe" : ""} ${item.trailingFixed.includes("-") ? "hyphen" : ""} ${item.trailingFixed.includes(",") ? "comma" : ""} ${item.trailingFixed.includes(";") ? "semicolon" : ""}`}
                                  aria-hidden="true"
                                >
                                  {item.trailingFixed}
                                </span>
                              ) : null}
                            </span>
                          );
                        })()
                      ))}
                    </span>
                  </button>
                  {slot.separator ? (
                    <span
                      className={`slot-sep ${slot.separator.includes(",") ? "comma" : ""} ${slot.separator.includes(";") ? "semicolon" : ""}`}
                    >
                      {slot.separator}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="arcade-word-status">
            <span className="arcade-status-dot" />
            <strong>{selectedSlotMeta ? `Solving Word #${selectedSlotMeta.index + 1}:` : "Pick a word"}</strong>
            <span>{selectedSlotMeta ? `${selectedSlotMeta.length} letters` : "Tap any word to start"}</span>
            <span className="arcade-status-hint">Tap any word to switch</span>
          </div>
          </div>

          {gameState === "playing" ? <div className="arcade-action-row">
            <button type="button" className="arcade-clear-button" onClick={clearWordGuess} disabled={isResolvingGuess || !selectedSlotDraft.some((letter, index) => !selectedSlotLockState[index] && Boolean(letter))}>
              <span aria-hidden="true">↻</span> Clear
            </button>
            <button type="button" className="arcade-phrase-button" onClick={() => setIsPhraseConfirmOpen(true)} disabled={!canOpenFullPhraseConfirm}>
              <span aria-hidden="true">ϟ</span> Solve Full Phrase <small>High Stakes</small>
            </button>
          </div> : null}

          {gameState !== "playing" ? (
            <div className="phrase-submit-row">
              <button
                className="guess-submit-btn"
                type="button"
                onClick={() => setIsResultOpen(true)}
              >
                Review result
              </button>
            </div>
          ) : null}

          <div className="keyboard" aria-label="Global phrase keyboard">
            {ALPHA_ROWS.map((row, rowIndex) => (
              <div className="keyboard-row" key={row}>
                {rowIndex === 2 ? <button type="button" className="key enter-key" onClick={() => {
                  if (canOpenFullPhraseConfirm) {
                    setIsPhraseConfirmOpen(true);
                    return;
                  }
                  void submitWordGuess();
                }} disabled={!canOpenFullPhraseConfirm && !canSubmitWordGuess}>Enter</button> : null}
                {row.split("").map((letter) => {
                  const state = keyboardState[letter.toLowerCase()] || "unknown";
                  const isDisabled = gameState !== "playing"
                    || isResolvingGuess
                    || !selectedSlotMeta
                    || selectedSlotDraft.every((letter, index) => selectedSlotLockState[index] || Boolean(letter));
                  return (
                    <button
                      type="button"
                      key={letter}
                      className="key alpha-key"
                      data-state={state}
                      onClick={() => {
                        if (isDisabled) return;
                        appendWordGuessChar(letter.toLowerCase());
                      }}
                      disabled={isDisabled}
                    >
                      {letter}
                    </button>
                  );
                })}
                {rowIndex === 2 ? <button type="button" className="key backspace-key" onClick={removeWordGuessChar} disabled={gameState !== "playing" || isResolvingGuess || !selectedSlotDraft.some((letter, index) => !selectedSlotLockState[index] && Boolean(letter))} aria-label="Backspace"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="verble-backspace-icon"><path d="M20 5H9L3 12l6 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="m10 9 6 6m0-6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button> : null}
              </div>
            ))}
          </div>

          {message ? <p className="message" role="status" data-kind={gameState === "won" ? "won" : gameState === "lost" ? "lost" : globalRevealState ? "hint" : "playing"}>{message}</p> : null}

          {allSolved && gameState === "playing" ? <p className="message" data-kind="won">All words solved.</p> : null}

          {wordAttempts.length > 0 ? (
            <div className="guess-history-wrap">
              <button
                type="button"
                className="guess-history-toggle"
                aria-expanded={earlierAttempts.length > 0 ? isHistoryOpen : undefined}
                aria-controls={earlierAttempts.length > 0 ? "verble-guess-history-panel" : undefined}
                disabled={earlierAttempts.length === 0}
                onClick={() => setIsHistoryOpen((value) => !value)}
              >
                <span className="guess-history-heading">
                  <span className="guess-history-title">Your guesses</span>
                  <span className="guess-history-count" aria-hidden="true">{wordAttempts.length}</span>
                </span>
                {earlierAttempts.length > 0 ? (
                  <span className="guess-history-toggle-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M6 14 12 8l6 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                ) : null}
              </button>
              {latestAttempt ? (
                <div className="guess-history-latest">
                  <span className="attempt-label">{`Word #${latestAttempt.slotIndex + 1}`}</span>
                  <div className="guess-history-attempt-tiles">
                    {latestAttempt.guess.split("").map((letter, index) => (
                      <span key={`latest-${latestAttempt.slotIndex}-${index}`} className={`attempt-cell ${latestAttempt.feedback[index]}`}>
                        {letter}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {isHistoryOpen && earlierAttempts.length > 0 ? (
                <ul id="verble-guess-history-panel" className="guess-history-list">
                  {earlierAttempts.map((attempt, index) => (
                    <li key={`${attempt.slotIndex}-${attempt.guess}-${index}`} className="guess-history-item">
                      <span className="attempt-label">{`Word #${attempt.slotIndex + 1}`}</span>
                      <div className="guess-history-attempt-tiles">
                        {attempt.guess.split("").map((letter, tileIndex) => (
                          <span key={`${attempt.slotIndex}-${index}-${tileIndex}`} className={`attempt-cell ${attempt.feedback[tileIndex]}`}>
                            {letter}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>
      </main>

      {isPhraseConfirmOpen && gameState === "playing" ? (
        <div className="result-modal-backdrop" onClick={() => setIsPhraseConfirmOpen(false)}>
          <section
            className="result-modal-panel phrase-guess-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="phrase-guess-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="arcade-dialog-close"
              type="button"
              onClick={() => setIsPhraseConfirmOpen(false)}
              aria-label="Close full phrase confirmation"
            >
              ×
            </button>
            <h2 className="result-modal-title phrase-guess-title" id="phrase-guess-title">
              Submit full phrase?
            </h2>
            <p className="result-modal-copy phrase-guess-warning">
              Warning: a correct phrase wins immediately, but a miss ends the game.
            </p>
            <div className="phrase-guess-form">
              <p className="phrase-guess-preview">{buildCurrentPhraseGuess()}</p>
              <div className="phrase-guess-actions">
                <button
                  className="guess-submit-btn phrase-guess-secondary"
                  type="button"
                  onClick={() => setIsPhraseConfirmOpen(false)}
                >
                  Keep solving
                </button>
                <button
                  className="guess-submit-btn"
                  type="button"
                  onClick={() => submitPhraseGuess(buildCurrentPhraseGuess())}
                >
                  Submit phrase
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {isHowToPlayOpen ? (
        <HowToPlayDialog
          game="verble"
          maxGuesses={maxGuesses}
          onClose={closeHowToPlay}
        />
      ) : null}

      {isResultOpen && gameState !== "playing" ? (
        <div className="result-modal-backdrop" onClick={() => setIsResultOpen(false)}>
          <section
            className="result-modal-panel result-outcome-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="verble-result-title"
            data-outcome={gameState === "won" ? "win" : "loss"}
            onClick={(event) => event.stopPropagation()}
          >
            <ResultOutcomeEffects didWin={gameState === "won"} />
            <button
              className="arcade-dialog-close"
              type="button"
              onClick={() => setIsResultOpen(false)}
              aria-label="Close result dialog"
            >
              ×
            </button>
            <div className="arcade-result-heading">
              <div className="arcade-result-emblem" aria-hidden="true">{gameState === "won" ? "✦" : "↻"}</div>
              <h2 className="result-modal-title" id="verble-result-title">
                {resultLabel}
              </h2>
            </div>
            <div className="result-modal-summary">
              <p className="result-modal-copy result-modal-subtitle">{isArchiveView ? "Archive" : "Daily"} Verble #{puzzle.archiveGameNumber ?? "—"} · <strong>{guessesUsed}/{maxGuesses} attempts</strong></p>
            </div>
            <p className="arcade-result-phrase-label">{gameState === "won" ? (isArchiveView ? "Solved phrase" : "Today's solved phrase") : "The phrase was"}</p>
            <div className="result-modal-phrase phrase-layout" aria-label="Final phrase board">
              {puzzle.slots.map((slot) => {
                const letters = (puzzle.answerWords[slot.index] || "").split("");
                const displayChars = buildDisplayedWordChars(slot, letters);

                return (
                  <div key={`result-${slot.index}`} className="slot-cluster result-slot-cluster">
                    <span className="slot-tiles">
                      {displayChars.map((item, index) => {
                        return (
                          <span key={`result-${slot.index}-${index}`} className="slot-char-group">
                            <span
                              className={`slot-tile ${item.kind === "fixed" ? "fixed" : ""} ${item.kind === "letter" && item.value ? "filled correct locked" : ""}`}
                            >
                              {item.value || ""}
                            </span>
                            {item.kind === "letter" && item.trailingFixed ? (
                              <span
                                className={`slot-inline-fixed ${item.trailingFixed.includes("'") ? "apostrophe" : ""} ${item.trailingFixed.includes("-") ? "hyphen" : ""} ${item.trailingFixed.includes(",") ? "comma" : ""} ${item.trailingFixed.includes(";") ? "semicolon" : ""}`}
                                aria-hidden="true"
                              >
                                {item.trailingFixed}
                              </span>
                            ) : null}
                          </span>
                        );
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
            {puzzle.sourceNote ? (
              <p className="verble-source-note result-modal-source-note">- {puzzle.sourceNote}</p>
            ) : null}
            <div className="arcade-result-metrics"><span>⏱ {solveDurationSeconds === null ? "Time not recorded" : formatSolveTime(solveDurationSeconds)}{solveDurationSeconds !== null ? <small>from first letter</small> : null}</span>{!isArchiveView && gameState === "won" && resultPerformance?.topPercent ? <span>🏅 Top {resultPerformance.topPercent}% <small>of {resultPerformance.cohortSize} timed wins</small></span> : null}</div>
            {resultAccountStats ? <div className="arcade-result-stats account"><div><strong>{resultAccountStats.overall.played}</strong><span>Played</span></div><div><strong>{resultAccountStats.overall.winRate === null ? "—" : `${Math.round(resultAccountStats.overall.winRate * 100)}%`}</strong><span>Win rate</span></div><div><strong>{resultAccountStats.overall.currentVerbleStreak}</strong><span>Streak</span></div><div><strong>{resultAccountStats.overall.bestVerbleStreak}</strong><span>Best</span></div></div> : <div className="arcade-result-stats"><div><strong>{guessesUsed}</strong><span>Attempts</span></div><div><strong>{Math.max(0, maxGuesses - guessesUsed)}</strong><span>Remaining</span></div><div><strong>{Object.keys(solvedWords).length}</strong><span>Words solved</span></div></div>}
            {lockDailyCompletion && !isArchiveView ? (
              <p className="result-modal-timer">Next Verble in <strong>{nextGameCountdown || "--:--:--"}</strong></p>
            ) : null}
            <ResultDialogActions currentGameSlug="verble" onShare={shareResult} />
            {copyStatus ? <p className="result-modal-copy">{copyStatus}</p> : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
