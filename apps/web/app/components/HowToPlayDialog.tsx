"use client";

import { useEffect, useState, type CSSProperties } from "react";

import { VERBLE_TUTORIAL } from "./how-to-play-fixtures";

export type HowToPlayGame = "verble";

type HowToPlayDialogProps = {
  game: HowToPlayGame;
  maxGuesses: number;
  onClose: () => void;
};

type TileState = "correct" | "present" | "absent" | "draft";

function VerbleTileRow({
  values,
  states = [],
  selected = false,
  trailingFixed = {},
  animateReveals = true,
  animateTyping = false,
  entryOrder = [],
  pickWordLiftIndex,
  flipAtMs,
  flipDurationMs = 260,
  flipStaggerMs = 208,
  flipIndices,
}: {
  values: readonly string[];
  states?: readonly TileState[];
  selected?: boolean;
  trailingFixed?: Record<number, string>;
  animateReveals?: boolean;
  animateTyping?: boolean;
  entryOrder?: readonly (number | null)[];
  pickWordLiftIndex?: number;
  flipAtMs?: number;
  flipDurationMs?: number;
  flipStaggerMs?: number;
  flipIndices?: readonly number[];
}) {
  return (
    <div className={`slot-cluster tutorial-verble-word${selected ? " selected" : ""}${animateReveals ? " tutorial-verble-animate-reveals" : ""}${animateTyping ? " tutorial-verble-typing-word" : ""}`} aria-hidden="true">
      <span className={`slot-word-button${selected ? " selected" : ""}${pickWordLiftIndex !== undefined ? " pick-word-lift" : ""}`}>
        <span className="slot-tiles" style={pickWordLiftIndex !== undefined ? { animationDelay: `${pickWordLiftIndex * 160}ms` } : undefined}>
          {values.map((value, index) => {
            const state = states[index];
            const shouldFlip = flipAtMs !== undefined && (flipIndices ? flipIndices.includes(index) : state === "correct" || state === "present" || state === "absent");
            const flipEnd = state === "correct"
              ? { background: "#10b981", color: "#ffffff" }
              : state === "present"
                ? { background: "#fbbf24", color: "#181445" }
                : { background: "#94a3b8", color: "#ffffff" };
            return <span className="slot-char-group" key={`${value}-${index}`}>
              <span
                className={`slot-tile ${state ?? ""} ${value ? "filled" : ""} ${shouldFlip ? "reveal" : ""}`}
                style={shouldFlip ? {
                  "--flip-start-bg": "#ffffff",
                  "--flip-start-color": "#181445",
                  "--flip-end-bg": flipEnd.background,
                  "--flip-end-color": flipEnd.color,
                  "--flip-delay": `${(flipAtMs ?? 0) + index * flipStaggerMs}ms`,
                  "--flip-duration": `${flipDurationMs}ms`,
                } as CSSProperties : undefined}
              >
                {entryOrder[index] != null && value ? (
                  <span
                    className="tutorial-verble-full-entry"
                    style={{ "--tutorial-entry-delay": `${0.35 + (entryOrder[index] ?? 0) * 0.16}s` } as CSSProperties}
                  >
                    {value}
                  </span>
                ) : animateTyping && value ? <span className="tutorial-verble-typed-letter">{value}</span> : value}
              </span>
              {trailingFixed[index] ? (
                <span className={`slot-inline-fixed${trailingFixed[index].includes("'") ? " apostrophe" : ""}`}>
                  {trailingFixed[index]}
                </span>
              ) : null}
            </span>;
          })}
        </span>
      </span>
    </div>
  );
}

function VerbleChooseBoard({ stage }: { stage: "empty" | "typing" | "solved" }) {
  const isTyping = stage === "typing";
  const isSolved = stage === "solved";
  return (
    <div className={`phrase-layout tutorial-verble-phrase${isTyping ? " has-selected-word tutorial-verble-choose-selected" : ""}`}>
      <VerbleTileRow values={stage === "empty" ? ["", "", "", ""] : ["R", "O", "M", "E"]} states={isSolved ? ["correct", "correct", "correct", "correct"] : undefined} selected={isTyping} animateTyping={isTyping} animateReveals={false} pickWordLiftIndex={stage === "empty" ? 0 : undefined} flipAtMs={isSolved ? 4700 : undefined} />
      <VerbleTileRow values={["", "", "", "", ""]} trailingFixed={{ 3: "'" }} animateReveals={false} pickWordLiftIndex={stage === "empty" ? 1 : undefined} />
      <VerbleTileRow values={["", "", "", "", ""]} animateReveals={false} pickWordLiftIndex={stage === "empty" ? 2 : undefined} />
      <VerbleTileRow values={["", ""]} animateReveals={false} pickWordLiftIndex={stage === "empty" ? 3 : undefined} />
      <VerbleTileRow values={[""]} animateReveals={false} pickWordLiftIndex={stage === "empty" ? 4 : undefined} />
      <VerbleTileRow values={["", "", ""]} animateReveals={false} pickWordLiftIndex={stage === "empty" ? 5 : undefined} />
    </div>
  );
}

