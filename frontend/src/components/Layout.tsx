import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { type ReactNode } from 'react';

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app">
      <nav className="navbar">
        <Link to="/" className="nav-brand">🧠 Nerd Quiz</Link>
        <div className="nav-links">
          <Link to="/">Dashboard</Link>
          <Link to="/teams">Teams</Link>
          <Link to="/history">History</Link>
          <Link to="/insights">Insights</Link>
          <Link to="/questions/new">+ Question</Link>
          {user?.role === 'ADMIN' && (
            <>
              <Link to="/admin/questions">Manage</Link>
              <Link to="/admin/teams">Teams Admin</Link>
            </>
          )}
          <Link to="/settings/password" className="nav-user">{user?.username}</Link>
          <button onClick={handleLogout} className="btn btn-sm">Logout</button>
        </div>
      </nav>
      <main className="main-content">{children}</main>
    </div>
  );
}
