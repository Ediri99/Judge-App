import { useMemo, useState } from 'react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { ErrorBanner } from '../../components/ErrorBanner';
import { useAdminCollection } from './useAdminCollection';
import type { StallCriterionDoc, Track } from '../../types';

type Variant = 'product' | 'process' | 'shared';

function CriteriaGroup({
  title,
  rows,
  loading,
  onMove,
  onChangeField,
  onRemove,
}: {
  title: string;
  rows: StallCriterionDoc[];
  loading: boolean;
  onMove: (row: StallCriterionDoc, direction: -1 | 1) => void;
  onChangeField: (row: StallCriterionDoc, field: 'name' | 'max' | 'weight', value: string) => void;
  onRemove: (row: StallCriterionDoc) => void;
}) {
  return (
    <Card className="shell-card" style={{ marginTop: 16 }}>
      <div className="card-head">
        <h3>{title}</h3>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th /><th>Name</th><th>Max</th><th>Weight</th><th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id}>
              <td>
                <div className="shell-actions">
                  <Button variant="ghost" aria-label={`Move ${row.name} up`} disabled={index === 0} onClick={() => onMove(row, -1)}>↑</Button>
                  <Button variant="ghost" aria-label={`Move ${row.name} down`} disabled={index === rows.length - 1} onClick={() => onMove(row, 1)}>↓</Button>
                </div>
              </td>
              <td>
                <Input value={row.name} onChange={(event) => onChangeField(row, 'name', event.target.value)} />
              </td>
              <td style={{ width: 90 }}>
                <Input type="number" value={row.max} onChange={(event) => onChangeField(row, 'max', event.target.value)} />
              </td>
              <td style={{ width: 90 }}>
                <Input type="number" value={row.weight} onChange={(event) => onChangeField(row, 'weight', event.target.value)} />
              </td>
              <td><Button variant="ghost" onClick={() => onRemove(row)}>Remove</Button></td>
            </tr>
          ))}
          {loading ? (
            <tr><td colSpan={5}>Loading criteria…</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={5}>No criteria yet.</td></tr>
          ) : null}
        </tbody>
      </table>
    </Card>
  );
}

export function CriteriaPage({ track }: { track: Track }) {
  const criteria = useAdminCollection<StallCriterionDoc>('stallCriteria', 'order');
  const [name, setName] = useState('');
  const [max, setMax] = useState('10');
  const [weight, setWeight] = useState('1');
  const [variant, setVariant] = useState<Variant>(track === 'stalls' ? 'shared' : 'product');

  const trackRows = useMemo(() => criteria.items.filter((row) => row.track === track), [criteria.items, track]);

  const groups = useMemo(() => {
    if (track === 'stalls') {
      return [{ key: 'shared' as Variant, title: 'Stall criteria', rows: trackRows.sort((a, b) => a.order - b.order) }];
    }
    return [
      { key: 'product' as Variant, title: 'Product set', rows: trackRows.filter((row) => row.variant !== 'process').sort((a, b) => a.order - b.order) },
      { key: 'process' as Variant, title: 'Process set', rows: trackRows.filter((row) => row.variant !== 'product').sort((a, b) => a.order - b.order) },
    ];
  }, [track, trackRows]);

  async function addCriterion() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const scopeRows = track === 'stalls' ? trackRows : trackRows.filter((row) => row.variant === variant || row.variant === 'shared');
    await criteria.add({
      name: trimmed,
      max: Number(max) || 10,
      weight: Number(weight) || 1,
      order: scopeRows.length + 1,
      track,
      variant: track === 'stalls' ? undefined : variant,
    });
    setName('');
    setMax('10');
    setWeight('1');
  }

  async function move(row: StallCriterionDoc, direction: -1 | 1) {
    const groupRows = groups.find((group) => group.rows.some((r) => r.id === row.id))?.rows ?? [];
    const index = groupRows.findIndex((r) => r.id === row.id);
    const swapWith = groupRows[index + direction];
    if (!swapWith || !row.id || !swapWith.id) return;
    await criteria.update(row.id, { order: swapWith.order });
    await criteria.update(swapWith.id, { order: row.order });
  }

  async function changeField(row: StallCriterionDoc, field: 'name' | 'max' | 'weight', value: string) {
    if (!row.id) return;
    if (field === 'name') {
      await criteria.update(row.id, { name: value });
    } else {
      await criteria.update(row.id, { [field]: Number(value) || 0 });
    }
  }

  async function remove(row: StallCriterionDoc) {
    if (row.id) await criteria.remove(row.id);
  }

  return (
    <div>
      <div className="admin-head">
        <div>
          <h1>{track === 'stalls' ? 'Stall criteria' : 'University criteria'}</h1>
          <p>Editing max/weight or order here changes judge scoring and totals immediately.</p>
        </div>
      </div>

      {criteria.error ? <ErrorBanner message={`Couldn't load criteria: ${criteria.error}`} /> : null}

      {groups.map((group) => (
        <CriteriaGroup
          key={group.key}
          title={group.title}
          rows={group.rows}
          loading={criteria.loading}
          onMove={move}
          onChangeField={changeField}
          onRemove={remove}
        />
      ))}

      <Card className="shell-card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <h3>Add criterion</h3>
        </div>
        <div className="shell-actions">
          <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />
          <Input label="Max" type="number" value={max} onChange={(event) => setMax(event.target.value)} />
          <Input label="Weight" type="number" value={weight} onChange={(event) => setWeight(event.target.value)} />
          {track === 'universities' ? (
            <Select label="Set" value={variant} onChange={(event) => setVariant(event.target.value as Variant)}>
              <option value="product">Product</option>
              <option value="process">Process</option>
              <option value="shared">Shared (both sets)</option>
            </Select>
          ) : null}
          <Button variant="primary" onClick={addCriterion}>Add criterion</Button>
        </div>
      </Card>
    </div>
  );
}
