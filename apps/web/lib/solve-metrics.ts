export const formatSolveTime = (seconds: number | null | undefined): string => {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 1) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
};

export const getSolveDurationSeconds = (startedAt: number | null, finishedAt: number): number | null => {
  if (startedAt === null || !Number.isFinite(startedAt) || finishedAt < startedAt) return null;
  const seconds = Math.max(1, Math.ceil((finishedAt - startedAt) / 1000));
  return seconds <= 86400 ? seconds : null;
};
