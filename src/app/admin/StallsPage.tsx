import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { ErrorBanner } from '../../components/ErrorBanner';
import { storage } from '../../lib/firebase';
import { useAdminCollection } from './useAdminCollection';
import { EVENT_ID } from './constants';
import type { HallDoc, StallCategoryDoc, StallDoc } from '../../types';

const emptyForm = { id: undefined as string | undefined, organization: '', stallNo: '', hallId: '', categoryId: '', imageUrl: null as string | null };

export function StallsPage() {
  const stalls = useAdminCollection<StallDoc>('stalls');
  const halls = useAdminCollection<HallDoc>('halls', 'order');
  const categories = useAdminCollection<StallCategoryDoc>('stallCategories', 'order');
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [filterHall, setFilterHall] = useState('all');

  const hallMap = Object.fromEntries(halls.items.map((hall) => [hall.id, hall.name]));
  const categoryMap = Object.fromEntries(categories.items.map((category) => [category.id, category.name]));

  const visibleStalls = filterHall === 'all' ? stalls.items : stalls.items.filter((stall) => stall.hallId === filterHall);

  async function handleImage(file: File) {
    setUploading(true);
    try {
      const path = `stalls/${EVENT_ID}/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setForm((prev) => ({ ...prev, imageUrl: url }));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    const organization = form.organization.trim();
    if (!organization) return;
    const payload: Omit<StallDoc, 'id'> = {
      organization,
      stallNo: form.stallNo.trim() || undefined,
      hallId: form.hallId || undefined,
      categoryId: form.categoryId || undefined,
      imageUrl: form.imageUrl,
      eventId: EVENT_ID,
    };
    if (form.id) {
      await stalls.update(form.id, payload);
    } else {
      await stalls.add(payload);
    }
    setForm(emptyForm);
  }

  function edit(stall: StallDoc) {
    setForm({
      id: stall.id,
      organization: stall.organization,
      stallNo: stall.stallNo ?? '',
      hallId: stall.hallId ?? '',
      categoryId: stall.categoryId ?? '',
      imageUrl: stall.imageUrl ?? null,
    });
  }

  async function remove(stall: StallDoc) {
    if (!stall.id) return;
    if (!window.confirm(`Remove ${stall.organization}?`)) return;
    await stalls.remove(stall.id);
    if (form.id === stall.id) setForm(emptyForm);
  }

  return (
    <div>
      <div className="admin-head">
        <div>
          <h1>Stalls</h1>
          <p>Configure the stalls judges will score.</p>
        </div>
        <Select label="Hall" value={filterHall} onChange={(event) => setFilterHall(event.target.value)}>
          <option value="all">All halls</option>
          {halls.items.map((hall) => <option key={hall.id} value={hall.id}>{hall.name}</option>)}
        </Select>
      </div>

      {stalls.error ? <ErrorBanner message={`Couldn't load stalls: ${stalls.error}`} /> : null}

      <div className="metrics-row" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {visibleStalls.map((stall) => (
          <Card key={stall.id} className="shell-card">
            <div className="thumb" style={{ marginBottom: 10, backgroundImage: stall.imageUrl ? `url(${stall.imageUrl})` : undefined, backgroundSize: 'cover', width: '100%', height: 100, borderRadius: 12 }}>
              {!stall.imageUrl ? stall.organization.charAt(0) : null}
            </div>
            <strong>{stall.organization}</strong>
            <div className="stall-meta">{stall.stallNo ? `${stall.stallNo} · ` : ''}{hallMap[stall.hallId ?? ''] ?? 'No hall'} · {categoryMap[stall.categoryId ?? ''] ?? 'No category'}</div>
            <div className="shell-actions" style={{ marginTop: 10 }}>
              <Button onClick={() => edit(stall)}>Edit</Button>
              <Button variant="ghost" onClick={() => remove(stall)}>Delete</Button>
            </div>
          </Card>
        ))}
        {stalls.loading ? (
          <Card className="shell-card">Loading stalls…</Card>
        ) : visibleStalls.length === 0 ? (
          <Card className="shell-card">No stalls match these filters.</Card>
        ) : null}
      </div>

      <Card className="shell-card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h3>{form.id ? 'Edit stall' : 'Add stall'}</h3>
        </div>
        <div className="shell-actions">
          <Input label="Organization" value={form.organization} onChange={(event) => setForm((prev) => ({ ...prev, organization: event.target.value }))} />
          <Input label="Stall number(s)" value={form.stallNo} onChange={(event) => setForm((prev) => ({ ...prev, stallNo: event.target.value }))} />
          <Select label="Hall" value={form.hallId} onChange={(event) => setForm((prev) => ({ ...prev, hallId: event.target.value }))}>
            <option value="">No hall</option>
            {halls.items.map((hall) => <option key={hall.id} value={hall.id}>{hall.name}</option>)}
          </Select>
          <Select label="Category" value={form.categoryId} onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}>
            <option value="">No category</option>
            {categories.items.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </Select>
          <label className="field">
            <span className="field-label">Image</span>
            <input type="file" accept="image/*" disabled={uploading} onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImage(file);
            }} />
          </label>
        </div>
        <div className="shell-actions" style={{ marginTop: 12 }}>
          <Button variant="primary" onClick={save} disabled={uploading}>{form.id ? 'Save changes' : 'Add stall'}</Button>
          {form.id ? <Button onClick={() => setForm(emptyForm)}>Cancel</Button> : null}
        </div>
      </Card>
    </div>
  );
}