function VerbleChooseFlow() {
  return (
    <div className="tutorial-verble-choose-flow tutorial-game-preview" role="img" aria-label="An empty phrase invites a word choice. ROME is selected, typed, submitted, and flips green.">
      <div className="tutorial-verble-stage-labels">
        <span className="tutorial-verble-step-label tutorial-verble-choose-label-pick">Pick any word</span>
        <span className="tutorial-verble-step-label tutorial-verble-choose-label-type">Type ROME</span>
        <span className="tutorial-verble-step-label tutorial-verble-choose-label-solved">ROME is correct</span>
      </div>
      <div className="tutorial-verble-layer-stack tutorial-verble-choose-layers">
        <div className="tutorial-verble-choose-empty"><VerbleChooseBoard stage="empty" /></div>
        <div className="tutorial-verble-choose-guess"><VerbleChooseBoard stage="typing" /></div>
        <div className="tutorial-verble-choose-solved"><VerbleChooseBoard stage="solved" /></div>
      </div>
      <span className="tutorial-verble-submit-cue tutorial-verble-choose-submit"><kbd>Enter</kbd><em>Submit ROME</em></span>
    </div>
  );
}

function VerblePhraseExample({ stage }: { stage: "typing" | "feedback" | "revealed" }) {
  const isRevealed = stage === "revealed";
  const isGuessing = stage === "typing" || stage === "feedback";

  return (
    <div className={`phrase-layout tutorial-verble-phrase${isGuessing ? " has-selected-word" : ""}`}>
      <VerbleTileRow values={["R", "O", "M", "E"]} states={["correct", "correct", "correct", "correct"]} animateReveals={false} />
      <VerbleTileRow values={isRevealed ? ["", "", "", "", "T"] : ["", "", "", "", ""]} states={isRevealed ? ["draft", "draft", "draft", "draft", "correct"] : undefined} trailingFixed={{ 3: "'" }} flipAtMs={isRevealed ? 5400 : undefined} flipDurationMs={520} flipStaggerMs={0} flipIndices={isRevealed ? [4] : undefined} />
      <VerbleTileRow values={isGuessing ? VERBLE_TUTORIAL.wordGuess.split("") : ["", "", "I", "", "T"]} states={stage === "feedback" ? VERBLE_TUTORIAL.wordGuessFeedback : isRevealed ? ["draft", "draft", "correct", "draft", "correct"] : undefined} selected={isGuessing} animateTyping={stage === "typing"} flipAtMs={stage === "feedback" ? 2800 : isRevealed ? 5400 : undefined} flipDurationMs={isRevealed ? 520 : 260} flipStaggerMs={isRevealed ? 0 : 208} flipIndices={isRevealed ? [2] : undefined} />
      <VerbleTileRow values={isRevealed ? ["I", ""] : ["", ""]} states={isRevealed ? ["correct", "draft"] : undefined} flipAtMs={isRevealed ? 5400 : undefined} flipDurationMs={520} flipStaggerMs={0} flipIndices={isRevealed ? [0] : undefined} />
      <VerbleTileRow values={[""]} />
      <VerbleTileRow values={["", "", ""]} />
    </div>
  );
}

