import { useState } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useAdminCollection } from './useAdminCollection';
import type { UniversityDoc } from '../../types';

export function UniversitiesPage() {
  const universities = useAdminCollection<UniversityDoc>('universities', 'name');
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  async function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await universities.add({ name: trimmed });
    setName('');
  }

  function startEdit(university: UniversityDoc) {
    setEditingId(university.id ?? null);
    setEditingName(university.name);
  }

  async function saveEdit() {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (!trimmed) return;
    await universities.update(editingId, { name: trimmed });
    setEditingId(null);
  }

  async function remove(university: UniversityDoc) {
    if (!university.id) return;
    if (!window.confirm(`Remove ${university.name}?`)) return;
    await universities.remove(university.id);
  }

  return (
    <div>
      <div className="admin-head">
        <div>
          <h1>Universities</h1>
          <p>Manage the list of participating universities.</p>
        </div>
      </div>

      <Card className="shell-card">
        <table className="data-table">
          <thead><tr><th>Name</th><th /></tr></thead>
          <tbody>
            {universities.items.map((university) => (
              <tr key={university.id}>
                <td>
                  {editingId === university.id ? (
                    <Input value={editingName} onChange={(event) => setEditingName(event.target.value)} />
                  ) : (
                    university.name
                  )}
                </td>
                <td>
                  <div className="shell-actions">
                    {editingId === university.id ? (
                      <>
                        <Button variant="primary" onClick={saveEdit}>Save</Button>
                        <Button variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button onClick={() => startEdit(university)}>Rename</Button>
                        <Button variant="ghost" onClick={() => remove(university)}>Remove</Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {universities.items.length === 0 ? <tr><td colSpan={2}>No universities yet.</td></tr> : null}
          </tbody>
        </table>
      </Card>

      <Card className="shell-card" style={{ marginTop: 16 }}>
        <div className="card-head"><h3>Add university</h3></div>
        <div className="shell-actions">
          <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <Button variant="primary" onClick={add}>Add university</Button>
        </div>
      </Card>
    </div>
  );
}
