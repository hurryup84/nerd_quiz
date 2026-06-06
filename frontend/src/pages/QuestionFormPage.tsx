import { useState, type FormEvent, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

interface Question extends Omit<QuestionForm, 'categoryId' | 'difficultyId'> {
  id: number;
  questionId: string;
  category?: { id: number; name: string } | null;
  difficulty?: { id: number; name: string } | null;
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

export function QuestionFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<QuestionForm>(empty);
  const [error, setError] = useState('');

  const { data: existing } = useQuery<Question>({
    queryKey: ['question', id],
    queryFn: () => api.get<Question>(`/questions/${id}`),
    enabled: isEdit,
  });

  const { data: meta } = useQuery<QuestionsMeta>({
    queryKey: ['questions', 'meta'],
    queryFn: () => api.get<QuestionsMeta>('/questions/meta'),
  });

  useEffect(() => {
    if (existing) {
      setForm({
        questionText: existing.questionText,
        categoryId: existing.category ? String(existing.category.id) : '',
        difficultyId: existing.difficulty ? String(existing.difficulty.id) : '',
        info: existing.info ?? '',
        answerA: existing.answerA,
        answerB: existing.answerB,
        answerC: existing.answerC,
        answerD: existing.answerD,
        correctAnswer: existing.correctAnswer,
      });
    }
  }, [existing]);

  const mutation = useMutation({
    mutationFn: (data: QuestionForm) => {
      const payload = {
        ...data,
        categoryId: data.categoryId === '' ? undefined : Number(data.categoryId),
        difficultyId:
          data.difficultyId === '' ? undefined : Number(data.difficultyId),
        info: data.info.trim() || undefined,
      };

      return isEdit
        ? api.put<Question>(`/questions/${id}`, payload)
        : api.post<Question>('/questions', payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['questions'] });
      navigate('/questions/manage');
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
        <h2>{isEdit ? 'Edit Question' : 'Add Question'}</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Question</label>
            <textarea
              value={form.questionText}
              onChange={set('questionText')}
              required
              rows={3}
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
              value={form.info}
              onChange={set('info')}
              rows={3}
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
                  required
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
              {mutation.isPending ? 'Saving…' : isEdit ? 'Update' : 'Add Question'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => navigate('/questions/manage')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