function VerbleGuessFlow() {
  return (
    <div className="tutorial-verble-flow tutorial-game-preview" role="img" aria-label="With ROME solved, ADMIT is guessed for BUILT. Its tiles flip gray, yellow, and green; the yellow I and green T reveal matching spots across the phrase.">
      <div className="tutorial-verble-stage-labels">
        <span className="tutorial-verble-step-label tutorial-verble-label-guessing">Guessing ADMIT</span>
        <span className="tutorial-verble-step-label tutorial-verble-label-updated">Phrase updated</span>
      </div>
      <div className="tutorial-verble-layer-stack tutorial-verble-phrase-layers">
        <div className="tutorial-verble-phrase-typing"><VerblePhraseExample stage="typing" /></div>
        <div className="tutorial-verble-phrase-feedback"><VerblePhraseExample stage="feedback" /></div>
        <div className="tutorial-verble-phrase-after"><VerblePhraseExample stage="revealed" /></div>
      </div>
      <span className="tutorial-verble-submit-cue"><kbd>Enter</kbd><em>Submit guess</em></span>
      <div className="tutorial-verble-reveal-cue" aria-hidden="true"><span /><strong>I and T reveal matching tiles</strong><span /></div>
    </div>
  );
}

const keyboardClues = [
  { letter: "R", state: "resolved", label: "Green", meaning: "All copies revealed" },
  { letter: "A", state: "present", label: "Yellow", meaning: "At least one still hidden" },
  { letter: "Q", state: "absent", label: "Gray", meaning: "Not in the phrase" },
  { letter: "H", state: "unknown", label: "Uncolored", meaning: "No clue yet" },
] as const;

function VerbleKeyboardClues() {
  return (
    <div className="tutorial-keyboard-clues" role="list" aria-label="Keyboard letter clues">
      {keyboardClues.map(({ letter, state, label, meaning }) => (
        <div className="tutorial-keyboard-clue" role="listitem" key={state}>
          <span className="key tutorial-keyboard-key" data-state={state} aria-hidden="true">{letter}</span>
          <span className="tutorial-keyboard-clue-copy"><strong>{label}</strong><span>{meaning}</span></span>
        </div>
      ))}
    </div>
  );
}

function VerbleFullPhraseBoard({ reveal = false }: { reveal?: boolean }) {
  return (
    <div className="phrase-layout tutorial-verble-phrase">
      <VerbleTileRow values={["R", "O", "M", "E"]} states={["correct", "correct", "correct", "correct"]} animateReveals={false} />
      <VerbleTileRow values={["W", "A", "S", "N", "T"]} states={reveal ? ["correct", "correct", "correct", "correct", "correct"] : ["draft", "draft", "draft", "draft", "correct"]} trailingFixed={{ 3: "'" }} entryOrder={reveal ? [] : [0, 1, 2, 3, null]} flipAtMs={reveal ? 4500 : undefined} flipIndices={reveal ? [0, 1, 2, 3] : undefined} />
      <VerbleTileRow values={["B", "U", "I", "L", "T"]} states={reveal ? ["correct", "correct", "correct", "correct", "correct"] : ["draft", "draft", "correct", "draft", "correct"]} entryOrder={reveal ? [] : [4, 5, null, 6, null]} flipAtMs={reveal ? 4680 : undefined} flipIndices={reveal ? [0, 1, 3] : undefined} />
      <VerbleTileRow values={["I", "N"]} states={reveal ? ["correct", "correct"] : ["correct", "draft"]} entryOrder={reveal ? [] : [null, 7]} flipAtMs={reveal ? 4860 : undefined} flipIndices={reveal ? [1] : undefined} />
      <VerbleTileRow values={["A"]} states={reveal ? ["correct"] : ["draft"]} entryOrder={reveal ? [] : [8]} flipAtMs={reveal ? 5040 : undefined} />
      <VerbleTileRow values={["D", "A", "Y"]} states={reveal ? ["correct", "correct", "correct"] : ["draft", "draft", "draft"]} entryOrder={reveal ? [] : [9, 10, 11]} flipAtMs={reveal ? 5220 : undefined} />
    </div>
  );
}

