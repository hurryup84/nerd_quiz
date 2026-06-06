import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  adminOnly?: boolean;
  importerOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false, importerOnly = false }: Props) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/" replace />;
  if (importerOnly && user.role !== 'ADMIN' && user.role !== 'IMPORTER') return <Navigate to="/" replace />;
  return <>{children}</>;
}
