import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

interface User {
  id: number;
  username: string;
  role: string;
  createdAt: string;
}

const ROLES = ['USER', 'IMPORTER', 'ADMIN'] as const;

export function AdminUsersPage() {
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users', 'all'],
    queryFn: () => api.users.listAll() as Promise<User[]>,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.del(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'all'] }),
    onError: (err: Error) => alert(err.message),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      api.patch(`/users/${id}/role`, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'all'] }),
    onError: (err: Error) => alert(err.message),
  });

  if (isLoading) return <div className="loading">Loading users…</div>;

  return (
    <div className="page">
      <div className="card">
        <h2>User Management</h2>
        {users.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <table className="results-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Role</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.username}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) =>
                        roleMutation.mutate({ id: u.id, role: e.target.value })
                      }
                      disabled={roleMutation.isPending}
                      style={{
                        background: 'var(--surface)',
                        color: 'inherit',
                        border: '1px solid var(--border)',
                        padding: '0.2rem 0.4rem',
                      }}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        if (window.confirm(`Delete user "${u.username}"?`)) {
                          deleteMutation.mutate(u.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}