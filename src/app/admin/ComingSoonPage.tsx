import { Card } from '../../components/Card';

export function ComingSoonPage({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <div className="admin-head">
        <div>
          <h1>{title}</h1>
          <p>{note}</p>
        </div>
      </div>
      <Card className="shell-card">
        <p>This screen is built in a later phase.</p>
      </Card>
    </div>
  );
}
