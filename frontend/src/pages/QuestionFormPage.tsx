import { useState, useEffect } from 'react';
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
  creator?: { id: number; username: string } | null;
  aiAssisted?: boolean;
}

interface QuestionsMeta {
  categories: { id: number; name: string }[];
  difficulties: { id: number; name: string }[];
}

interface AIGeneratedQuestion {
  questionText: string;
  category?: string;
  difficulty?: string;
  info?: string;
  answerA: string;
  answerB: string;
  answerC: string;
  answerD: string;
  correctAnswer: string;
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
  const [showAIConfirm, setShowAIConfirm] = useState(false);
  const [aiCompleted, setAiCompleted] = useState(false);

  const { data: existing } = useQuery<Question>({
    queryKey: ['question', id],
    queryFn: () => api.get<Question>(`/questions/${id}`),
    enabled: isEdit,
  });

  const { data: meta } = useQuery<QuestionsMeta>({
    queryKey: ['questions', 'meta'],
    queryFn: () => api.get<QuestionsMeta>('/questions/meta'),
  });

  const aiCompleteMutation = useMutation({
    mutationFn: (partial: Partial<QuestionForm>) =>
      api.post<AIGeneratedQuestion>('/questions/complete', partial),
    onSuccess: (completed) => {
      if (!completed.correctAnswer) {
        setError('AI did not return a correct answer. Please try again or fill in the correct answer manually.');
        setShowAIConfirm(false);
        return;
      }
      // Resolve category/difficulty names to IDs
      const categoryId = meta?.categories.find(
        (c) => c.name.toLowerCase() === (completed.category?.toLowerCase() ?? '')
      )?.id.toString() ?? '';
      const difficultyId = meta?.difficulties.find(
        (d) => d.name.toLowerCase() === (completed.difficulty?.toLowerCase() ?? '')
      )?.id.toString() ?? '';

      setForm({
        questionText: completed.questionText,
        categoryId,
        difficultyId,
        info: completed.info ?? '',
        answerA: completed.answerA,
        answerB: completed.answerB,
        answerC: completed.answerC,
        answerD: completed.answerD,
        correctAnswer: completed.correctAnswer,
      });
      setAiCompleted(true);
      setShowAIConfirm(false);
    },
    onError: (err: Error) => {
      setError(`AI completion failed: ${err.message}`);
      setShowAIConfirm(false);
    },
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
    mutationFn: ({ data, aiAssisted }: { data: QuestionForm; aiAssisted: boolean }) => {
      const payload = {
        ...data,
        categoryId: data.categoryId === '' ? undefined : Number(data.categoryId),
        difficultyId:
          data.difficultyId === '' ? undefined : Number(data.difficultyId),
        info: data.info.trim() || undefined,
        aiAssisted,
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

  const hasMissingCriticalData = (data: QuestionForm) => {
    return !data.questionText.trim() ||
           !data.categoryId ||
           !data.difficultyId ||
           !data.answerA ||
           !data.answerB ||
           !data.answerC ||
           !data.answerD ||
           !data.correctAnswer;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // Check if we have missing critical data (question text or answers) - offer AI completion
    if (!isEdit && hasMissingCriticalData(form)) {
      setShowAIConfirm(true);
      return;
    }

    mutation.mutate({ data: form, aiAssisted: aiCompleted });
  };

  const handleAIConfirm = () => {
    // Don't send correctAnswer to AI - it will determine the correct answer
    const partial: Partial<QuestionForm> = {
      questionText: form.questionText,
      categoryId: form.categoryId,
      difficultyId: form.difficultyId,
      info: form.info,
      answerA: form.answerA,
      answerB: form.answerB,
      answerC: form.answerC,
      answerD: form.answerD,
    };
    aiCompleteMutation.mutate(partial);
  };

  const handleAICancel = () => {
    // Validate that all mandatory fields are filled before saving
    if (hasMissingCriticalData(form)) {
      const missingFields = getAINeededFields(form);
      setError(`Please fill in: ${missingFields.join(', ')} before saving.`);
      setShowAIConfirm(false);
      return;
    }
    setAiCompleted(false);
    mutation.mutate({ data: form, aiAssisted: false });
  };

  const getAINeededFields = (data: QuestionForm) => {
    const fields: string[] = [];
    if (!data.questionText.trim()) fields.push('question');
    if (!data.categoryId) fields.push('category');
    if (!data.difficultyId) fields.push('difficulty');
    if (!data.answerA) fields.push('answer A');
    if (!data.answerB) fields.push('answer B');
    if (!data.answerC) fields.push('answer C');
    if (!data.answerD) fields.push('answer D');
    if (!data.correctAnswer) fields.push('correct answer');
    return fields;
  };

  const aiFields = getAINeededFields(form);

  return (
    <div className="page">
      <div className="card">
        <h2>{isEdit ? 'Edit Question' : 'Add Question'}</h2>
        
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label>Question *</label>
            <textarea
              value={form.questionText}
              onChange={set('questionText')}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Category *</label>
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
            <label>Difficulty *</label>
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
                <label>Answer {letter} *</label>
                <input
                  value={form[field]}
                  onChange={set(field)}
                />
              </div>
            );
          })}
          <div className="form-group">
            <label>Correct Answer *</label>
            <select value={form.correctAnswer} onChange={set('correctAnswer')}>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </div>
{error && <div className="alert alert-error">{error}</div>}
        {showAIConfirm && (
          <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
            <p>
              The following fields are empty: {aiFields.join(', ')}.
              Would you like to ask AI to complete this question?
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAIConfirm}
                disabled={aiCompleteMutation.isPending}
              >
                {aiCompleteMutation.isPending ? 'Loading…' : 'Yes, complete with AI'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleAICancel}
                disabled={aiCompleteMutation.isPending || mutation.isPending}
              >
                No, save as is
              </button>
            </div>
          </div>
        )}
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
