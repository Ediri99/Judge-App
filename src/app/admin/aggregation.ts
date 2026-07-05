import type { ScoreDoc } from '../../types';

export interface ItemAggregate {
  average: number | null;
  judgesIn: number;
  total: number;
}

/** average = (sum of submitting judges' totals) ÷ (number of judges who scored it); every judge counts, ties left tied. */
export function aggregateItemScores(scores: ScoreDoc[]): ItemAggregate {
  const submitted = scores.filter((score) => score.status === 'submitted' && !score.deleted);
  const judgesIn = submitted.length;
  const total = submitted.reduce((sum, score) => sum + (score.total ?? 0), 0);
  return {
    average: judgesIn > 0 ? total / judgesIn : null,
    judgesIn,
    total,
  };
}

export function groupScoresByItem(scores: ScoreDoc[]): Record<string, ScoreDoc[]> {
  return scores.reduce<Record<string, ScoreDoc[]>>((acc, score) => {
    if (!score.itemId) return acc;
    (acc[score.itemId] ??= []).push(score);
    return acc;
  }, {});
}

export interface RankedRow<T> {
  item: T;
  average: number | null;
  judgesIn: number;
  rank: number | null;
}

/** Ranks by average descending; unscored ("pending") items sort last with rank null. Ties are left tied (dense rank). */
export function rankByAverage<T>(
  items: T[],
  getAggregate: (item: T) => ItemAggregate,
): RankedRow<T>[] {
  const withAggregate = items.map((item) => {
    const aggregate = getAggregate(item);
    return { item, average: aggregate.average, judgesIn: aggregate.judgesIn };
  });

  const scored = withAggregate.filter((row) => row.average !== null).sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
  const pending = withAggregate.filter((row) => row.average === null);

  let rank = 0;
  let previousAverage: number | null = null;
  const rankedScored = scored.map((row) => {
    if (previousAverage === null || row.average !== previousAverage) {
      rank += 1;
      previousAverage = row.average;
    }
    return { ...row, rank };
  });

  const rankedPending = pending.map((row) => ({ ...row, rank: null }));

  return [...rankedScored, ...rankedPending];
}
