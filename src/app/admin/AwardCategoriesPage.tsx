import { useState } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { ErrorBanner } from '../../components/ErrorBanner';
import { useAdminCollection } from './useAdminCollection';
import type { AwardCategoryDoc } from '../../types';

export function AwardCategoriesPage() {
  const awardCategories = useAdminCollection<AwardCategoryDoc>('awardCategories', 'order');
  const [name, setName] = useState('');
  const [type, setType] = useState<'product' | 'process'>('product');

  async function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await awardCategories.add({ name: trimmed, type, order: awardCategories.items.length + 1 });
    setName('');
  }

  async function changeType(category: AwardCategoryDoc, nextType: 'product' | 'process') {
    if (!category.id) return;
    await awardCategories.update(category.id, { type: nextType });
  }

  async function move(category: AwardCategoryDoc, direction: -1 | 1) {
    const sorted = [...awardCategories.items].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((row) => row.id === category.id);
    const swapWith = sorted[index + direction];
    if (!swapWith || !category.id || !swapWith.id) return;
    await awardCategories.update(category.id, { order: swapWith.order });
    await awardCategories.update(swapWith.id, { order: category.order });
  }

  async function remove(category: AwardCategoryDoc) {
    if (!category.id) return;
    if (!window.confirm(`Remove ${category.name}?`)) return;
    await awardCategories.remove(category.id);
  }

  const sorted = [...awardCategories.items].sort((a, b) => a.order - b.order);

  return (
    <div>
      <div className="admin-head">
        <div>
          <h1>Award categories</h1>
          <p>The 6 award categories drive which criteria set (product/process) an entry uses.</p>
        </div>
      </div>

      {awardCategories.error ? <ErrorBanner message={`Couldn't load award categories: ${awardCategories.error}`} /> : null}

      <Card className="shell-card">
        <table className="data-table">
          <thead><tr><th /><th>Name</th><th>Type</th><th /></tr></thead>
          <tbody>
            {sorted.map((category, index) => (
              <tr key={category.id}>
                <td>
                  <div className="shell-actions">
                    <Button variant="ghost" aria-label={`Move ${category.name} up`} disabled={index === 0} onClick={() => move(category, -1)}>↑</Button>
                    <Button variant="ghost" aria-label={`Move ${category.name} down`} disabled={index === sorted.length - 1} onClick={() => move(category, 1)}>↓</Button>
                  </div>
                </td>
                <td>{category.name}</td>
                <td>
                  <Select aria-label={`Type for ${category.name}`} value={category.type} onChange={(event) => changeType(category, event.target.value as 'product' | 'process')}>
                    <option value="product">Product</option>
                    <option value="process">Process</option>
                  </Select>
                </td>
                <td><Button variant="ghost" onClick={() => remove(category)}>Remove</Button></td>
              </tr>
            ))}
            {awardCategories.loading ? (
              <tr><td colSpan={4}>Loading award categories…</td></tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan={4}>No award categories yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </Card>

      <Card className="shell-card" style={{ marginTop: 16 }}>
        <div className="card-head"><h3>Add award category</h3></div>
        <div className="shell-actions">
          <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <Select label="Type" value={type} onChange={(event) => setType(event.target.value as 'product' | 'process')}>
            <option value="product">Product</option>
            <option value="process">Process</option>
          </Select>
          <Button variant="primary" onClick={add}>Add category</Button>
        </div>
      </Card>
    </div>
  );
}
