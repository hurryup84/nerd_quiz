import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

interface QuestionForm {
  questionText: string;
  categoryId: string;
  difficultyId: string;
  info: string;
  answerA: string;
  answerB: string;
  answerC: string;
  answerD: string;
  correctAnswer: string;
}

interface QuestionsMeta {
  categories: { id: number; name: string }[];
  difficulties: { id: number; name: string }[];
}

const empty: QuestionForm = {
  questionText: '',
  categoryId: '',
  difficultyId: '',
  info: '',
  answerA: '',
  answerB: '',
  answerC: '',
  answerD: '',
  correctAnswer: 'A',
};

export function SubmitQuestionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<QuestionForm>(empty);
  const [error, setError] = useState('');

  const { data: meta } = useQuery<QuestionsMeta>({
    queryKey: ['questions', 'meta'],
    queryFn: () => api.get<QuestionsMeta>('/questions/meta'),
  });

  const mutation = useMutation({
    mutationFn: (data: QuestionForm) =>
      api.post('/questions', {
        ...data,
        categoryId: data.categoryId === '' ? undefined : Number(data.categoryId),
        difficultyId:
          data.difficultyId === '' ? undefined : Number(data.difficultyId),
        info: data.info.trim() || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['questions'] });
      navigate('/');
    },
    onError: (err: Error) => setError(err.message),
  });

  const set = (field: keyof QuestionForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    mutation.mutate(form);
  };

  return (
    <div className="page">
      <div className="card">
        <h2>Submit a Question</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Question</label>
            <textarea
              rows={3}
              value={form.questionText}
              onChange={set('questionText')}
              required
              placeholder="Enter your question…"
            />
          </div>
          <div className="form-group">
            <label>Category (optional)</label>
            <select value={form.categoryId} onChange={set('categoryId')}>
              <option value="">(none)</option>
              {(meta?.categories ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Difficulty (optional)</label>
            <select value={form.difficultyId} onChange={set('difficultyId')}>
              <option value="">(none)</option>
              {(meta?.difficulties ?? []).map((difficulty) => (
                <option key={difficulty.id} value={difficulty.id}>
                  {difficulty.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Info (optional, shown in round results)</label>
            <textarea
              rows={3}
              value={form.info}
              onChange={set('info')}
              placeholder="Extra explanation shown only in final round results"
            />
          </div>
          {(['A', 'B', 'C', 'D'] as const).map((letter) => {
            const field = `answer${letter}` as keyof QuestionForm;
            return (
              <div className="form-group" key={letter}>
                <label>Answer {letter}</label>
                <input
                  value={form[field]}
                  onChange={set(field)}
                  required={letter === 'A' || letter === 'B'}
                  placeholder={`Answer ${letter}`}
                />
              </div>
            );
          })}
          <div className="form-group">
            <label>Correct Answer</label>
            <select value={form.correctAnswer} onChange={set('correctAnswer')}>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </div>
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Submitting…' : 'Submit Question'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => navigate('/')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
