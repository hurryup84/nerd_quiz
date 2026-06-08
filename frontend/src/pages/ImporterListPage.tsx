import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useEffect, useRef, useState } from 'react';


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


export function ImporterListPage() {

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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
