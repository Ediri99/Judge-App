import { Link } from 'react-router-dom';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export function ExportOverviewPage() {
  return (
    <div>
      <div className="admin-head">
        <div>
          <h1>Export</h1>
          <p>Excel and PDF exports reflect whatever filter and sort are currently on-screen — clear filters first to export everything.</p>
        </div>
      </div>

      <Card className="shell-card" style={{ marginBottom: 16 }}>
        <div className="card-head"><h3>Stall results</h3></div>
        <p>Open the Stalls results screen, set the filters/sort you want, then export.</p>
        <Link to="/admin/stalls/results"><Button variant="primary">Go to stall results</Button></Link>
      </Card>

      <Card className="shell-card">
        <div className="card-head"><h3>University results</h3></div>
        <p>Open the Universities results screen, pick an award category (or "All"), then export.</p>
        <Link to="/admin/universities/results"><Button variant="primary">Go to university results</Button></Link>
      </Card>
    </div>
  );
}
