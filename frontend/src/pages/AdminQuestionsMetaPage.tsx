import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useState } from 'react';


interface QuestionsMeta {
  categories: { id: number; name: string }[];
  difficulties: { id: number; name: string }[];
}

export function AdminQuestionsMetaPage() {
  const queryClient = useQueryClient();
  const [newCategory, setNewCategory] = useState('');
  const [newDifficulty, setNewDifficulty] = useState('');


  const { data: meta } = useQuery<QuestionsMeta>({
    queryKey: ['questions', 'meta'],
    queryFn: () => api.get<QuestionsMeta>('/questions/meta'),
    staleTime: 1000 * 60 * 5,
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


  return (
    <div className="page">


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

      
    </div>
  );
}
