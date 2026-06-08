import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function QuestionsPage() {
  const { user } = useAuth();
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
      {(user?.role === 'ADMIN' || user?.role === 'IMPORTER') && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <NavLink to="/questions/create" style={navLinkStyle}>
              Create
            </NavLink>
            <NavLink to="/questions/import" style={navLinkStyle}>
              Import
            </NavLink>
            <NavLink to="/questions/list" style={navLinkStyle}>
              List
            </NavLink>
            {user?.role === 'ADMIN' && (
              <NavLink to="/questions/manage" style={navLinkStyle}>
                Manage
              </NavLink>
            )}
            {user?.role === 'ADMIN' && (
              <NavLink to="/questions/meta" style={navLinkStyle}>
                Metadata
              </NavLink>
            )}
          </div>
        </div>
      )}

      <Outlet />
    </div>
  );
}