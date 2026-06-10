import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { type ReactNode, useState } from 'react';

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  const navLinks = (
    <>
      <Link to="/" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
      <Link to="/about" onClick={() => setMobileMenuOpen(false)}>About</Link>
      <Link to="/teams" onClick={() => setMobileMenuOpen(false)}>Teams</Link>
      <Link to="/questions" onClick={() => setMobileMenuOpen(false)}>Questions</Link>
      <Link to="/history" onClick={() => setMobileMenuOpen(false)}>History</Link>
      <Link to="/insights" onClick={() => setMobileMenuOpen(false)}>Insights</Link>
      {user?.role === 'ADMIN' && (
        <Link to="/admin/teams" onClick={() => setMobileMenuOpen(false)}>Admin</Link>
      )}
      <Link to="/settings/password" className="nav-user" onClick={() => setMobileMenuOpen(false)}>{user?.username}</Link>
      <button onClick={handleLogout} className="btn btn-sm">Logout</button>
    </>
  );

  return (
    <div className="app">
      <nav className="navbar">
        <Link to="/" className="nav-brand" onClick={() => setMobileMenuOpen(false)}>🧠 Nerdy Quiz</Link>
        <button
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          ☰
        </button>
        <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>{navLinks}</div>
      </nav>
      <main className="main-content">{children}</main>
    </div>
  );
}