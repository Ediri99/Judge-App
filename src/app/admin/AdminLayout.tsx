import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthProvider';

const navGroups = [
  {
    label: 'Stalls',
    items: [
      { to: '/admin/stalls/results', label: 'Results' },
      { to: '/admin/stalls/stalls', label: 'Stalls' },
      { to: '/admin/stalls/criteria', label: 'Criteria' },
      { to: '/admin/stalls/judges', label: 'Judges' },
      { to: '/admin/stalls/halls', label: 'Halls & categories' },
    ],
  },
  {
    label: 'Universities',
    items: [
      { to: '/admin/universities/results', label: 'Results' },
      { to: '/admin/universities/winners', label: 'Winners' },
      { to: '/admin/universities/entries', label: 'Entries' },
      { to: '/admin/universities/universities', label: 'Universities' },
      { to: '/admin/universities/award-categories', label: 'Award categories' },
      { to: '/admin/universities/criteria', label: 'Criteria' },
    ],
  },
  {
    label: 'Event',
    items: [
      { to: '/admin/event/settings', label: 'Event settings' },
      { to: '/admin/event/export', label: 'Export' },
    ],
  },
];

export function AdminLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const initials = (user?.email ?? 'A').slice(0, 2).toUpperCase();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  return (
    <div className="admin-shell">
      <button
        type="button"
        className="admin-drawer-toggle"
        aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={drawerOpen}
        aria-controls="admin-nav-rail"
        onClick={() => setDrawerOpen((open) => !open)}
      >
        <span aria-hidden="true">☰</span> Menu
      </button>

      {drawerOpen ? <div className="admin-drawer-overlay" onClick={() => setDrawerOpen(false)} /> : null}

      <aside id="admin-nav-rail" className={`admin-rail${drawerOpen ? ' open' : ''}`}>
        <div className="brand">
          <div className="mark">✦</div>
          <div>
            <div className="brand-title">Event judging</div>
            <div className="brand-sub">Organizer workspace</div>
          </div>
        </div>
        {navGroups.map((group) => (
          <div key={group.label} style={{ marginBottom: 18 }}>
            <div className="field-label" style={{ padding: '0 12px', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{group.label}</div>
            <nav className="nav-list">
              {group.items.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item${isActive ? ' on' : ''}`}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
        <div className="field-label" style={{ padding: '12px', borderTop: '1px solid var(--line)', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div className="mark" style={{ width: 28, height: 28, fontSize: 12 }}>{initials}</div>
            <div>{user?.email}</div>
          </div>
          <button className="nav-item" onClick={() => void signOut()}>Sign out</button>
        </div>
      </aside>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
