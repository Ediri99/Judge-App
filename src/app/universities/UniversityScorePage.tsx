import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { writeScoreDoc } from '../../lib/offline';
import { useAuth } from '../AuthProvider';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { PhoneFrame } from '../../components/PhoneFrame';
import { SliderRow } from '../../components/SliderRow';
import { Toast } from '../../components/Toast';
import type { AwardCategoryDoc, ScoreDoc, UniversityDoc, UniversityEntryDoc, StallCriterionDoc } from '../../types';
import { getEntryIcon, getEntryTypeLabel } from '../trackConfig';

const EVENT_ID = 'demo-event';
const TRACK = 'universities';

export function UniversityScorePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [entry, setEntry] = useState<UniversityEntryDoc | null>(null);
  const [university, setUniversity] = useState<UniversityDoc | null>(null);
  const [awardCategory, setAwardCategory] = useState<AwardCategoryDoc | null>(null);
  const [criteria, setCriteria] = useState<StallCriterionDoc[]>([]);
  const [score, setScore] = useState<ScoreDoc | null>(null);
  const [values, setValues] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [toastOpen, setToastOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id || !user) return;

      const entrySnapshot = await getDoc(doc(db, 'entries', id));
      if (!entrySnapshot.exists()) {
        navigate('/list');
        return;
      }
      const entryData = { id: entrySnapshot.id, ...(entrySnapshot.data() as UniversityEntryDoc) };
      setEntry(entryData);

      const [uniSnapshot, categorySnapshot] = await Promise.all([
        getDoc(doc(db, 'universities', entryData.universityId)),
        getDoc(doc(db, 'awardCategories', entryData.awardCategoryId)),
      ]);
      if (uniSnapshot.exists()) setUniversity({ id: uniSnapshot.id, ...(uniSnapshot.data() as UniversityDoc) });
      if (categorySnapshot.exists()) setAwardCategory({ id: categorySnapshot.id, ...(categorySnapshot.data() as AwardCategoryDoc) });

      const type = entryData.type;
      const criteriaSnapshot = await getDocs(
        query(
          collection(db, 'stallCriteria'),
          where('eventId', '==', EVENT_ID),
          where('track', '==', TRACK),
          orderBy('order'),
        ),
      );
      const allCriteria = criteriaSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as StallCriterionDoc) }));
      const filteredCriteria = allCriteria.filter((criterion) => {
        if (criterion.name === 'Innovation' || criterion.name === 'Market relevance') {
          return type === 'product';
        }
        if (criterion.name === 'Process design' || criterion.name === 'Efficiency') {
          return type === 'process';
        }
        return true;
      });
      setCriteria(filteredCriteria);

      const scoreId = `${user.uid}_${id}`;
      const scoreSnapshot = await getDoc(doc(db, 'scores', scoreId));
      if (scoreSnapshot.exists()) {
        const scoreData = { id: scoreSnapshot.id, ...(scoreSnapshot.data() as ScoreDoc) };
        setScore(scoreData);
        setValues(scoreData.criteria);
        setNotes(scoreData.notes ?? '');
      } else {
        setValues(filteredCriteria.reduce<Record<string, number>>((acc, criterion) => {
          acc[criterion.id ?? criterion.name] = 0;
          return acc;
        }, {}));
      }
    };

    void load();
  }, [id, user, navigate]);

  const maxTotal = useMemo(() => {
    return criteria.reduce((sum, criterion) => sum + criterion.max * criterion.weight, 0);
  }, [criteria]);

  const total = useMemo(() => {
    return criteria.reduce((sum, criterion) => {
      const value = values[criterion.id ?? criterion.name] ?? 0;
      return sum + value * criterion.weight;
    }, 0);
  }, [criteria, values]);

  const handleChange = (criterionId: string, value: number) => {
    setValues((current) => ({ ...current, [criterionId]: value }));
  };

  const handleSubmit = async () => {
    if (!id || !user || !entry) return;
    setSaving(true);
    const scoreId = `${user.uid}_${id}`;
    const nextScore: ScoreDoc = {
      id: scoreId,
      eventId: EVENT_ID,
      track: TRACK,
      judgeId: user.uid,
      itemId: id,
      itemType: 'entry',
      criteria: values,
      total,
      notes,
      status: 'submitted',
      createdAt: score?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await writeScoreDoc(nextScore);
    setScore(nextScore);
    setToastOpen(true);
    setTimeout(() => setToastOpen(false), 2200);
    setSaving(false);
  };

  if (!entry || !awardCategory) {
    return <div className="page-shell">Loading…</div>;
  }

  const icon = getEntryIcon(entry.type);
  const entryTypeLabel = getEntryTypeLabel(entry.type);

  return (
    <div className="judge-score-screen">
      <PhoneFrame>
        <div className="score-header">
          <div className="score-back">
            <Button variant="ghost" onClick={() => navigate('/list')}>Back</Button>
          </div>
          <div className="score-title">
            <div className="appbadge uni">Universities</div>
            <h1>{university?.name}</h1>
            <div className="score-meta">{awardCategory.name}</div>
          </div>
        </div>

        <div className="score-scroll">
          <Card className="hero-card">
            <div className="hero-icon">{icon}</div>
            <div className="hero-copy">
              <div className="hero-type">{entryTypeLabel} entry</div>
              <div className="hero-entry">{entry.name}</div>
            </div>
          </Card>

          {criteria.map((criterion) => (
            <Card key={criterion.id} className="crit-card">
              <div className="crit-top">
                <div className="q">{criterion.name}</div>
                <div className="v">{values[criterion.id ?? criterion.name] ?? 0}<small>/10</small></div>
              </div>
              <SliderRow label={criterion.name} value={values[criterion.id ?? criterion.name] ?? 0} onChange={(value) => handleChange(criterion.id ?? criterion.name, value)} />
            </Card>
          ))}

          <div className="comment">
            <label className="field-label" htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add anything relevant for the organizer"
            />
          </div>
        </div>

        <div className="footer">
          <div className="total">
            <div className="lbl">Total</div>
            <div className="num">{total} <small>/ {maxTotal}</small></div>
          </div>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>{score ? 'Update score' : 'Submit score'}</Button>
        </div>
        <Toast open={toastOpen}>Score saved locally and submitted.</Toast>
      </PhoneFrame>
    </div>
  );
}
