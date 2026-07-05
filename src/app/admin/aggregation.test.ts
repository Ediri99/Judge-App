import { describe, expect, it } from 'vitest';
import { aggregateItemScores, groupScoresByItem, rankByAverage } from './aggregation';
import type { ScoreDoc } from '../../types';

function makeScore(overrides: Partial<ScoreDoc>): ScoreDoc {
  return {
    eventId: 'demo-event',
    track: 'stalls',
    judgeId: 'judge-1',
    itemId: 'item-1',
    itemType: 'stall',
    criteria: {},
    total: 0,
    status: 'submitted',
    ...overrides,
  };
}

describe('aggregateItemScores', () => {
  it('averages submitted totals and counts judges in', () => {
    const scores = [
      makeScore({ judgeId: 'a', total: 80 }),
      makeScore({ judgeId: 'b', total: 90 }),
    ];
    const result = aggregateItemScores(scores);
    expect(result.average).toBe(85);
    expect(result.judgesIn).toBe(2);
  });

  it('ignores draft and deleted (tombstoned) scores', () => {
    const scores = [
      makeScore({ judgeId: 'a', total: 100 }),
      makeScore({ judgeId: 'b', total: 999, status: 'draft' }),
      makeScore({ judgeId: 'c', total: 999, deleted: true }),
    ];
    const result = aggregateItemScores(scores);
    expect(result.average).toBe(100);
    expect(result.judgesIn).toBe(1);
  });

  it('reports pending (null average) when nobody has scored yet', () => {
    const result = aggregateItemScores([]);
    expect(result.average).toBeNull();
    expect(result.judgesIn).toBe(0);
  });
});

describe('groupScoresByItem', () => {
  it('groups scores by itemId', () => {
    const scores = [
      makeScore({ itemId: 'stall-1', judgeId: 'a' }),
      makeScore({ itemId: 'stall-1', judgeId: 'b' }),
      makeScore({ itemId: 'stall-2', judgeId: 'a' }),
    ];
    const grouped = groupScoresByItem(scores);
    expect(grouped['stall-1']).toHaveLength(2);
    expect(grouped['stall-2']).toHaveLength(1);
  });
});

describe('rankByAverage', () => {
  interface Item {
    id: string;
    scores: ScoreDoc[];
  }

  function rank(items: Item[]) {
    return rankByAverage(items, (item) => aggregateItemScores(item.scores));
  }

  it('ranks scored items above pending ones, pending sorted last', () => {
    const items: Item[] = [
      { id: 'pending', scores: [] },
      { id: 'high', scores: [makeScore({ total: 90 })] },
      { id: 'low', scores: [makeScore({ total: 60 })] },
    ];

    const ranked = rank(items);
    expect(ranked.map((row) => row.item.id)).toEqual(['high', 'low', 'pending']);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].rank).toBeNull();
  });

  it('leaves true ties tied (dense ranking), not skip-ranking', () => {
    const items: Item[] = [
      { id: 'a', scores: [makeScore({ total: 80 })] },
      { id: 'b', scores: [makeScore({ total: 80 })] },
      { id: 'c', scores: [makeScore({ total: 70 })] },
    ];

    const ranked = rank(items);
    const byId = Object.fromEntries(ranked.map((row) => [row.item.id, row.rank]));
    expect(byId.a).toBe(1);
    expect(byId.b).toBe(1);
    expect(byId.c).toBe(2);
  });

  it('computes average as sum of submitting judges totals divided by judges in, every judge counted once', () => {
    const items: Item[] = [
      {
        id: 'stall-1',
        scores: [makeScore({ judgeId: 'a', total: 70 }), makeScore({ judgeId: 'b', total: 90 }), makeScore({ judgeId: 'c', total: 80 })],
      },
    ];
    const [row] = rank(items);
    expect(row.average).toBe(80);
    expect(row.judgesIn).toBe(3);
  });
});
