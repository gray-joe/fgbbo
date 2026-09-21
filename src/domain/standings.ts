export interface Ranked {
  rank: number;
}

export function rankEntries<T extends { total_points: number; correct_predictions: number }>(
  entries: T[],
): (T & Ranked)[] {
  const sorted = [...entries].sort(
    (a, b) =>
      b.total_points - a.total_points ||
      b.correct_predictions - a.correct_predictions,
  );

  const ranked: (T & Ranked)[] = [];
  let previous: T | undefined;
  let rank = 0;
  for (const [index, entry] of sorted.entries()) {
    const tiedWithPrevious =
      previous !== undefined &&
      entry.total_points === previous.total_points &&
      entry.correct_predictions === previous.correct_predictions;
    if (!tiedWithPrevious) {
      rank = index + 1;
    }
    ranked.push({ ...entry, rank });
    previous = entry;
  }
  return ranked;
}
