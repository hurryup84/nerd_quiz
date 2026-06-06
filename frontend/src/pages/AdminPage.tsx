import { Outlet, NavLink } from 'react-router-dom';

export function AdminPage() {
  const navLinkStyle = ({ isActive }: { isActive: boolean }) => ({
    padding: '0.5rem 1rem',
    textDecoration: 'none',
    border: '1px solid var(--border)',
    background: isActive ? 'var(--primary)' : 'transparent',
    color: isActive ? 'black' : 'inherit',
    textTransform: 'uppercase' as const,
    fontSize: '0.875rem',
  });

  return (
    <div className="page">
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <NavLink to="/admin/teams" style={navLinkStyle}>
            Teams
          </NavLink>
          <NavLink to="/admin/users" style={navLinkStyle}>
            Users
          </NavLink>
          <NavLink to="/admin/app" style={navLinkStyle}>
            App
          </NavLink>
        </div>
      </div>

      <Outlet />
    </div>
  );
}