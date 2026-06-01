import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface Answer {
  id: number;
  selectedAnswer: string;
  user: { id: number; username: string };
  roundQuestionId: number;
}

interface Question {
  id: number;
  questionId: string;
  questionText: string;
}

interface RoundQuestion {
  id: number;
  question: Question;
}

interface Finalization {
  user: { id: number; username: string };
}

interface QuizRound {
  id: number;
  status: string;
  requiredParticipants: number;
  questions: RoundQuestion[];
  answers: Answer[];
  finalizations: Finalization[];
  createdBy: { id: number; username: string };
  finishedAt?: string;
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: settings } = useQuery<{ theme: string; refreshInterval: number }>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
    staleTime: 1000 * 60,
  });

  const pollMs = (settings?.refreshInterval ?? 5) * 1000;

  const { data: activeRound, isLoading: activeLoading } = useQuery<QuizRound | null>({
    queryKey: ['quiz', 'active'],
    queryFn: () => api.get<QuizRound | null>('/quiz/active'),
    refetchInterval: (data: any) => (data ? pollMs : 5000),
    staleTime: 2000,
  });

  const { data: lastRound } = useQuery<QuizRound | null>({
    queryKey: ['quiz', 'last'],
    queryFn: () => api.get<QuizRound | null>('/quiz/last'),
    enabled: !activeRound,
    staleTime: 1000 * 60,
  });

  if (activeLoading) return <div className="loading">Loading…</div>;

  const isFinalized = activeRound?.finalizations?.some((f) => f.user.id === user?.id);

  return (
    <div className="page">
      {activeRound ? (
        <div className="card">
          <div className="card-header">
            <h2>Active Quiz Round #{activeRound.id}</h2>
            <span className="badge badge-active">ACTIVE</span>
          </div>
          <p className="question-text">
            This round contains <strong>{activeRound.questions.length}</strong> question(s).
          </p>

          <div className="progress-bar-label">
            Finalized: {activeRound.finalizations?.length ?? 0} / {activeRound.requiredParticipants}
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${((activeRound.finalizations?.length ?? 0) / activeRound.requiredParticipants) * 100}%`,
              }}
            />
          </div>

          {!isFinalized ? (
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/quiz/${activeRound.id}`)}
              style={{ padding: '1rem 2rem', fontSize: '1.2rem' }}
            >
              {activeRound.answers.some(a => a.user.id === user?.id) ? 'Continue Quiz' : 'Join & Start Quiz'}
            </button>
          ) : (
            <div className="my-answer">
              <p>
                ✅ <strong>You have finished your part.</strong>
              </p>
              <p className="muted">Waiting for other participants to finalize their rounds…</p>
            </div>
          )}

          <div className="participants-list" style={{ marginTop: '1.5rem' }}>
            {activeRound.finalizations?.map((f) => (
              <span key={f.user.id} className="participant-badge" style={{ backgroundColor: 'var(--primary-color)', color: 'black' }}>
                {f.user.username} (Done)
              </span>
            ))}
          </div>

          <div style={{ marginTop: '2rem' }}>
            <button
              className="btn btn-sm"
              onClick={() => navigate(`/quiz/${activeRound.id}`)}
            >
              View Round Details
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h2>No Active Quiz</h2>
            <button className="btn btn-primary" onClick={() => navigate('/quiz/start')}>
              Start New Quiz
            </button>
          </div>

          {lastRound && (
            <div className="last-round">
              <h3>Last Completed Round #{lastRound.id}</h3>
              <p>Questions: {lastRound.questions.length}</p>
              <p>Participants: {lastRound.requiredParticipants}</p>
              <button className="btn btn-sm" onClick={() => navigate('/history')}>
                View Full History
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
