import { useMemo } from 'react';
import { Card } from '../../components/Card';
import { Medal } from '../../components/Medal';
import { ErrorBanner } from '../../components/ErrorBanner';
import { useAdminCollection } from './useAdminCollection';
import { useScores } from './useScores';
import { aggregateItemScores, groupScoresByItem, rankByAverage } from './aggregation';
import { getEntryTypeLabel } from '../trackConfig';
import type { AwardCategoryDoc, UniversityDoc, UniversityEntryDoc } from '../../types';

export function WinnersPage() {
  const universities = useAdminCollection<UniversityDoc>('universities', 'name');
  const awardCategories = useAdminCollection<AwardCategoryDoc>('awardCategories', 'order');
  const entries = useAdminCollection<UniversityEntryDoc>('entries');
  const { scores, error: scoresError } = useScores('universities');

  const universityMap = useMemo(() => Object.fromEntries(universities.items.map((u) => [u.id, u.name])), [universities.items]);
  const scoresByEntry = useMemo(() => groupScoresByItem(scores), [scores]);

  const winners = useMemo(() => {
    return [...awardCategories.items]
      .sort((a, b) => a.order - b.order)
      .map((category) => {
        const categoryEntries = entries.items.filter((entry) => entry.awardCategoryId === category.id);
        const ranked = rankByAverage(categoryEntries, (entry) => aggregateItemScores(scoresByEntry[entry.id ?? ''] ?? []));
        const winner = ranked.find((row) => row.rank === 1) ?? null;
        return { category, winner };
      });
  }, [awardCategories.items, entries.items, scoresByEntry]);

  return (
    <div>
      <div className="admin-head">
        <div>
          <h1>Winners</h1>
          <p>The top-ranked entry (highest average) in each of the 6 award categories.</p>
        </div>
      </div>

      {scoresError ? <ErrorBanner message={`Couldn't load scores: ${scoresError}`} /> : null}

      <div className="metrics-row" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {winners.map(({ category, winner }) => (
          <Card key={category.id} className="shell-card">
            <div className="card-head">
              <h3>{category.name}</h3>
              <span className={`appbadge ${category.type === 'process' ? 'uni' : 'stalls'}`}>{getEntryTypeLabel(category.type)}</span>
            </div>
            {winner ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                <Medal tone="gold">1</Medal>
                <div>
                  <div style={{ fontWeight: 700 }}>{winner.item.name}</div>
                  <div className="stall-meta">{universityMap[winner.item.universityId] ?? 'Unknown university'}</div>
                  <div className="stall-meta">Average {winner.average?.toFixed(1)}</div>
                </div>
              </div>
            ) : (
              <p style={{ marginTop: 12 }}>No scores yet — winner pending.</p>
            )}
          </Card>
        ))}
        {awardCategories.loading ? (
          <Card className="shell-card">Loading winners…</Card>
        ) : winners.length === 0 ? (
          <Card className="shell-card">No award categories configured yet.</Card>
        ) : null}
      </div>
    </div>
  );
}
