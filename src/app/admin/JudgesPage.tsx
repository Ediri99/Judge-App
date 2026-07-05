import { useEffect, useState } from 'react';
import { createUserWithEmailAndPassword, signOut as secondarySignOut } from 'firebase/auth';
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { db, getSecondaryAuth } from '../../lib/firebase';
import { useAdminCollection } from './useAdminCollection';
import { EVENT_ID } from './constants';
import type { JudgeDoc, StallDoc, UniversityEntryDoc } from '../../types';

export function JudgesPage() {
  const judges = useAdminCollection<JudgeDoc>('judges');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [progressByJudge, setProgressByJudge] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadTotals() {
      const [stallSnap, entrySnap] = await Promise.all([
        getDocs(query(collection(db, 'stalls'), where('eventId', '==', EVENT_ID))),
        getDocs(query(collection(db, 'entries'), where('eventId', '==', EVENT_ID))),
      ]);
      const stalls = stallSnap.docs.map((d) => ({ id: d.id, ...(d.data() as StallDoc) }));
      const entries = entrySnap.docs.map((d) => ({ id: d.id, ...(d.data() as UniversityEntryDoc) }));
      setTotalItems(stalls.length + entries.length);
    }
    void loadTotals();
  }, []);

  useEffect(() => {
    async function loadProgress() {
      const scoreSnap = await getDocs(query(collection(db, 'scores'), where('eventId', '==', EVENT_ID), where('status', '==', 'submitted')));
      const counts: Record<string, number> = {};
      scoreSnap.docs.forEach((docSnap) => {
        const judgeId = (docSnap.data() as { judgeId?: string }).judgeId;
        if (judgeId) counts[judgeId] = (counts[judgeId] ?? 0) + 1;
      });
      setProgressByJudge(counts);
    }
    void loadProgress();
  }, [judges.items]);

  async function addJudge() {
    setError(null);
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    if (!trimmedEmail || !password || !trimmedName) {
      setError('Name, email, and a temporary password are required.');
      return;
    }
    setCreating(true);
    try {
      const secondaryAuth = getSecondaryAuth();
      const result = await createUserWithEmailAndPassword(secondaryAuth, trimmedEmail, password);
      await setDoc(doc(db, 'users', result.user.uid), {
        uid: result.user.uid,
        email: trimmedEmail,
        roles: ['judge'],
        updatedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'judges', result.user.uid), {
        displayName: trimmedName,
        email: trimmedEmail,
        role: 'judge',
        eventId: EVENT_ID,
      });
      await secondarySignOut(secondaryAuth);
      setName('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create judge account');
    } finally {
      setCreating(false);
    }
  }

  async function remove(judge: JudgeDoc) {
    if (!judge.id) return;
    if (!window.confirm(`Remove ${judge.displayName} from the judges list?`)) return;
    await judges.remove(judge.id);
  }

  return (
    <div>
      <div className="admin-head">
        <div>
          <h1>Judges</h1>
          <p>Every judge scores every item — no assignment. Progress counts submitted scores across both tracks.</p>
        </div>
      </div>

      <Card className="shell-card">
        <table className="data-table">
          <thead>
            <tr><th>Judge</th><th>Email</th><th>Progress</th><th /></tr>
          </thead>
          <tbody>
            {judges.items.map((judge) => {
              const done = progressByJudge[judge.id ?? ''] ?? 0;
              return (
                <tr key={judge.id}>
                  <td>{judge.displayName}{judge.role === 'admin' ? ' (admin)' : ''}</td>
                  <td>{judge.email}</td>
                  <td>{done}/{totalItems}</td>
                  <td><Button variant="ghost" onClick={() => remove(judge)}>Remove</Button></td>
                </tr>
              );
            })}
            {judges.items.length === 0 ? <tr><td colSpan={4}>No judges yet.</td></tr> : null}
          </tbody>
        </table>
      </Card>

      <Card className="shell-card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h3>Add judge</h3>
        </div>
        <div className="shell-actions">
          <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Input label="Temporary password" type="text" value={password} onChange={(event) => setPassword(event.target.value)} />
          <Button variant="primary" onClick={addJudge} disabled={creating}>{creating ? 'Creating…' : 'Create judge account'}</Button>
        </div>
        {error ? <p className="field-label">{error}</p> : null}
      </Card>
    </div>
  );
}
