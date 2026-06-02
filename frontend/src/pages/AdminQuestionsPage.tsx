import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useRef, useState } from 'react';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';

async function readJsonSafe<T>(res: Response): Promise<T | undefined> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

interface Question {
  id: number;
  questionId: string;
  questionText: string;
  category?: { id: number; name: string } | null;
  difficulty?: { id: number; name: string } | null;
  info?: string | null;
  correctAnswer: string;
  createdAt: string;
}

interface QuestionsMeta {
  categories: { id: number; name: string }[];
  difficulties: { id: number; name: string }[];
}

export function AdminQuestionsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [newCategory, setNewCategory] = useState('');
  const [newDifficulty, setNewDifficulty] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: settings, isLoading: settingsLoading } = useQuery<{ theme: string; refreshInterval: number }>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
    staleTime: 1000 * 60,
  });

  const { data: questions = [], isLoading: questionsLoading } = useQuery<Question[]>({
    queryKey: ['questions'],
    queryFn: () => api.get<Question[]>('/questions'),
    staleTime: 1000 * 60 * 5,
  });

  const { data: meta } = useQuery<QuestionsMeta>({
    queryKey: ['questions', 'meta'],
    queryFn: () => api.get<QuestionsMeta>('/questions/meta'),
    staleTime: 1000 * 60 * 5,
  });

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

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.del(`/questions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions'] }),
  });

  const categoryMutation = useMutation({
    mutationFn: (name: string) => api.post('/questions/categories', { name }),
    onSuccess: () => {
      setNewCategory('');
      queryClient.invalidateQueries({ queryKey: ['questions', 'meta'] });
    },
    onError: (error) => {
      alert(`Failed to create category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const difficultyMutation = useMutation({
    mutationFn: (name: string) => api.post('/questions/difficulties', { name }),
    onSuccess: () => {
      setNewDifficulty('');
      queryClient.invalidateQueries({ queryKey: ['questions', 'meta'] });
    },
    onError: (error) => {
      alert(`Failed to create difficulty: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const isLoading = questionsLoading || settingsLoading;

  async function handleExport() {
    const res = await fetch(`${API_BASE}/questions/export/csv`, { credentials: 'include' });
    if (!res.ok) {
      alert(`Export failed: ${res.status} ${res.statusText}`);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE}/questions/import/csv`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    if (!res.ok) {
      const err = await readJsonSafe<{ message?: string | string[] }>(res);
      const msg = Array.isArray(err?.message)
        ? err?.message[0]
        : err?.message;
      alert(`Import failed: ${msg ?? `${res.status} ${res.statusText}`}`);
      return;
    }
    const data = await readJsonSafe<{ imported?: number }>(res);
    alert(`Imported ${data?.imported ?? 0} question(s).`);
    queryClient.invalidateQueries({ queryKey: ['questions'] });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  if (isLoading) return <div className="loading">Loading…</div>;

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

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-header">
          <h2>Question Metadata</h2>
        </div>
        <div style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <strong>Categories:</strong>
            {(meta?.categories ?? []).map((c) => (
              <span key={c.id} className="badge">{c.name}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New category"
            />
            <button
              className="btn btn-sm"
              disabled={categoryMutation.isPending || !newCategory.trim()}
              onClick={() => categoryMutation.mutate(newCategory.trim())}
            >
              Add Category
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <strong>Difficulties:</strong>
            {(meta?.difficulties ?? []).map((d) => (
              <span key={d.id} className="badge">{d.name}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={newDifficulty}
              onChange={(e) => setNewDifficulty(e.target.value)}
              placeholder="New difficulty"
            />
            <button
              className="btn btn-sm"
              disabled={difficultyMutation.isPending || !newDifficulty.trim()}
              onClick={() => difficultyMutation.mutate(newDifficulty.trim())}
            >
              Add Difficulty
            </button>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            CSV import may create missing categories automatically. Difficulties must exist before import.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Question Management</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn" onClick={handleExport}>Export CSV</button>
            <button className="btn" onClick={() => fileInputRef.current?.click()}>Import CSV</button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
            <button
              className="btn btn-primary"
              onClick={() => navigate('/admin/questions/add')}
            >
              + Add Question
            </button>
          </div>
        </div>

        {questions.length === 0 ? (
          <p>No questions yet. Add your first question!</p>
        ) : (
          <table className="results-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Question</th>
                <th>Category</th>
                <th>Difficulty</th>
                <th>Info</th>
                <th>Answer</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => (
                <tr key={q.id}>
                  <td>
                    <code>{q.questionId}</code>
                  </td>
                  <td>{q.questionText}</td>
                  <td>{q.category?.name ?? '—'}</td>
                  <td>{q.difficulty?.name ?? '—'}</td>
                  <td>{q.info?.substring(0, 80) ?? '—'}</td>
                  <td>{q.correctAnswer}</td>
                  <td>
                    <Link
                      to={`/admin/questions/${q.id}/edit`}
                      className="btn btn-sm"
                    >
                      Edit
                    </Link>{' '}
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => {
                        if (confirm(`Delete question ${q.questionId}?`)) {
                          deleteMutation.mutate(q.id);
                        }
                      }}
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
