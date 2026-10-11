export type FirstPlayResult = {
  isWin: boolean;
  guessesUsed: number;
};

export type PuzzlePlayStatus = {
  daily: FirstPlayResult | null;
  archive: FirstPlayResult | null;
};
