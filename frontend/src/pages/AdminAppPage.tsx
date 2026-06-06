import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';



export function AdminAppPage() {

  const { data: settings, isLoading: settingsLoading } = useQuery<{ theme: string; refreshInterval: number }>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
    staleTime: 1000 * 60,
  });
  const queryClient = useQueryClient();

    const themeMutation = useMutation({
    mutationFn: (newTheme: string) => api.put('/settings/theme', { theme: newTheme }),
    onSuccess: (_, newTheme) => {
      document.documentElement.setAttribute('data-theme', newTheme);
      queryClient.setQueryData(['settings'], (old: { theme: string; refreshInterval: number } | undefined) =>
        old ? { ...old, theme: newTheme } : old
      );
    },
    onError: (error) => {
      alert(`Failed to change theme: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const refreshMutation = useMutation({
    mutationFn: (secs: number) => api.put('/settings/refreshInterval', { refreshInterval: secs }),
    onSuccess: (_, secs) => {
      queryClient.setQueryData(['settings'], (old: { theme: string; refreshInterval: number } | undefined) =>
        old ? { ...old, refreshInterval: secs } : old
      );
    },
    onError: (error) => {
      alert(`Failed to update refresh interval: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const isLoading = settingsLoading;

  if (isLoading) return <div className="loading">Loading settings...</div>;

  return (
    <div className="page">
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-header">
          <h2>Application Settings</h2>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
          <span>Theme:</span>
          <select
            className="btn"
            style={{ padding: '0.25rem 0.5rem', background: 'var(--surface)', color: 'inherit', border: '1px solid var(--border)' }}
            value={settings?.theme || 'terminal'}
            onChange={(e) => themeMutation.mutate(e.target.value)}
            disabled={themeMutation.isPending}
          >
            <option value="terminal">Nerd Terminal (Matrix)</option>
            <option value="classic">Quiz Classic (Phase 1)</option>
          </select>

          <span style={{ marginLeft: '1.5rem' }}>Poll interval:</span>
          <select
            className="btn"
            style={{ padding: '0.25rem 0.5rem', background: 'var(--surface)', color: 'inherit', border: '1px solid var(--border)' }}
            value={settings?.refreshInterval ?? 5}
            onChange={(e) => refreshMutation.mutate(Number(e.target.value))}
            disabled={refreshMutation.isPending}
          >
            <option value={2}>2 s</option>
            <option value={5}>5 s</option>
            <option value={10}>10 s</option>
            <option value={30}>30 s</option>
            <option value={60}>60 s</option>
          </select>
          {(themeMutation.isPending || refreshMutation.isPending) && (
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Saving…</span>
          )}
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Changes apply globally to all users.</span>
        </div>
      </div>
    </div>
  );
}