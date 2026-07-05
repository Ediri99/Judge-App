import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../AuthProvider';
import { Card } from '../../components/Card';
import { PhoneFrame } from '../../components/PhoneFrame';
import { Select } from '../../components/Select';
import type { AwardCategoryDoc, ScoreDoc, UniversityDoc, UniversityEntryDoc } from '../../types';
import type { EventDoc } from '../../types';
import { getEntryIcon } from '../trackConfig';

const EVENT_ID = 'demo-event';
const TRACK = 'universities';

function getDisplayName(email: string | null | undefined) {
  if (!email) return 'Judge';
  return email.split('@')[0];
}

export function UniversitiesListPage() {
  const { user } = useAuth();
  const [event, setEvent] = useState<EventDoc | null>(null);
  const [entries, setEntries] = useState<UniversityEntryDoc[]>([]);
  const [awardCategories, setAwardCategories] = useState<AwardCategoryDoc[]>([]);
  const [universities, setUniversities] = useState<UniversityDoc[]>([]);
  const [scores, setScores] = useState<Record<string, ScoreDoc>>({});
  const [selectedAwardCategory, setSelectedAwardCategory] = useState<string>('all');
  const [selectedUniversity, setSelectedUniversity] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);

      const [eventSnapshot, entriesSnapshot, awardCategorySnapshot, universitySnapshot, scoreSnapshot] = await Promise.all([
        getDoc(doc(db, 'events', EVENT_ID)),
        getDocs(query(collection(db, 'entries'), where('eventId', '==', EVENT_ID), orderBy('awardCategoryId'))),
        getDocs(query(collection(db, 'awardCategories'), where('eventId', '==', EVENT_ID), orderBy('order'))),
        getDocs(query(collection(db, 'universities'), where('eventId', '==', EVENT_ID), orderBy('name'))),
        getDocs(query(collection(db, 'scores'), where('eventId', '==', EVENT_ID), where('judgeId', '==', user.uid), where('track', '==', TRACK))),
      ]);

      if (eventSnapshot.exists()) {
        setEvent({ id: eventSnapshot.id, ...(eventSnapshot.data() as EventDoc) });
      }

      setEntries(entriesSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as UniversityEntryDoc) })));
      setAwardCategories(awardCategorySnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as AwardCategoryDoc) })));
      setUniversities(universitySnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as UniversityDoc) })));
      setScores(
        scoreSnapshot.docs.reduce<Record<string, ScoreDoc>>((acc, docSnap) => {
          const score = { id: docSnap.id, ...(docSnap.data() as ScoreDoc) };
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

  const categoryMap = useMemo(() => Object.fromEntries(awardCategories.map((category) => [category.id, category])), [awardCategories]);
  const universityMap = useMemo(() => Object.fromEntries(universities.map((uni) => [uni.id, uni])), [universities]);

  const filteredEntries = useMemo(() => {
    return entries
      .filter((entry) => entry.eventId === EVENT_ID)
      .filter((entry) => selectedAwardCategory === 'all' || entry.awardCategoryId === selectedAwardCategory)
      .filter((entry) => selectedUniversity === 'all' || entry.universityId === selectedUniversity)
      .map((entry) => ({
        ...entry,
        awardCategory: categoryMap[entry.awardCategoryId],
        university: universityMap[entry.universityId],
      }))
      .filter((entry) => entry.awardCategory && entry.university);
  }, [entries, selectedAwardCategory, selectedUniversity, categoryMap, universityMap]);

  const completedCount = filteredEntries.filter((entry) => scores[entry.id ?? '']?.status === 'submitted').length;
  const totalCount = filteredEntries.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="judge-list-screen">
      <PhoneFrame>
        <div className="list-head">
          <div className="greet-row">
            <div>
              <div className="name-row">
                <h1>Hi, {getDisplayName(user?.email)}</h1>
                <span className="appbadge uni">Universities</span>
              </div>
              <div className="event-label">University innovation awards</div>
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
            <Select label="Award category" value={selectedAwardCategory} onChange={(event) => setSelectedAwardCategory(event.target.value)}>
              <option value="all">All award categories</option>
              {awardCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </Select>
            <Select label="University" value={selectedUniversity} onChange={(event) => setSelectedUniversity(event.target.value)}>
              <option value="all">All universities</option>
              {universities.map((uni) => (
                <option key={uni.id} value={uni.id}>{uni.name}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="stall-list-scroll">
          {!event || loading ? (
            <Card className="list-loading">Loading entries…</Card>
          ) : !event.enabledTracks.includes(TRACK) ? (
            <Card className="list-empty">Universities track is not enabled for this event.</Card>
          ) : filteredEntries.length === 0 ? (
            <Card className="list-empty">No entries match the current filters.</Card>
          ) : (
            filteredEntries.map((entry) => {
              const score = entry.id ? scores[entry.id] : undefined;
              const isDone = score?.status === 'submitted';
              const categoryType = entry.awardCategory?.type;
              const icon = getEntryIcon(categoryType ?? 'product');
              const syncLabel = score?.syncStatus === 'queued' ? 'Queued' : score?.syncStatus === 'uploading' ? 'Uploading' : score?.syncStatus === 'synced' ? 'Synced' : score?.syncStatus === 'retry' ? 'Retry' : 'Saved';
              return (
                <Link to={`/score/${entry.id}`} key={entry.id} className={`stall-row ${isDone ? 'done' : 'todo'}`}>
                  <div className="thumb">{icon}</div>
                  <div className="stall-info">
                    <div className="stall-name">{entry.university?.name}</div>
                    <div className="stall-meta">{entry.name} · {entry.awardCategory?.name}</div>
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
