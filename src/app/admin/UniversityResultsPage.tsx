import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Select } from '../../components/Select';
import { Medal } from '../../components/Medal';
import { Pill } from '../../components/Pill';
import { MetricCard } from '../../components/MetricCard';
import { ErrorBanner } from '../../components/ErrorBanner';
import { db } from '../../lib/firebase';
import { useAdminCollection } from './useAdminCollection';
import { useScores } from './useScores';
import { aggregateItemScores, groupScoresByItem, rankByAverage } from './aggregation';
import { downloadWorkbook } from './export/excelExport';
import { downloadPdfReport } from './export/pdfExport';
import { getEntryTypeLabel } from '../trackConfig';
import { EVENT_ID } from './constants';
import type { AwardCategoryDoc, EventDoc, JudgeDoc, StallCriterionDoc, UniversityDoc, UniversityEntryDoc } from '../../types';

export function UniversityResultsPage() {
  const universities = useAdminCollection<UniversityDoc>('universities', 'name');
  const awardCategories = useAdminCollection<AwardCategoryDoc>('awardCategories', 'order');
  const entries = useAdminCollection<UniversityEntryDoc>('entries');
  const criteria = useAdminCollection<StallCriterionDoc>('stallCriteria', 'order');
  const judges = useAdminCollection<JudgeDoc>('judges');
  const { scores, error: scoresError } = useScores('universities');
  const [event, setEvent] = useState<EventDoc | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    void getDoc(doc(db, 'events', EVENT_ID)).then((snapshot) => {
      if (snapshot.exists()) setEvent({ id: snapshot.id, ...(snapshot.data() as EventDoc) });
    });
  }, []);

  const universityMap = useMemo(() => Object.fromEntries(universities.items.map((u) => [u.id, u.name])), [universities.items]);
  const scoresByEntry = useMemo(() => groupScoresByItem(scores), [scores]);
  const totalJudges = judges.items.length;
  const universityCriteria = useMemo(() => criteria.items.filter((row) => row.track === 'universities'), [criteria.items]);

  const sortedCategories = useMemo(() => [...awardCategories.items].sort((a, b) => a.order - b.order), [awardCategories.items]);
  const visibleCategories = categoryFilter === 'all' ? sortedCategories : sortedCategories.filter((c) => c.id === categoryFilter);

  const categoryLeaderboards = useMemo(() => {
    return visibleCategories.map((category) => {
      const categoryEntries = entries.items.filter((entry) => entry.awardCategoryId === category.id);
      const ranked = rankByAverage(categoryEntries, (entry) => aggregateItemScores(scoresByEntry[entry.id ?? ''] ?? []));
      return { category, ranked };
    });
  }, [visibleCategories, entries.items, scoresByEntry]);

  function maxTotalFor(type: 'product' | 'process') {
    return universityCriteria
      .filter((row) => row.variant === type || row.variant === 'shared' || !row.variant)
      .reduce((sum, row) => sum + row.max * row.weight, 0);
  }

  function exportExcel() {
    const categoryHeaders = ['Award category', 'Type', 'Rank', 'University', 'Entry', 'Average', 'Judges in'];
    const categoryRows: (string | number)[][] = [];
    const universityHeaders = ['University', 'Award category', 'Entry', 'Average', 'Judges in'];
    const universityRows: (string | number)[][] = [];
    const winnersHeaders = ['Award category', 'University', 'Entry', 'Winning average'];
    const winnersRows: (string | number)[][] = [];
    const judgeMap = Object.fromEntries(judges.items.map((j) => [j.id, j.displayName || j.email]));
    const rawHeaders = ['Award category', 'Entry', 'University', 'Judge', ...universityCriteria.map((c) => c.name), 'Total', 'Notes'];
    const rawRows: (string | number)[][] = [];

    categoryLeaderboards.forEach(({ category, ranked }) => {
      ranked.forEach((row) => {
        const avgLabel = row.average !== null ? row.average.toFixed(1) : 'Pending';
        categoryRows.push([category.name, getEntryTypeLabel(category.type), row.rank ?? '–', universityMap[row.item.universityId] ?? '', row.item.name, avgLabel, row.judgesIn]);
        universityRows.push([universityMap[row.item.universityId] ?? '', category.name, row.item.name, avgLabel, row.judgesIn]);
        if (row.rank === 1) {
          winnersRows.push([category.name, universityMap[row.item.universityId] ?? '', row.item.name, avgLabel]);
        }
        const entryScores = (scoresByEntry[row.item.id ?? ''] ?? []).filter((s) => s.status === 'submitted');
        entryScores.forEach((score) => {
          rawRows.push([
            category.name,
            row.item.name,
            universityMap[row.item.universityId] ?? '',
            judgeMap[score.judgeId] ?? score.judgeId,
            ...universityCriteria.map((c) => score.criteria[c.id ?? ''] ?? score.criteria[c.name] ?? ''),
            score.total,
            score.notes ?? '',
          ]);
        });
      });
    });

    universityRows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

    void downloadWorkbook(
      [
        { name: 'By category', headers: categoryHeaders, rows: categoryRows },
        { name: 'By university', headers: universityHeaders, rows: universityRows },
        { name: 'Winners', headers: winnersHeaders, rows: winnersRows },
        { name: 'Raw scores', headers: rawHeaders, rows: rawRows },
      ],
      `${event?.name ?? 'event'}-university-results.xlsx`,
    );
  }

  function exportPdf() {
    const sections = categoryLeaderboards.map(({ category, ranked }) => ({
      heading: `${category.name} (${getEntryTypeLabel(category.type)})`,
      headers: ['Rank', 'University', 'Entry', 'Average', 'Judges in'],
      rows: ranked.map((row) => [
        row.rank ?? '–',
        universityMap[row.item.universityId] ?? '',
        row.item.name,
        row.average !== null ? `${row.average.toFixed(1)} / ${maxTotalFor(category.type)}` : 'Pending',
        row.judgesIn,
      ]),
    }));

    void downloadPdfReport({
      title: `${event?.name ?? 'Event'} — University results`,
      subtitle: `${event?.year ?? ''} · generated ${new Date().toLocaleDateString()}`,
      sections,
      fileName: `${event?.name ?? 'event'}-university-results.pdf`,
    });
  }

  return (
    <div>
      <div className="admin-head">
        <div>
          <h1>University results</h1>
          <p>One leaderboard per award category, ranked by average.</p>
        </div>
        <div className="admin-head-actions">
          <Button onClick={exportExcel}>Export Excel</Button>
          <Button variant="primary" onClick={exportPdf}>Export PDF</Button>
        </div>
      </div>

      {scoresError ? <ErrorBanner message={`Couldn't load scores: ${scoresError}`} /> : null}
      {entries.error ? <ErrorBanner message={`Couldn't load entries: ${entries.error}`} /> : null}

      <div className="metrics-row">
        <MetricCard label="Universities" value={universities.items.length} />
        <MetricCard label="Award categories" value={awardCategories.items.length} />
        <MetricCard label="Entries" value={entries.items.length} />
        <MetricCard label="Judges" value={totalJudges} />
      </div>

      <div className="filters" style={{ gridTemplateColumns: 'minmax(220px, 320px)', marginBottom: 16 }}>
        <Select label="Award category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value="all">All categories</option>
          {sortedCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>

      {awardCategories.loading || entries.loading ? (
        <Card className="shell-card">Loading results…</Card>
      ) : categoryLeaderboards.length === 0 ? (
        <Card className="shell-card">No award categories match these filters.</Card>
      ) : (
        categoryLeaderboards.map(({ category, ranked }) => (
          <Card key={category.id} className="shell-card" style={{ marginBottom: 16 }}>
            <div className="card-head">
              <h3>{category.name}</h3>
              <span className={`appbadge ${category.type === 'process' ? 'uni' : 'stalls'}`}>{getEntryTypeLabel(category.type)}</span>
            </div>
            {ranked.length === 0 ? (
              <p>No entries in this category.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Entry</th><th>University</th><th>Avg</th><th>Judges in</th></tr>
                </thead>
                <tbody>
                  {ranked.map((row) => (
                    <tr key={row.item.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Medal tone={row.rank && row.rank <= 3 ? 'gold' : 'default'}>{row.rank ?? '–'}</Medal>
                          <strong>{row.item.name}</strong>
                        </div>
                      </td>
                      <td>{universityMap[row.item.universityId] ?? '—'}</td>
                      <td>{row.average !== null ? row.average.toFixed(1) : '—'}</td>
                      <td>
                        {row.average === null ? (
                          <Pill tone="default">Pending</Pill>
                        ) : (
                          <Pill tone={row.judgesIn === totalJudges ? 'success' : 'warning'}>{row.judgesIn === totalJudges ? 'Full' : 'Part'} · {row.judgesIn}/{totalJudges}</Pill>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
