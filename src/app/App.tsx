import { useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { PhoneFrame } from '../components/PhoneFrame';
import { Card } from '../components/Card';
import { MetricCard } from '../components/MetricCard';
import { Table } from '../components/Table';
import { Pill } from '../components/Pill';
import { StatusBadge } from '../components/StatusBadge';
import { Input } from '../components/Input';
import { useAuth } from './AuthProvider';
import { ProtectedRoute } from './ProtectedRoute';
import { AuthProvider } from './AuthProvider';
import { initOfflineEngine } from '../lib/offline';
import { StallsListPage } from './stalls/StallsListPage';
import { StallScorePage } from './stalls/StallScorePage';
import { UniversitiesListPage } from './universities/UniversitiesListPage';
import { UniversityScorePage } from './universities/UniversityScorePage';
import { AdminLayout } from './admin/AdminLayout';
import { ComingSoonPage } from './admin/ComingSoonPage';
import { HallsCategoriesPage } from './admin/HallsCategoriesPage';
import { CriteriaPage } from './admin/CriteriaPage';
import { StallsPage } from './admin/StallsPage';
import { JudgesPage } from './admin/JudgesPage';
import { UniversitiesPage } from './admin/UniversitiesPage';
import { AwardCategoriesPage } from './admin/AwardCategoriesPage';
import { EntriesPage } from './admin/EntriesPage';
import { EventSettingsPage } from './admin/EventSettingsPage';
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
              <Link to="/list/stalls">
                <Button>Open stalls list</Button>
              </Link>
              <Link to="/list/universities">
                <Button>Open universities list</Button>
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

function SignInPage() {
  const { signIn, signUp, user } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('judge@example.com');
  const [password, setPassword] = useState('password123');
  const [role, setRole] = useState<'judge' | 'admin'>('judge');
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to={role === 'admin' ? '/admin' : '/list/stalls'} replace />;
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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/judge" replace />} />
      <Route path="/judge" element={<JudgeShell />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route element={<ProtectedRoute roles={['judge']} />}>
        <Route path="/list" element={<Navigate to="/list/stalls" replace />} />
        <Route path="/list/stalls" element={<StallsListPage />} />
        <Route path="/list/universities" element={<UniversitiesListPage />} />
        <Route path="/score/stalls/:id" element={<StallScorePage />} />
        <Route path="/score/universities/:id" element={<UniversityScorePage />} />
      </Route>
      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/stalls/results" replace />} />
          <Route path="stalls/results" element={<ComingSoonPage title="Stall results" note="Live leaderboard arrives in Phase 7." />} />
          <Route path="stalls/stalls" element={<StallsPage />} />
          <Route path="stalls/criteria" element={<CriteriaPage track="stalls" />} />
          <Route path="stalls/judges" element={<JudgesPage />} />
          <Route path="stalls/halls" element={<HallsCategoriesPage />} />
          <Route path="universities/results" element={<ComingSoonPage title="University results" note="Per-category leaderboards arrive in Phase 7." />} />
          <Route path="universities/winners" element={<ComingSoonPage title="Winners" note="The 6 award winners arrive in Phase 7." />} />
          <Route path="universities/entries" element={<EntriesPage />} />
          <Route path="universities/universities" element={<UniversitiesPage />} />
          <Route path="universities/award-categories" element={<AwardCategoriesPage />} />
          <Route path="universities/criteria" element={<CriteriaPage track="universities" />} />
          <Route path="event/settings" element={<EventSettingsPage />} />
          <Route path="event/export" element={<ComingSoonPage title="Export" note="Excel and PDF exports arrive in Phase 7." />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/judge" replace />} />
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let canceled = false;

    void initOfflineEngine().then((fn) => {
      if (canceled) {
        if (fn) fn();
        return;
      }
      cleanup = fn;
    });

    return () => {
      canceled = true;
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
