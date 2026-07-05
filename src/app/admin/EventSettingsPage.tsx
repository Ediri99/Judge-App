import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { db } from '../../lib/firebase';
import { EVENT_ID } from './constants';
import type { EventDoc } from '../../types';

export function EventSettingsPage() {
  const [name, setName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const snapshot = await getDoc(doc(db, 'events', EVENT_ID));
      if (snapshot.exists()) {
        const data = snapshot.data() as EventDoc;
        setName(data.name);
        setYear(data.year);
      }
      setLoading(false);
    }
    void load();
  }, []);

  async function save() {
    await setDoc(doc(db, 'events', EVENT_ID), { name, year }, { merge: true });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) {
    return <p>Loading…</p>;
  }

  return (
    <div>
      <div className="admin-head">
        <div>
          <h1>Event settings</h1>
          <p>Name and year shown across the judge and admin apps.</p>
        </div>
      </div>

      <Card className="shell-card">
        <div className="shell-actions">
          <Input label="Event name" value={name} onChange={(event) => setName(event.target.value)} />
          <Input label="Year" type="number" value={year} onChange={(event) => setYear(Number(event.target.value))} />
          <Button variant="primary" onClick={save}>Save</Button>
        </div>
        {saved ? <p className="field-label">Saved.</p> : null}
      </Card>
    </div>
  );
}
