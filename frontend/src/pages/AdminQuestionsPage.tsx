import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useEffect, useRef, useState } from 'react';

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


export function AdminQuestionsPage() {
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isSearchingRef = useRef(false);


  const [searchQuery, setSearchQuery] = useState('');

  const { data: questions = [], isLoading: questionsLoading } = useQuery<Question[]>({
    queryKey: ['questions', searchQuery],
    queryFn: () => api.get<Question[]>(`/questions${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`),
    staleTime: 1000 * 60 * 5,
  });

  // Retain focus on the search input during re-renders (e.g., when search query changes)
  useEffect(() => {
    if (isSearchingRef.current && searchInputRef.current) {
      searchInputRef.current.focus();
      isSearchingRef.current = false;
    }
  });


  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.del(`/questions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions'] }),
  });


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

  // Only show loading on initial load, not during search re-fetches
  // This prevents the search input from losing focus on every keystroke
  const isInitialLoading = questionsLoading && questions.length === 0;
  if (isInitialLoading) return <div className="loading">Loading…</div>;

  return (
    <div className="page">


      <div className="card">
        <div className="card-header">
          <h2>Question Management</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                isSearchingRef.current = true;
                setSearchQuery(e.target.value);
              }}
              placeholder="Search questions..."
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
            />
            <button className="btn" onClick={handleExport}>Export CSV</button>
            <button className="btn" onClick={() => fileInputRef.current?.click()}>Import CSV</button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
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
                  <td>{q.correctAnswer}</td>
                  <td>
                    <Link
                      to={`/questions/edit/${q.id}`}
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
