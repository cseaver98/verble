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
}: {
  values: readonly string[];
  states?: readonly TileState[];
  selected?: boolean;
  trailingFixed?: Record<number, string>;
  animateReveals?: boolean;
  animateTyping?: boolean;
  entryOrder?: readonly (number | null)[];
}) {
  return (
    <div className={`slot-cluster tutorial-verble-word${animateReveals ? " tutorial-verble-animate-reveals" : ""}${animateTyping ? " tutorial-verble-typing-word" : ""}`} aria-hidden="true">
      <span className={`slot-word-button${selected ? " selected" : ""}`}>
        <span className="slot-tiles">
          {values.map((value, index) => (
            <span className="slot-char-group" key={`${value}-${index}`}>
              <span className={`slot-tile ${states[index] ?? ""} ${value ? "filled" : ""}`}>
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
            </span>
          ))}
        </span>
      </span>
    </div>
  );
}

function VerblePhraseExample({ stage }: { stage: "typing" | "feedback" | "revealed" }) {
  const isRevealed = stage === "revealed";
  const isGuessing = stage === "typing" || stage === "feedback";

  return (
    <div className="phrase-layout tutorial-verble-phrase">
      <VerbleTileRow values={["R", "O", "M", "E"]} states={["correct", "correct", "correct", "correct"]} animateReveals={false} />
      <VerbleTileRow values={isRevealed ? ["", "", "", "", "T"] : ["", "", "", "", ""]} states={isRevealed ? ["draft", "draft", "draft", "draft", "correct"] : undefined} trailingFixed={{ 3: "'" }} />
      <VerbleTileRow values={isGuessing ? VERBLE_TUTORIAL.wordGuess.split("") : ["", "", "I", "", "T"]} states={stage === "feedback" ? VERBLE_TUTORIAL.wordGuessFeedback : isRevealed ? ["draft", "draft", "correct", "draft", "correct"] : undefined} selected={stage === "typing"} animateTyping={stage === "typing"} />
      <VerbleTileRow values={isRevealed ? ["I", ""] : ["", ""]} states={isRevealed ? ["correct", "draft"] : undefined} />
      <VerbleTileRow values={[""]} />
      <VerbleTileRow values={["", "", ""]} />
    </div>
  );
}

function VerbleGuessFlow() {
  return (
    <div className="tutorial-verble-flow tutorial-game-preview" role="img" aria-label="Animated example showing a word guess revealing letters across the phrase">
      <div className="tutorial-verble-stage-labels">
        <span className="tutorial-verble-step-label tutorial-verble-label-guessing">Guessing BUILT</span>
        <span className="tutorial-verble-step-label tutorial-verble-label-updated">Phrase updated</span>
      </div>
      <div className="tutorial-verble-layer-stack tutorial-verble-phrase-layers">
        <div className="tutorial-verble-phrase-typing"><VerblePhraseExample stage="typing" /></div>
        <div className="tutorial-verble-phrase-feedback"><VerblePhraseExample stage="feedback" /></div>
        <div className="tutorial-verble-phrase-after"><VerblePhraseExample stage="revealed" /></div>
      </div>
      <span className="tutorial-verble-submit-cue"><kbd>Enter</kbd><em>Submit guess</em></span>
      <div className="tutorial-verble-reveal-cue" aria-hidden="true"><span /><strong>Yellow I + green T reveal everywhere</strong><span /></div>
    </div>
  );
}

function VerbleFullPhraseBoard() {
  return (
    <div className="phrase-layout tutorial-verble-phrase">
      <VerbleTileRow values={["R", "O", "M", "E"]} states={["correct", "correct", "correct", "correct"]} animateReveals={false} />
      <VerbleTileRow values={["W", "A", "S", "N", "T"]} states={["draft", "draft", "draft", "draft", "correct"]} trailingFixed={{ 3: "'" }} entryOrder={[0, 1, 2, 3, null]} />
      <VerbleTileRow values={["B", "U", "I", "L", "T"]} states={["draft", "draft", "correct", "draft", "correct"]} entryOrder={[4, 5, null, 6, null]} />
      <VerbleTileRow values={["I", "N"]} states={["correct", "draft"]} entryOrder={[null, 7]} />
      <VerbleTileRow values={["A"]} states={["draft"]} entryOrder={[8]} />
      <VerbleTileRow values={["D", "A", "Y"]} states={["draft", "draft", "draft"]} entryOrder={[9, 10, 11]} />
    </div>
  );
}

function VerbleFullPhraseFlow() {
  return (
    <div className="tutorial-verble-full-flow tutorial-game-preview" role="img" aria-label="Animated example of completing and submitting the full phrase">
      <div className="tutorial-verble-full-stage">
        <div className="tutorial-verble-full-board">
          <span className="tutorial-verble-step-label">Complete the phrase</span>
          <VerbleFullPhraseBoard />
          <span className="tutorial-verble-full-submit"><kbd>Enter</kbd><em>Submit full phrase</em></span>
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
    heading: "Work through the phrase",
    copy: "Select any hidden word, then use the keyboard to guess it. Solved letters also appear in matching spots across the phrase.",
    visual: (
      <div className="phrase-layout tutorial-game-preview tutorial-verble-phrase">
        <VerbleTileRow values={["R", "O", "M", "E"]} states={["correct", "correct", "correct", "correct"]} />
        <VerbleTileRow values={["", "", "", "", ""]} selected trailingFixed={{ 3: "'" }} />
        <VerbleTileRow values={["", "", "", "", ""]} />
        <VerbleTileRow values={["", ""]} />
        <VerbleTileRow values={[""]} />
        <VerbleTileRow values={["", "", ""]} />
      </div>
    ),
  },
  {
    eyebrow: "Reveal matching letters",
    heading: "One guess helps the whole phrase",
    copy: "After ADMIT is guessed for BUILT, the yellow I and green T reveal every matching spot in the phrase. Gray letters do not reveal.",
    visual: <VerbleGuessFlow />,
  },
  {
    eyebrow: "Finish the phrase",
    heading: "Submit the full phrase",
    copy: "Fill every remaining tile, then press Enter to review the full phrase. Confirm carefully: an incorrect phrase ends the game, even if you have guesses left.",
    visual: <VerbleFullPhraseFlow />,
  },
];

export default function HowToPlayDialog({ game, onClose }: HowToPlayDialogProps) {
  const [pageIndex, setPageIndex] = useState(0);
  const page = pages[pageIndex];
  const isLastPage = pageIndex === pages.length - 1;

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
        <button className="result-modal-close" type="button" onClick={onClose} aria-label="Close how to play dialog">×</button>
        <header className="tutorial-header">
          <h2 className="result-modal-title how-to-play-title" id="how-to-play-title">How to play Verble</h2>
          <p className="how-to-play-subtitle" id="how-to-play-subtitle">Solve the daily phrase one word at a time.</p>
        </header>
        <div className="tutorial-page" key={pageIndex}>
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
