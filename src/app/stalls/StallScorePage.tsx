import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getPhotoOutboxStatus, queuePhotoForScore, writeScoreDoc } from '../../lib/offline';
import { useAuth } from '../AuthProvider';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { PhoneFrame } from '../../components/PhoneFrame';
import { SliderRow } from '../../components/SliderRow';
import { Toast } from '../../components/Toast';
import type { ScoreDoc, StallCriterionDoc, StallDoc } from '../../types';

const EVENT_ID = 'demo-event';
const TRACK = 'stalls';

export function StallScorePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [stall, setStall] = useState<StallDoc | null>(null);
  const [criteria, setCriteria] = useState<StallCriterionDoc[]>([]);
  const [score, setScore] = useState<ScoreDoc | null>(null);
  const [values, setValues] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [toastOpen, setToastOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'draft' | 'submitted'>('draft');
  const [photoStatus, setPhotoStatus] = useState<'saved' | 'queued' | 'uploading' | 'synced' | 'retry'>('saved');
  const [photoCount, setPhotoCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id || !user) return;

      const stallSnapshot = await getDoc(doc(db, 'stalls', id));
      if (!stallSnapshot.exists()) {
        navigate('/list');
        return;
      }
      const stallData = { id: stallSnapshot.id, ...(stallSnapshot.data() as StallDoc) };
      setStall(stallData);

      const criteriaSnapshot = await getDocs(
        query(
          collection(db, 'stallCriteria'),
          where('eventId', '==', EVENT_ID),
          where('track', '==', TRACK),
          orderBy('order'),
        ),
      );
      const criteriaDocs = criteriaSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as StallCriterionDoc) }));
      setCriteria(criteriaDocs);

      const scoreId = `${user.uid}_${id}`;
      const scoreSnapshot = await getDoc(doc(db, 'scores', scoreId));
      if (scoreSnapshot.exists()) {
        const scoreData = { id: scoreSnapshot.id, ...(scoreSnapshot.data() as ScoreDoc) };
        setScore(scoreData);
        setValues(scoreData.criteria);
        setNotes(scoreData.notes ?? '');
        setSubmissionStatus(scoreData.status);
        setPhotoStatus(scoreData.syncStatus ?? 'saved');
        setPhotoCount(scoreData.photos?.length ?? 0);
      } else {
        const initialValues = criteriaDocs.reduce<Record<string, number>>((acc, criterion) => {
          acc[criterion.id ?? criterion.name] = 0;
          return acc;
        }, {});
        setValues(initialValues);
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

  useEffect(() => {
    if (!score?.id) return;
    let active = true;
    void getPhotoOutboxStatus(score.id).then((status) => {
      if (active) {
        setPhotoStatus(status);
      }
    });
    return () => {
      active = false;
    };
  }, [score?.id, saving, toastOpen]);

  const handlePhotoPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !score?.id) return;
    if (photoCount >= 2) return;
    await queuePhotoForScore(score.id, file);
    setPhotoCount((current) => current + 1);
    setPhotoStatus('queued');
    event.target.value = '';
  };

  const handleSubmit = async () => {
    if (!id || !user || !stall) return;
    setSaving(true);
    const scoreId = `${user.uid}_${id}`;
    const nextScore: ScoreDoc = {
      id: scoreId,
      eventId: EVENT_ID,
      track: TRACK,
      judgeId: user.uid,
      itemId: id,
      itemType: 'stall',
      criteria: values,
      total,
      notes,
      syncStatus: photoStatus === 'queued' ? 'queued' : 'saved',
      status: 'submitted',
      createdAt: score?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await writeScoreDoc(nextScore);
    setScore(nextScore);
    setSubmissionStatus('submitted');
    setToastOpen(true);
    setTimeout(() => setToastOpen(false), 2200);
    setSaving(false);
  };

  if (!stall) {
    return <div className="page-shell">Loading…</div>;
  }

  return (
    <div className="judge-score-screen">
      <PhoneFrame>
        <div className="score-header">
          <div className="score-back">
            <Button variant="ghost" onClick={() => navigate('/list/stalls')}>Back</Button>
          </div>
          <div className="score-title">
            <div className="appbadge stalls">Stalls</div>
            <h1>{stall.organization}</h1>
            <div className="score-meta">{stall.stallNo} · {stall.hallId ?? 'Hall unknown'}</div>
          </div>
        </div>

        <div className="score-scroll">
          {criteria.map((criterion) => (
            <Card key={criterion.id} className="crit-card">
              <div className="crit-top">
                <div className="q">{criterion.name}</div>
                <div className="v">{values[criterion.id ?? criterion.name] ?? 0}<small>/{criterion.max}</small></div>
              </div>
              <SliderRow label={criterion.name} value={values[criterion.id ?? criterion.name] ?? 0} max={criterion.max} onChange={(value) => handleChange(criterion.id ?? criterion.name, value)} />
            </Card>
          ))}

          <Card className="photo-card">
            <div className="photo-row">
              <div>
                <div className="field-label">Photos</div>
                <div className="photo-copy">Capture up to 2 photos at the stall. They upload independently of score sync.</div>
              </div>
              <Button variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={photoCount >= 2}>Add photo</Button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoPick} hidden />
            <div className={`status-badge status-${photoStatus}`}>{photoStatus === 'saved' ? 'Saved on device' : photoStatus === 'queued' ? 'Queued' : photoStatus === 'uploading' ? 'Uploading' : photoStatus === 'synced' ? 'Synced' : 'Retry'}</div>
            <div className="photo-hint">{photoCount}/2 photos captured</div>
          </Card>

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
