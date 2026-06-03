import { useEffect, useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

interface Question {
  id: number;
  questionId: string;
  questionText: string;
}

interface UserTeam {
  role: string;
  team: { id: string; name: string };
}

type ScopeValue = 'global' | string;

export function StartQuizPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [questionCount, setQuestionCount] = useState(4);
  const [participants, setParticipants] = useState(3);
  const [timeout, setTimeout] = useState<number | ''>('');
  const [error, setError] = useState('');
  const [scope, setScope] = useState<ScopeValue>('global');

  const { data: questions = [], isLoading } = useQuery<Question[]>({
    queryKey: ['questions'],
    queryFn: () => api.get<Question[]>('/questions'),
    staleTime: 1000 * 60 * 10,
  });

  const { data: myTeams = [] } = useQuery<UserTeam[]>({
    queryKey: ['teams', 'me'],
    queryFn: () => api.teams.getMyTeams() as Promise<UserTeam[]>,
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (myTeams.length === 1) {
      setScope(myTeams[0].team.id);
    } else if (myTeams.length === 0) {
      setScope('global');
    }
  }, [myTeams]);

  const maxQuestionCount = questions.length;

  useEffect(() => {
    if (maxQuestionCount > 0 && questionCount > maxQuestionCount) {
      setQuestionCount(maxQuestionCount);
    }
  }, [maxQuestionCount, questionCount]);

  const createMutation = useMutation({
    mutationFn: (data: {
      questionCount: number;
      requiredParticipants: number;
      timeoutMinutes?: number;
      teamId?: string;
    }) => api.post<{ id: number }>('/quiz', data),
    onSuccess: (round) => {
      void queryClient.invalidateQueries({ queryKey: ['quiz'] });
      navigate(`/quiz/${round.id}`);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!Number.isInteger(questionCount) || questionCount < 1) {
      setError('Question count must be a positive integer');
      return;
    }

    if (questionCount > questions.length) {
      setError(`Only ${questions.length} questions are available right now`);
      return;
    }

    if (!Number.isInteger(participants) || participants < 1) {
      setError('Required participants must be a positive integer');
      return;
    }

    const payload: {
      questionCount: number;
      requiredParticipants: number;
      timeoutMinutes?: number;
      teamId?: string;
    } = {
      questionCount,
      requiredParticipants: participants,
      timeoutMinutes: timeout ? Number(timeout) : undefined,
    };

    if (scope !== 'global') {
      payload.teamId = scope;
    }

    createMutation.mutate(payload);
  };

  if (isLoading) return <div className="loading">Loading questions…</div>;

  return (
    <div className="page">
      <div className="card">
        <h2>Start New Quiz</h2>
        {error && <div className="alert alert-error">{error}</div>}
        {questions.length === 0 ? (
          <p>
            No questions available.{' '}
            <a href="/admin/questions">Add some questions first.</a>
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Quiz scope</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                required
              >
                <option value="global">Global (everyone can join)</option>
                {myTeams.map(({ team }) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              {myTeams.length === 0 && (
                <small className="muted">
                  No teams yet — this round is open to all users.{' '}
                  <a href="/teams">Create a team</a>
                </small>
              )}
            </div>
            <div className="form-group">
              <label>Number of Questions</label>
              <input
                type="number"
                min="1"
                step="1"
                max={maxQuestionCount || 1}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                required
              />
              <small className="muted">Total available: {questions.length}</small>
            </div>
            <div className="form-group">
              <label>Required Participants</label>
              <input
                type="number"
                min="1"
                step="1"
                value={participants}
                onChange={(e) => setParticipants(Number(e.target.value))}
                required
              />
            </div>
            <div className="form-group">
              <label>Timeout (minutes, optional)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={timeout}
                onChange={(e) =>
                  setTimeout(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="Leave empty for no timeout"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Starting...' : 'Go!'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