function VerbleFullPhraseFlow() {
  return (
    <div className="tutorial-verble-full-flow tutorial-game-preview" role="img" aria-label="Fill the remaining tiles to complete ROME WASN'T BUILT IN A DAY. The Guess Full Phrase button becomes available, opens a confirmation, and submitting flips the remaining tiles green.">
      <div className="tutorial-verble-full-stage">
        <div className="tutorial-verble-full-board">
          <span className="tutorial-verble-step-label">Complete the phrase</span>
          <VerbleFullPhraseBoard />
          <div className="arcade-action-row tutorial-verble-action-row">
            <button className="arcade-phrase-button tutorial-verble-full-submit" type="button" tabIndex={-1}>
              <span aria-hidden="true">ϟ</span> Guess Full Phrase <small>High Stakes</small>
            </button>
          </div>
        </div>
        <div className="tutorial-verble-full-result">
          <span className="tutorial-verble-step-label">Phrase solved</span>
          <VerbleFullPhraseBoard reveal />
        </div>
        <div className="phrase-guess-modal-panel tutorial-phrase-confirm tutorial-verble-confirm-popup">
          <h4 className="result-modal-title phrase-guess-title">Submit full phrase?</h4>
          <p className="result-modal-copy phrase-guess-warning">Warning: a correct phrase wins immediately, but a miss ends the game.</p>
          <div className="phrase-guess-form">
            <p className="phrase-guess-preview">{VERBLE_TUTORIAL.phrase.toUpperCase()}</p>
            <div className="phrase-guess-actions">
              <button className="guess-submit-btn phrase-guess-secondary" type="button" tabIndex={-1}>Keep solving</button>
              <button className="guess-submit-btn" type="button" tabIndex={-1}>Submit phrase</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const pages = [
  {
    eyebrow: "Choose a word",
    heading: "Pick a word to start",
    copy: "Choose any word, type a guess, and press Enter. A correct word turns green. You can switch words at any time.",
    visual: <VerbleChooseFlow />,
  },
  {
    eyebrow: "Reveal matching letters",
    heading: "One guess helps the whole phrase",
    copy: "Try ADMIT for BUILT. Its green T and yellow I reveal matching spots across the phrase; gray letters don't.",
    visual: <VerbleGuessFlow />,
  },
  {
    eyebrow: "Keyboard clues",
    heading: "Use your keyboard clues",
    copy: "The keyboard tracks the whole phrase. Tile colors describe the word you guessed.",
    visual: <VerbleKeyboardClues />,
  },
  {
    eyebrow: "Finish the phrase",
    heading: "Think you know the phrase?",
    copy: "Fill every empty tile on the board, then tap Guess Full Phrase to review your answer. Get it right and you win; get it wrong and the game ends.",
    visual: <VerbleFullPhraseFlow />,
  },
];

export default function HowToPlayDialog({ game, onClose }: HowToPlayDialogProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const page = pages[pageIndex];
  const isLastPage = pageIndex === pages.length - 1;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => setCycle((current) => current + 1), 8400);
    return () => window.clearInterval(interval);
  }, [pageIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") setPageIndex((current) => Math.max(0, current - 1));
      if (event.key === "ArrowRight") setPageIndex((current) => Math.min(pages.length - 1, current + 1));
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="result-modal-backdrop" onClick={onClose}>
      <section className={`result-modal-panel how-to-play-modal-panel tutorial-${game}`} role="dialog" aria-modal="true" aria-labelledby="how-to-play-title" aria-describedby="how-to-play-subtitle" onClick={(event) => event.stopPropagation()}>
        <button className="arcade-dialog-close" type="button" onClick={onClose} aria-label="Close how to play dialog">×</button>
        <header className="tutorial-header">
          <h2 className="result-modal-title how-to-play-title" id="how-to-play-title">How to play</h2>
          <p className="how-to-play-subtitle" id="how-to-play-subtitle">Solve the daily phrase one word at a time.</p>
        </header>
        <div className="tutorial-page" key={`${pageIndex}-${cycle}`}>
          <div className="tutorial-copy"><span className="tutorial-eyebrow">{page.eyebrow}</span><h3>{page.heading}</h3><p>{page.copy}</p></div>
          <div className="tutorial-visual">{page.visual}</div>
        </div>
        <footer className="tutorial-footer">
          <div className="tutorial-pagination" aria-label="Tutorial pages">
            {pages.map((item, index) => <button aria-label={`View ${item.eyebrow}`} aria-current={index === pageIndex ? "step" : undefined} className={index === pageIndex ? "is-active" : ""} key={item.eyebrow} onClick={() => setPageIndex(index)} type="button" />)}
          </div>
          <span className="tutorial-page-count">{pageIndex + 1} of {pages.length}</span>
          <div className="tutorial-actions">
            {pageIndex > 0 ? <button className="tutorial-back-btn" type="button" onClick={() => setPageIndex((current) => current - 1)}>Back</button> : null}
            <button className="tutorial-next-btn" type="button" onClick={() => isLastPage ? onClose() : setPageIndex((current) => current + 1)}>{isLastPage ? "Start playing" : "Next"}</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
