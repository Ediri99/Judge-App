import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Select } from '../../components/Select';
import { Medal } from '../../components/Medal';
import { Pill } from '../../components/Pill';
import { MetricCard } from '../../components/MetricCard';
import { useAdminCollection } from './useAdminCollection';
import { useScores } from './useScores';
import { aggregateItemScores, groupScoresByItem, rankByAverage } from './aggregation';
import { downloadWorkbook } from './export/excelExport';
import { downloadPdfReport } from './export/pdfExport';
import type { EventDoc, HallDoc, JudgeDoc, StallCategoryDoc, StallCriterionDoc, StallDoc } from '../../types';
import { EVENT_ID } from './constants';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

type SortMode = 'rank-desc' | 'avg-asc' | 'name' | 'hall';

export function StallResultsPage() {
  const stalls = useAdminCollection<StallDoc>('stalls');
  const halls = useAdminCollection<HallDoc>('halls', 'order');
  const categories = useAdminCollection<StallCategoryDoc>('stallCategories', 'order');
  const criteria = useAdminCollection<StallCriterionDoc>('stallCriteria', 'order');
  const judges = useAdminCollection<JudgeDoc>('judges');
  const { scores } = useScores('stalls');
  const [event, setEvent] = useState<EventDoc | null>(null);

  const [hallFilter, setHallFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sort, setSort] = useState<SortMode>('rank-desc');

  useEffect(() => {
    void getDoc(doc(db, 'events', EVENT_ID)).then((snapshot) => {
      if (snapshot.exists()) setEvent({ id: snapshot.id, ...(snapshot.data() as EventDoc) });
    });
  }, []);

  const trackCriteria = useMemo(() => criteria.items.filter((row) => row.track === 'stalls'), [criteria.items]);
  const maxTotal = useMemo(() => trackCriteria.reduce((sum, row) => sum + row.max * row.weight, 0), [trackCriteria]);

  const hallMap = useMemo(() => Object.fromEntries(halls.items.map((h) => [h.id, h.name])), [halls.items]);
  const categoryMap = useMemo(() => Object.fromEntries(categories.items.map((c) => [c.id, c.name])), [categories.items]);
  const scoresByStall = useMemo(() => groupScoresByItem(scores), [scores]);

  const filteredStalls = useMemo(() => {
    return stalls.items
      .filter((stall) => hallFilter === 'all' || stall.hallId === hallFilter)
      .filter((stall) => categoryFilter === 'all' || stall.categoryId === categoryFilter);
  }, [stalls.items, hallFilter, categoryFilter]);

  const ranked = useMemo(() => {
    const rows = rankByAverage(filteredStalls, (stall) => aggregateItemScores(scoresByStall[stall.id ?? ''] ?? []));
    if (sort === 'avg-asc') {
      const scoredAsc = rows.filter((r) => r.average !== null).sort((a, b) => (a.average ?? 0) - (b.average ?? 0));
      const pending = rows.filter((r) => r.average === null);
      return [...scoredAsc, ...pending];
    }
    if (sort === 'name') {
      return [...rows].sort((a, b) => a.item.organization.localeCompare(b.item.organization));
    }
    if (sort === 'hall') {
      return [...rows].sort((a, b) => (hallMap[a.item.hallId ?? ''] ?? '').localeCompare(hallMap[b.item.hallId ?? ''] ?? ''));
    }
    return rows;
  }, [filteredStalls, scoresByStall, sort, hallMap]);

  const totalJudges = judges.items.length;
  const scoredCount = ranked.filter((row) => row.average !== null).length;
  const scoredPercent = ranked.length > 0 ? Math.round((scoredCount / ranked.length) * 100) : 0;
  const meanAverage = scoredCount > 0 ? ranked.filter((r) => r.average !== null).reduce((sum, r) => sum + (r.average ?? 0), 0) / scoredCount : null;

  function exportExcel() {
    const summaryHeaders = ['Rank', 'Organization', 'Stall no', 'Hall', 'Category', 'Average', `/ ${maxTotal}`, 'Judges in'];
    const summaryRows = ranked.map((row) => [
      row.rank ?? '–',
      row.item.organization,
      row.item.stallNo ?? '',
      hallMap[row.item.hallId ?? ''] ?? '',
      categoryMap[row.item.categoryId ?? ''] ?? '',
      row.average !== null ? row.average.toFixed(1) : 'Pending',
      maxTotal,
      row.judgesIn,
    ]);

    const judgeMap = Object.fromEntries(judges.items.map((j) => [j.id, j.displayName || j.email]));
    const rawHeaders = ['Organization', 'Judge', ...trackCriteria.map((c) => c.name), 'Total', 'Notes'];
    const rawRows: (string | number)[][] = [];
    ranked.forEach((row) => {
      const stallScores = (scoresByStall[row.item.id ?? ''] ?? []).filter((s) => s.status === 'submitted');
      stallScores.forEach((score) => {
        rawRows.push([
          row.item.organization,
          judgeMap[score.judgeId] ?? score.judgeId,
          ...trackCriteria.map((c) => score.criteria[c.id ?? ''] ?? score.criteria[c.name] ?? ''),
          score.total,
          score.notes ?? '',
        ]);
      });
    });

    void downloadWorkbook(
      [
        { name: 'Summary', headers: summaryHeaders, rows: summaryRows },
        { name: 'Raw scores', headers: rawHeaders, rows: rawRows },
      ],
      `${event?.name ?? 'event'}-stall-results.xlsx`,
    );
  }

  function exportPdf() {
    const headers = ['Rank', 'Organization', 'Hall', 'Category', 'Average', 'Judges in'];
    const rows = ranked.map((row) => [
      row.rank ?? '–',
      row.item.organization,
      hallMap[row.item.hallId ?? ''] ?? '',
      categoryMap[row.item.categoryId ?? ''] ?? '',
      row.average !== null ? `${row.average.toFixed(1)} / ${maxTotal}` : 'Pending',
      row.judgesIn,
    ]);

    void downloadPdfReport({
      title: `${event?.name ?? 'Event'} — Stall results`,
      subtitle: `${event?.year ?? ''} · ${ranked.length} stalls · generated ${new Date().toLocaleDateString()}`,
      sections: [{ heading: 'Leaderboard', headers, rows }],
      fileName: `${event?.name ?? 'event'}-stall-results.pdf`,
    });
  }

  return (
    <div>
      <div className="admin-head">
        <div>
          <h1>Stall results</h1>
          <p>Live leaderboard computed from submitted judge scores.</p>
        </div>
        <div className="admin-head-actions">
          <Button onClick={exportExcel}>Export Excel</Button>
          <Button variant="primary" onClick={exportPdf}>Export PDF</Button>
        </div>
      </div>

      <div className="metrics-row">
        <MetricCard label="Stalls" value={stalls.items.length} />
        <MetricCard label="Judges" value={totalJudges} />
        <MetricCard label="Scored" value={`${scoredPercent}%`} accent />
        <MetricCard label="Avg score" value={meanAverage !== null ? meanAverage.toFixed(1) : '—'} />
      </div>

      <Card className="shell-card">
        <div className="card-head">
          <h3>Leaderboard</h3>
        </div>
        <div className="filters" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginTop: 0, marginBottom: 16 }}>
          <Select label="Hall" value={hallFilter} onChange={(event) => setHallFilter(event.target.value)}>
            <option value="all">All halls</option>
            {halls.items.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </Select>
          <Select label="Category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} disabled={categories.items.length === 0}>
            <option value="all">All categories</option>
            {categories.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="Sort" value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
            <option value="rank-desc">Rank avg high→low</option>
            <option value="avg-asc">Avg low→high</option>
            <option value="name">Name A–Z</option>
            <option value="hall">Hall</option>
          </Select>
        </div>

        {ranked.length === 0 ? (
          <p>No stalls match these filters.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Stall</th><th>Hall</th><th>Category</th><th>Avg</th><th>Judges in</th></tr>
            </thead>
            <tbody>
              {ranked.map((row) => (
                <tr key={row.item.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Medal tone={row.rank && row.rank <= 3 ? 'gold' : 'default'}>{row.rank ?? '–'}</Medal>
                      <strong>{row.item.organization}</strong>
                    </div>
                  </td>
                  <td>{hallMap[row.item.hallId ?? ''] ?? '—'}</td>
                  <td>{categoryMap[row.item.categoryId ?? ''] ?? '—'}</td>
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
    </div>
  );
}
