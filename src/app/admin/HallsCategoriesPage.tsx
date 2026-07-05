import { useState } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { MetricCard } from '../../components/MetricCard';
import { ErrorBanner } from '../../components/ErrorBanner';
import { useAdminCollection } from './useAdminCollection';
import type { HallDoc, StallCategoryDoc, StallDoc } from '../../types';

export function HallsCategoriesPage() {
  const halls = useAdminCollection<HallDoc>('halls', 'order');
  const categories = useAdminCollection<StallCategoryDoc>('stallCategories', 'order');
  const stalls = useAdminCollection<StallDoc>('stalls');

  const [newHall, setNewHall] = useState('');
  const [newCategory, setNewCategory] = useState('');

  async function addHall() {
    const name = newHall.trim();
    if (!name) return;
    await halls.add({ name, order: halls.items.length + 1 });
    setNewHall('');
  }

  async function addCategory() {
    const name = newCategory.trim();
    if (!name) return;
    await categories.add({ name, order: categories.items.length + 1 });
    setNewCategory('');
  }

  async function removeHall(hall: HallDoc) {
    const inUse = stalls.items.some((stall) => stall.hallId === hall.id);
    if (inUse && !window.confirm(`"${hall.name}" is used by existing stalls. Remove anyway?`)) return;
    if (hall.id) await halls.remove(hall.id);
  }

  async function removeCategory(category: StallCategoryDoc) {
    const inUse = stalls.items.some((stall) => stall.categoryId === category.id);
    if (inUse && !window.confirm(`"${category.name}" is used by existing stalls. Remove anyway?`)) return;
    if (category.id) await categories.remove(category.id);
  }

  return (
    <div>
      <div className="admin-head">
        <div>
          <h1>Halls &amp; categories</h1>
          <p>Manage the halls and stall categories judges and stalls reference.</p>
        </div>
      </div>

      {halls.error ? <ErrorBanner message={`Couldn't load halls: ${halls.error}`} /> : null}
      {categories.error ? <ErrorBanner message={`Couldn't load categories: ${categories.error}`} /> : null}

      <div className="metrics-row">
        {halls.items.map((hall) => (
          <MetricCard
            key={hall.id}
            label={hall.name}
            value={stalls.items.filter((stall) => stall.hallId === hall.id).length}
          />
        ))}
        {halls.items.length === 0 ? <MetricCard label="Halls" value="0" /> : null}
      </div>

      <Card className="shell-card">
        <div className="card-head">
          <h3>Halls</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th /></tr>
          </thead>
          <tbody>
            {halls.items.map((hall) => (
              <tr key={hall.id}>
                <td>{hall.name}</td>
                <td><Button variant="ghost" onClick={() => removeHall(hall)}>Remove</Button></td>
              </tr>
            ))}
            {halls.loading ? (
              <tr><td colSpan={2}>Loading halls…</td></tr>
            ) : halls.items.length === 0 ? (
              <tr><td colSpan={2}>No halls yet.</td></tr>
            ) : null}
          </tbody>
        </table>
        <div className="shell-actions" style={{ marginTop: 12 }}>
          <Input label="New hall name" value={newHall} onChange={(event) => setNewHall(event.target.value)} />
          <Button variant="primary" onClick={addHall}>Add hall</Button>
        </div>
      </Card>

      <Card className="shell-card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h3>Stall categories</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th /></tr>
          </thead>
          <tbody>
            {categories.items.map((category) => (
              <tr key={category.id}>
                <td>{category.name}</td>
                <td><Button variant="ghost" onClick={() => removeCategory(category)}>Remove</Button></td>
              </tr>
            ))}
            {categories.loading ? (
              <tr><td colSpan={2}>Loading categories…</td></tr>
            ) : categories.items.length === 0 ? (
              <tr><td colSpan={2}>No categories yet.</td></tr>
            ) : null}
          </tbody>
        </table>
        <div className="shell-actions" style={{ marginTop: 12 }}>
          <Input label="New category name" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} />
          <Button variant="primary" onClick={addCategory}>Add category</Button>
        </div>
      </Card>
    </div>
  );
}
