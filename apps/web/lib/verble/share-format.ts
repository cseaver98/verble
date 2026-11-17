type ShareFeedback = "correct" | "present" | "absent";

type ShareWordAttempt = {
  slotIndex: number;
  feedback: ShareFeedback[];
};

type BuildVerbleShareTextOptions = {
  isArchiveView: boolean;
  puzzleDate: string;
  didWin: boolean;
  guessesUsed: number;
  maxGuesses: number;
  wordAttempts: ShareWordAttempt[];
  usedFullPhraseGuess: boolean;
  url: string;
};

const feedbackSquare = (feedback: ShareFeedback): string => {
  if (feedback === "correct") return "🟩";
  if (feedback === "present") return "🟨";
  return "⬜";
};

const formatPuzzleDate = (date: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
};

export const buildVerbleShareText = ({
  isArchiveView,
  puzzleDate,
  didWin,
  guessesUsed,
  maxGuesses,
  wordAttempts,
  usedFullPhraseGuess,
  url,
}: BuildVerbleShareTextOptions): string => {
  const resultLine = didWin
    ? `Solved in ${guessesUsed}/${maxGuesses} guesses`
    : usedFullPhraseGuess
      ? "Missed on a full-phrase guess"
      : `Missed in ${maxGuesses}/${maxGuesses} guesses`;
  const attemptRows = wordAttempts.map((attempt) =>
    `W${attempt.slotIndex + 1} ${attempt.feedback.map(feedbackSquare).join("")}`
  );

  if (usedFullPhraseGuess) {
    attemptRows.push(`PHRASE ${didWin ? "✅" : "❌"}`);
  }

  return [
    isArchiveView ? "Verble Archive" : "Verble",
    formatPuzzleDate(puzzleDate),
    resultLine,
    "",
    ...attemptRows,
    "",
    url,
  ].join("\n");
};
