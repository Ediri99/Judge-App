import { useState } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { PhoneFrame } from '../components/PhoneFrame';
import { Card } from '../components/Card';
import { MetricCard } from '../components/MetricCard';
import { Table } from '../components/Table';
import { Pill } from '../components/Pill';
import { Medal } from '../components/Medal';
import { StatusBadge } from '../components/StatusBadge';
import { Input } from '../components/Input';
import { useAuth } from './AuthProvider';
import { ProtectedRoute } from './ProtectedRoute';
import { AuthProvider } from './AuthProvider';
import '../styles/shell.css';

function JudgeShell() {
  return (
    <div className="judge-shell">
      <PhoneFrame>
        <header className="shell-topbar">
          <div className="shell-title-group">
            <div className="rosette">✦</div>
            <div>
              <h1>Stall judging</h1>
              <p>Annual food & craft expo · 2026</p>
            </div>
          </div>
        </header>
        <main className="shell-content">
          <Card className="shell-card">
            <h2>Judge experience</h2>
            <p>Offline-first scoring flow and shared track shell.</p>
            <div className="shell-actions">
              <Link to="/signin">
                <Button variant="primary">Open judge sign in</Button>
              </Link>
              <Link to="/list">
                <Button>Open judge list</Button>
              </Link>
            </div>
          </Card>
          <div className="shell-grid">
            <MetricCard label="Scored" value="0/0" accent />
            <MetricCard label="Status" value={<Pill tone="success">Ready</Pill>} />
          </div>
          <Card className="shell-card">
            <div className="card-head">
              <h3>Prototype-inspired UI</h3>
              <StatusBadge label="Stub" />
            </div>
            <Table headers={['Item', 'Hall', 'Status']} rows={[[<strong>Sample stall</strong>, 'Hall A', <Pill tone="warning">Pending</Pill>]]} />
          </Card>
        </main>
      </PhoneFrame>
    </div>
  );
}

function AdminShell() {
  return (
    <div className="admin-shell">
      <aside className="admin-rail">
        <div className="brand">
          <div className="mark">✦</div>
          <div>
            <div className="brand-title">Stall judging</div>
            <div className="brand-sub">Organizer workspace</div>
          </div>
        </div>
        <nav className="nav-list">
          <button className="nav-item on">Results</button>
          <button className="nav-item">Stalls</button>
          <button className="nav-item">Criteria</button>
          <button className="nav-item">Judges</button>
          <button className="nav-item">Halls</button>
        </nav>
      </aside>
      <main className="admin-main">
        <div className="admin-head">
          <div>
            <h1>Results</h1>
            <p>Live leaderboard and setup shell.</p>
          </div>
          <div className="admin-head-actions">
            <Button>Export Excel</Button>
            <Button variant="primary">Export PDF</Button>
          </div>
        </div>
        <div className="metrics-row">
          <MetricCard label="Stalls" value="0" />
          <MetricCard label="Judges" value="0" />
          <MetricCard label="Scored" value="0%" accent />
          <MetricCard label="Avg score" value="—" />
        </div>
        <Card className="shell-card">
          <div className="card-head">
            <h3>Leaderboard</h3>
            <Medal tone="gold">1</Medal>
          </div>
          <Table headers={['Stall', 'Hall', 'Avg', 'Judges in']} rows={[[<strong>Example stall</strong>, 'Hall A', '—', '0']]}/>
        </Card>
      </main>
    </div>
  );
}

function SignInPage() {
  const { signIn, signUp, user } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('judge@example.com');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState<'judge' | 'admin'>('judge');
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to={role === 'admin' ? '/admin' : '/list'} replace />;
  }

  async function handleSubmit() {
    setError(null);
    try {
      if (mode === 'signin') {
        await signIn(email, password, role);
      } else {
        await signUp(email, password, role);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to authenticate');
    }
  }

  return (
    <div className="page-shell">
      <PhoneFrame>
        <div className="signin-screen">
          <div className="rosette">✦</div>
          <h1>{mode === 'signin' ? 'Sign in' : 'Create account'}</h1>
          <p>Phase 1 auth shell for judges and admins.</p>
          <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Input label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <label className="field">
            <span className="field-label">Role</span>
            <select value={role} onChange={(event) => setRole(event.target.value as 'judge' | 'admin')}>
              <option value="judge">Judge</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          {error ? <p className="field-label">{error}</p> : null}
          <Button variant="primary" onClick={handleSubmit}>{mode === 'signin' ? 'Sign in' : 'Create account'}</Button>
          <Button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>{mode === 'signin' ? 'Need an account?' : 'Already have one?'}</Button>
        </div>
      </PhoneFrame>
    </div>
  );
}

function ListPage() {
  return (
    <div className="page-shell">
      <PhoneFrame>
        <div className="signin-screen">
          <h1>List</h1>
          <p>Judge list placeholder for Phase 0.</p>
          <Link to="/score/demo">
            <Button variant="primary">Open score view</Button>
          </Link>
        </div>
      </PhoneFrame>
    </div>
  );
}

function ScorePage() {
  return (
    <div className="page-shell">
      <PhoneFrame>
        <div className="signin-screen">
          <h1>Score</h1>
          <p>Score view placeholder for Phase 0.</p>
          <Link to="/list">
            <Button>Back to list</Button>
          </Link>
        </div>
      </PhoneFrame>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/judge" replace />} />
      <Route path="/judge" element={<JudgeShell />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route element={<ProtectedRoute roles={['judge']} />}>
        <Route path="/list" element={<ListPage />} />
        <Route path="/score/:id" element={<ScorePage />} />
      </Route>
      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route path="/admin" element={<AdminShell />} />
      </Route>
      <Route path="*" element={<Navigate to="/judge" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
