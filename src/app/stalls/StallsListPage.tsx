import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../AuthProvider';
import { Card } from '../../components/Card';
import { PhoneFrame } from '../../components/PhoneFrame';
import { Select } from '../../components/Select';
import type { EventDoc, HallDoc, ScoreDoc, StallCategoryDoc, StallDoc } from '../../types';

const EVENT_ID = 'demo-event';
const TRACK = 'stalls';

function getDisplayName(email: string | null | undefined) {
  if (!email) return 'Judge';
  return email.split('@')[0];
}

export function StallsListPage() {
  const { user } = useAuth();
  const [event, setEvent] = useState<EventDoc | null>(null);
  const [stalls, setStalls] = useState<StallDoc[]>([]);
  const [halls, setHalls] = useState<HallDoc[]>([]);
  const [categories, setCategories] = useState<StallCategoryDoc[]>([]);
  const [scores, setScores] = useState<Record<string, ScoreDoc>>({});
  const [selectedHall, setSelectedHall] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);

      const [eventSnapshot, stallSnapshot, hallSnapshot, categorySnapshot, scoreSnapshot] = await Promise.all([
        getDoc(doc(db, 'events', EVENT_ID)),
        getDocs(query(collection(db, 'stalls'), where('eventId', '==', EVENT_ID), orderBy('stallNo'))),
        getDocs(query(collection(db, 'halls'), where('eventId', '==', EVENT_ID), orderBy('order'))),
        getDocs(query(collection(db, 'stallCategories'), where('eventId', '==', EVENT_ID), orderBy('order'))),
        getDocs(query(collection(db, 'scores'), where('eventId', '==', EVENT_ID), where('judgeId', '==', user.uid), where('track', '==', TRACK))),
      ]);

      if (eventSnapshot.exists()) {
        setEvent({ id: eventSnapshot.id, ...(eventSnapshot.data() as EventDoc) });
      }

      setStalls(stallSnapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as StallDoc) })));
      setHalls(hallSnapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as HallDoc) })));
      setCategories(categorySnapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as StallCategoryDoc) })));
      setScores(
        scoreSnapshot.docs.reduce<Record<string, ScoreDoc>>((acc, doc) => {
          const score = { id: doc.id, ...(doc.data() as ScoreDoc) };
          if (score.itemId) {
            acc[score.itemId] = score;
          }
          return acc;
        }, {}),
      );

      setLoading(false);
    };

    void load();
  }, [user]);

  const hallMap = useMemo(() => Object.fromEntries(halls.map((hall) => [hall.id, hall])), [halls]);
  const categoryMap = useMemo(() => Object.fromEntries(categories.map((category) => [category.id, category])), [categories]);

  const filteredStalls = useMemo(() => {
    return stalls
      .filter((stall) => stall.eventId === EVENT_ID)
      .filter((stall) => selectedHall === 'all' || stall.hallId === selectedHall)
      .filter((stall) => selectedCategory === 'all' || stall.categoryId === selectedCategory)
      .sort((a, b) => {
        const hallA = hallMap[a.hallId ?? '']?.order ?? 0;
        const hallB = hallMap[b.hallId ?? '']?.order ?? 0;
        if (hallA !== hallB) return hallA - hallB;
        const stallA = a.stallNo ?? '';
        const stallB = b.stallNo ?? '';
        if (stallA !== stallB) return stallA.localeCompare(stallB);
        const categoryA = categoryMap[a.categoryId ?? '']?.order ?? 0;
        const categoryB = categoryMap[b.categoryId ?? '']?.order ?? 0;
        return categoryA - categoryB;
      });
  }, [stalls, selectedHall, selectedCategory, hallMap, categoryMap]);

  const completedCount = filteredStalls.filter((stall) => scores[stall.id ?? '']?.status === 'submitted').length;
  const totalCount = filteredStalls.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="judge-list-screen">
      <PhoneFrame>
        <div className="list-head">
          <div className="greet-row">
            <div>
              <div className="name-row">
                <h1>Hi, {getDisplayName(user?.email)}</h1>
                <span className="appbadge stalls">Stalls</span>
              </div>
              <div className="event-label">Annual food & craft expo</div>
            </div>
            <div className="progress">
              <div className="count"><b>{completedCount}</b> / {totalCount}</div>
              <div className="lbl">scored</div>
            </div>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="filters">
            <Select label="Hall" value={selectedHall} onChange={(event) => setSelectedHall(event.target.value)}>
              <option value="all">All halls</option>
              {halls.map((hall) => (
                <option key={hall.id} value={hall.id}>{hall.name}</option>
              ))}
            </Select>
            <Select label="Category" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="stall-list-scroll">
          {!event || loading ? (
            <Card className="list-loading">Loading stalls…</Card>
          ) : !event.enabledTracks.includes(TRACK) ? (
            <Card className="list-empty">Stalls track is not enabled for this event.</Card>
          ) : filteredStalls.length === 0 ? (
            <Card className="list-empty">No stalls match the current filters.</Card>
          ) : (
            filteredStalls.map((stall) => {
              const score = stall.id ? scores[stall.id] : undefined;
              const isDone = score?.status === 'submitted';
              const hallName = stall.hallId ? hallMap[stall.hallId]?.name : 'No hall';
              const categoryName = stall.categoryId ? categoryMap[stall.categoryId]?.name : 'No category';
              const syncLabel = score?.syncStatus === 'queued' ? 'Queued' : score?.syncStatus === 'uploading' ? 'Uploading' : score?.syncStatus === 'synced' ? 'Synced' : score?.syncStatus === 'retry' ? 'Retry' : 'Saved';
              return (
                <Link to={`/score/stalls/${stall.id}`} key={stall.id} className={`stall-row ${isDone ? 'done' : 'todo'}`}>
                  <div className="thumb">{stall.stallNo || stall.organization.charAt(0)}</div>
                  <div className="stall-info">
                    <div className="stall-name">{stall.organization}</div>
                    <div className="stall-meta">{stall.stallNo ? `${stall.stallNo} · ` : ''}{hallName} · {categoryName}</div>
                  </div>
                  <div className="list-side">
                    <div className={`state ${isDone ? 'done' : 'todo'}`}>
                      <span className="dot" />
                      {isDone ? <span className="score-value">{score?.total}</span> : 'Pending'}
                    </div>
                    <div className={`status-badge status-${score?.syncStatus ?? 'saved'}`}>{syncLabel}</div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </PhoneFrame>
    </div>
  );
}
