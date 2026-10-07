type GuessProgressChipProps = {
  used: number;
  total: number;
};

export default function GuessProgressChip({ used, total }: GuessProgressChipProps) {
  const guessesLeft = Math.max(0, total - used);

  return (
    <span className="chip guess-progress-chip">
      <span className="guess-progress-label">Tries <strong>{guessesLeft}</strong><span>/{total}</span></span>
      <span className="guess-progress-bars" aria-hidden="true">
        {Array.from({ length: total }, (_, index) => (
          <span
            className={index >= total - guessesLeft ? "is-remaining" : undefined}
            key={index}
          />
        ))}
      </span>
    </span>
  );
}
