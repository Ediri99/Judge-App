import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { storage } from '../../lib/firebase';
import { useAdminCollection } from './useAdminCollection';
import { EVENT_ID } from './constants';
import { getEntryTypeLabel } from '../trackConfig';
import type { AwardCategoryDoc, UniversityDoc, UniversityEntryDoc } from '../../types';

const emptyForm = {
  id: undefined as string | undefined,
  universityId: '',
  awardCategoryId: '',
  name: '',
  imageUrl: null as string | null,
};

export function EntriesPage() {
  const entries = useAdminCollection<UniversityEntryDoc>('entries');
  const universities = useAdminCollection<UniversityDoc>('universities', 'name');
  const awardCategories = useAdminCollection<AwardCategoryDoc>('awardCategories', 'order');
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);

  const universityMap = Object.fromEntries(universities.items.map((u) => [u.id, u.name]));
  const categoryMap = Object.fromEntries(awardCategories.items.map((c) => [c.id, c]));

  async function handleImage(file: File) {
    setUploading(true);
    try {
      const path = `entries/${EVENT_ID}/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setForm((prev) => ({ ...prev, imageUrl: url }));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    const trimmedName = form.name.trim();
    if (!trimmedName || !form.universityId || !form.awardCategoryId) return;
    const category = categoryMap[form.awardCategoryId];
    const payload: Omit<UniversityEntryDoc, 'id'> = {
      universityId: form.universityId,
      awardCategoryId: form.awardCategoryId,
      type: category?.type ?? 'product',
      name: trimmedName,
      imageUrl: form.imageUrl,
      eventId: EVENT_ID,
    };
    if (form.id) {
      await entries.update(form.id, payload);
    } else {
      await entries.add(payload);
    }
    setForm(emptyForm);
  }

  function edit(entry: UniversityEntryDoc) {
    setForm({
      id: entry.id,
      universityId: entry.universityId,
      awardCategoryId: entry.awardCategoryId,
      name: entry.name,
      imageUrl: entry.imageUrl ?? null,
    });
  }

  async function remove(entry: UniversityEntryDoc) {
    if (!entry.id) return;
    if (!window.confirm(`Remove entry "${entry.name}"?`)) return;
    await entries.remove(entry.id);
    if (form.id === entry.id) setForm(emptyForm);
  }

  return (
    <div>
      <div className="admin-head">
        <div>
          <h1>Entries</h1>
          <p>One entry per university × award category, read by the universities judge app.</p>
        </div>
      </div>

      <Card className="shell-card">
        <table className="data-table">
          <thead><tr><th>University</th><th>Award category</th><th>Type</th><th>Entry name</th><th /></tr></thead>
          <tbody>
            {entries.items.map((entry) => (
              <tr key={entry.id}>
                <td>{universityMap[entry.universityId] ?? 'Unknown'}</td>
                <td>{categoryMap[entry.awardCategoryId]?.name ?? 'Unknown'}</td>
                <td>{getEntryTypeLabel(entry.type)}</td>
                <td>{entry.name}</td>
                <td>
                  <div className="shell-actions">
                    <Button onClick={() => edit(entry)}>Edit</Button>
                    <Button variant="ghost" onClick={() => remove(entry)}>Delete</Button>
                  </div>
                </td>
              </tr>
            ))}
            {entries.items.length === 0 ? <tr><td colSpan={5}>No entries yet.</td></tr> : null}
          </tbody>
        </table>
      </Card>

      <Card className="shell-card" style={{ marginTop: 16 }}>
        <div className="card-head"><h3>{form.id ? 'Edit entry' : 'Add entry'}</h3></div>
        <div className="shell-actions">
          <Select label="University" value={form.universityId} onChange={(event) => setForm((prev) => ({ ...prev, universityId: event.target.value }))}>
            <option value="">Select university</option>
            {universities.items.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
          <Select label="Award category" value={form.awardCategoryId} onChange={(event) => setForm((prev) => ({ ...prev, awardCategoryId: event.target.value }))}>
            <option value="">Select award category</option>
            {awardCategories.items.map((c) => <option key={c.id} value={c.id}>{c.name} ({getEntryTypeLabel(c.type)})</option>)}
          </Select>
          <Input label="Entry name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          <label className="field">
            <span className="field-label">Image</span>
            <input type="file" accept="image/*" disabled={uploading} onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImage(file);
            }} />
          </label>
        </div>
        <div className="shell-actions" style={{ marginTop: 12 }}>
          <Button variant="primary" onClick={save} disabled={uploading}>{form.id ? 'Save changes' : 'Add entry'}</Button>
          {form.id ? <Button onClick={() => setForm(emptyForm)}>Cancel</Button> : null}
        </div>
      </Card>
    </div>
  );
}
