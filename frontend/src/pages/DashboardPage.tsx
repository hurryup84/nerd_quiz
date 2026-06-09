import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface LatestQuestion {
  id: number;
  questionId: string;
  questionText: string;
  createdAt: string;
  creator?: { username: string } | null;
}

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
  team?: { id: string; name: string } | null;
  teamMembers?: { id: number; username: string }[];
}

function teamLabel(round: QuizRound): string {
  return round.team?.name ?? 'Global';
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

  const { data: activeRounds = [], isLoading: activeLoading } = useQuery<QuizRound[]>({
    queryKey: ['quiz', 'active-rounds'],
    queryFn: () => api.get<QuizRound[]>('/quiz/active-rounds'),
    refetchInterval: (query) =>
      (query.state.data?.length ?? 0) > 0 ? pollMs : 5000,
    staleTime: 2000,
  });

  const { data: lastRound } = useQuery<QuizRound | null>({
    queryKey: ['quiz', 'last'],
    queryFn: () => api.get<QuizRound | null>('/quiz/last'),
    enabled: activeRounds.length === 0,
    staleTime: 1000 * 60,
  });

  const { data: questionCountData, isLoading: countLoading } = useQuery<{ total: number }>({
    queryKey: ['questions', 'count'],
    queryFn: () => api.get<{ total: number }>('/questions/count'),
    retry: 3,
    staleTime: 1000 * 60,
  });

  const { data: latestQuestion } = useQuery<LatestQuestion | null>({
    queryKey: ['questions', 'latest'],
    queryFn: () => api.get<LatestQuestion | null>('/questions/latest'),
    enabled: user?.role === 'ADMIN',
    staleTime: 1000 * 60,
  });

  const { data: stats } = useQuery<{ totalRounds: number; totalQuestionsPlayed: number }>({
    queryKey: ['quiz', 'stats'],
    queryFn: () => api.get('/quiz/stats'),
    staleTime: 1000 * 60,
  });

  if (activeLoading) return <div className="loading">Loading…</div>;

  return (
    <div className="page">
      {activeRounds.length > 0 ? (
        <>
          <div className="card-header" style={{ marginBottom: '1rem' }}>
            <h2>Active Quiz Rounds</h2>
            <button className="btn btn-primary" onClick={() => navigate('/quiz/start')}>
              Start New Quiz
            </button>
          </div>
          {activeRounds.map((activeRound) => {
            const isFinalized = activeRound.finalizations?.some(
              (f) => f.user.id === user?.id,
            );
            return (
              <div key={activeRound.id} className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-header">
                  <h3>
                    Round #{activeRound.id} — {teamLabel(activeRound)}
                  </h3>
                  <span className="badge badge-active">ACTIVE</span>
                </div>
                <p className="question-text">
                  <strong>{activeRound.questions.length}</strong> question(s)
                </p>

                <div className="progress-bar-label">
                  Finalized: {activeRound.finalizations?.length ?? 0} /{' '}
                  {activeRound.requiredParticipants}
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
                    style={{ padding: '1rem 2rem', fontSize: '1.1rem', marginTop: '1rem' }}
                  >
                    {activeRound.answers.some((a) => a.user.id === user?.id)
                      ? 'Continue Quiz'
                      : 'Join & Start Quiz'}
                  </button>
                ) : (
                  <div className="my-answer" style={{ marginTop: '1rem' }}>
                    <p>
                      ✅ <strong>You have finished your part.</strong>
                    </p>
                    <p className="muted">
                      Waiting for other participants to finalize…
                    </p>
                  </div>
                )}

                <div className="participants-list" style={{ marginTop: '1rem' }}>
                  {activeRound.finalizations?.map((f) => (
                    <span key={f.user.id} className="badge badge-participant">
                      {f.user.username} (Done)
                    </span>
                  ))}
                  {activeRound.team?.id && activeRound.teamMembers && (
                    activeRound.teamMembers
                      .filter((m) => !(activeRound.finalizations ?? []).some((f) => f.user.id === m.id))
                      .map((m) => (
                        <span key={m.id} className="badge badge-participant-pending" >
                          {m.username} (Pending)
                        </span>
                      ))
                  )}
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <button
                    className="btn btn-sm"
                    onClick={() => navigate(`/quiz/${activeRound.id}`)}
                  >
                    View Round Details
                  </button>
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <div className="card">
          <div className="card-header">
            <h2>No Active Quiz</h2>
            <button className="btn btn-primary" onClick={() => navigate('/quiz/start')}>
              Start New Quiz
            </button>
          </div>

          <div className="card" style={{ marginTop: '1rem', textAlign: 'center' }}>
            <h3>📚 Available Questions</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0' }}>
              {countLoading ? '…' : questionCountData?.total ?? '…'}
            </p>
          </div>

          {user?.role === 'ADMIN' && latestQuestion && (
            <div className="card" style={{ marginTop: '1rem', textAlign: 'center' }}>
              <h3>📝 Latest Question</h3>
              <p style={{ marginBottom: '0.25rem' }}>
                <code>{latestQuestion.questionId}</code> — {latestQuestion.questionText.substring(0, 60)}...
              </p>
              {latestQuestion.creator?.username && (
                <p className="muted" style={{ marginBottom: '0.25rem' }}>
                  Created by: {latestQuestion.creator.username} <>&nbsp;</><>&nbsp;</><>&nbsp;</>
                  Created: {new Date(latestQuestion.createdAt).toLocaleString()}
                </p>
              )}

            </div>
          )}

          {user?.role === 'ADMIN' && latestQuestion && (
          <div className="card" style={{ marginTop: '1rem', textAlign: 'center' }}>
            <h3>📊 Quiz Stats</h3>
            <p style={{ margin: '0.25rem 0' }}>
              <strong>{stats?.totalRounds ?? 0}</strong> completed round{stats?.totalRounds !== 1 ? 's' : ''}
            <>&nbsp;</><>&nbsp;</><>&nbsp;</>
              <strong>{stats?.totalQuestionsPlayed ?? 0}</strong> questions played
            </p>
          </div>
          )}

          {lastRound && (
            <div className="last-round">
              <h3>
                Last Completed Round #{lastRound.id} ({teamLabel(lastRound)})
              </h3>
              <p>Questions: {lastRound.questions.length}</p>
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
