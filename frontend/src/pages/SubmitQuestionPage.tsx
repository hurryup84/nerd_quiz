import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

interface QuestionForm {
  questionText: string;
  answerA: string;
  answerB: string;
  answerC: string;
  answerD: string;
  correctAnswer: string;
}

const empty: QuestionForm = {
  questionText: '',
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

  const mutation = useMutation({
    mutationFn: (data: QuestionForm) => api.post('/questions', data),
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
