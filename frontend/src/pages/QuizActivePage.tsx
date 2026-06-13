import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
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
  category?: { id: number; name: string } | null;
  difficulty?: { id: number; name: string } | null;
  info?: string | null;
  answerA: string;
  answerB: string;
  answerC: string;
  answerD: string;
  correctAnswer: string;
  creator?: { id: number; username: string } | null;
  createdAt: string;
}

interface RoundQuestion {
  id: number;
  questionId: number;
  order: number;
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
  createdAt: string;
  finishedAt?: string;
  createdBy?: { id: number; username: string };
  team?: { id: string; name: string } | null;
  teamMembers?: { id: number; username: string }[];
}

export function QuizActivePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const { data: settings } = useQuery<{ theme: string; refreshInterval: number }>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
    staleTime: 1000 * 60,
  });

  const pollMs = (settings?.refreshInterval ?? 5) * 1000;

  const { data: round, isLoading } = useQuery<QuizRound>({
    queryKey: ['quiz', id],
    queryFn: () => api.get<QuizRound>(`/quiz/${id}`),
    refetchInterval: (query) => {
      const s = query?.state?.data?.status;
      return s === 'ACTIVE' || s === undefined ? pollMs : false;
    },
    refetchIntervalInBackground: true,
    staleTime: 500, // Reduce stale time for faster updates
  });

  // Hooks must be called unconditionally, so define these before any early return
  const submitMutation = useMutation({
    mutationFn: (data: { questionId: number; answer: string }) =>
      api.post(`/quiz/${id}/answers`, { questionId: data.questionId, selectedAnswer: data.answer }),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['quiz', id] });
      const previousRound = queryClient.getQueryData<QuizRound>(['quiz', id]);
      // We'll compute currentRQ inside the onMutate callback using the cached round data
      const cachedRound = queryClient.getQueryData<QuizRound>(['quiz', id]);
      if (cachedRound && user) {
        const currentRQ = cachedRound.questions[currentIdx];
        if (currentRQ) {
          queryClient.setQueryData<QuizRound>(['quiz', id], (old) => {
            if (!old) return old;
            const existingAnswerIndex = old.answers.findIndex(
              (a) => a.roundQuestionId === currentRQ.id && a.user.id === user.id,
            );
            const optimisticAnswer: Answer = {
              id: existingAnswerIndex >= 0 ? old.answers[existingAnswerIndex].id : Date.now(),
              selectedAnswer: data.answer,
              user: { id: user.id, username: user.username },
              roundQuestionId: currentRQ.id,
            };
            const newAnswers = [...old.answers];
            if (existingAnswerIndex >= 0) {
              newAnswers[existingAnswerIndex] = optimisticAnswer;
            } else {
              newAnswers.push(optimisticAnswer);
            }
            return { ...old, answers: newAnswers };
          });
        }
      }
      return { previousRound };
    },
    onError: (_err, _data, context) => {
      if (context?.previousRound) {
        queryClient.setQueryData(['quiz', id], context.previousRound);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['quiz', id] });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: () => api.post(`/quiz/${id}/finalize`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['quiz', id] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.del(`/quiz/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['quiz'] });
      navigate('/');
    },
  });

  if (isLoading || !round) return <div className="loading">Loading…</div>;

  const currentRQ = round.questions[currentIdx];
  const myAnswers = round.answers.filter((a) => a.user.id === user?.id);
  const currentAnswer = myAnswers.find((a) => a.roundQuestionId === currentRQ?.id);

  const isFinalized = round.finalizations?.some((f) => f.user.id === user?.id);
  const isFinished = round.status === 'FINISHED';
  const isCancelled = round.status === 'CANCELLED';
  const canCancel =
    round.status === 'ACTIVE' &&
    (round.createdBy?.id === user?.id || user?.role === 'ADMIN');

  const renderQuizContent = () => {
    if (isFinished) {
      const options = ['A', 'B', 'C', 'D'] as const;

      const questionByRoundQuestionId = new Map(
        round.questions.map((rq) => [rq.id, rq.question]),
      );

      const participantsMap = new Map<number, { id: number; username: string }>();
      round.finalizations?.forEach((f) => {
        participantsMap.set(f.user.id, f.user);
      });
      round.answers.forEach((a) => {
        participantsMap.set(a.user.id, a.user);
      });

      const participantScores = Array.from(participantsMap.values()).map((player) => {
        const playerAnswers = round.answers.filter((a) => a.user.id === player.id);
        const correct = playerAnswers.filter((a) => {
          const question = questionByRoundQuestionId.get(a.roundQuestionId);
          return question?.correctAnswer === a.selectedAnswer;
        }).length;

        return {
          ...player,
          points: correct,
        };
      });

      participantScores.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return a.username.localeCompare(b.username);
      });

      const topPoints = participantScores[0]?.points ?? 0;
      const winners = participantScores.filter((p) => p.points === topPoints);

      return (
        <div className="round-results">
          <h3>Round Results</h3>

          <div
            className="card"
            style={{ marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}
          >
            <h4 style={{ marginBottom: '0.75rem' }}>Summary</h4>
            {participantScores.length === 0 ? (
              <p className="muted">No participants found for this round.</p>
            ) : (
              <>
                <p style={{ marginBottom: '0.75rem' }}>
                  {winners.length > 1 ? (
                    <>
                      <strong>Winners (tie):</strong>{' '}
                      {winners.map((w) => w.username).join(', ')} with {topPoints} point(s)
                    </>
                  ) : (
                    <>
                      <strong>Winner:</strong> {winners[0].username} with {topPoints} point(s)
                    </>
                  )}
                </p>
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participantScores.map((p) => (
                      <tr key={p.id}>
                        <td>{p.username}</td>
                        <td>{p.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* Show missing team members for team rounds */}
            {round.team?.id && round.teamMembers && (
              <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Missing Participants</h4>
                {round.teamMembers && round.teamMembers.length > participantScores.length ? (
                  <div className="participants-list">
                    {round.teamMembers
                      .filter((member) => !participantScores.some((p) => p.id === member.id))
                      .map((member) => (
                        <span key={member.id} className="badge" style={{ opacity: 0.5 }}>
                          {member.username}
                        </span>
                      ))}
                  </div>
                ) : (
                  <p className="muted">All team members have participated.</p>
                )}
              </div>
            )}
          </div>

          {round.questions.map((rq, idx) => {
            const { question } = rq;
            const questionAnswers = round.answers.filter((a) => a.roundQuestionId === rq.id);
            return (
              <div key={rq.id} className="result-question">
                <p className="result-question-text">
                  <strong>Q{idx + 1}:</strong> {question.questionText}
                  <span className="muted"> | ID: {question.questionId}</span>
                  {question.category?.name && (
                    <span className="muted"> | Category: {question.category.name}</span>
                  )}
                  {question.difficulty?.name && (
                    <span className="muted"> | Difficulty: {question.difficulty.name}</span>
                  )}
                  {question.creator?.username && (
                    <span className="muted"> | Created by: {question.creator.username}</span>
                  )}
                </p>
                <div className="result-options">
                  {options.map((key) => {
                    const text = question[`answer${key}` as keyof Question] as string;
                    const isCorrect = question.correctAnswer === key;
                    const pickedBy = questionAnswers
                      .filter((a) => a.selectedAnswer === key)
                      .map((a) => a.user.username);
                    return (
                      <div key={key} className={`result-option${isCorrect ? ' result-option-correct' : ''}`}>
                        <span className="result-option-label">
                          <strong>{key}.</strong> {text}
                          {isCorrect && <span className="result-correct-badge">✓</span>}
                        </span>
                        {pickedBy.length > 0 && (
                          <span className="result-picked-by">{pickedBy.join(', ')}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {question.info && (
                  <p className="muted" style={{ marginTop: '0.5rem' }}>
                    Info: {question.info}
                  </p>
                )}
              </div>
            );
          })}
          <div className="form-actions" style={{ marginTop: '2rem' }}>
            <button className="btn" onClick={() => navigate('/')}>Back to Dashboard</button>
          </div>
        </div>
      );
    }

    if (isCancelled) {
      return (
        <div className="cancelled-state">
          <p>This quiz round was cancelled.</p>
          <button className="btn" onClick={() => navigate('/')}>
            Back home
          </button>
        </div>
      );
    }

    if (isFinalized) {
      // Get finalized user IDs
      const finalizedUserIds = new Set(round.finalizations?.map((f) => f.user.id) ?? []);

      // For team rounds, compute missing members
      const missingMembers = round.teamMembers?.filter(
        (member) => !finalizedUserIds.has(member.id)
      ) ?? [];

      return (
        <div className="my-answer">
          <p>✅ <strong>You have finalized your answers.</strong></p>
          <p className="muted">
            Waiting for {round.requiredParticipants - (round.finalizations?.length ?? 0)} more participant(s) to finish…
          </p>
          <div className="progress-bar-label">
            Finalized: {round.finalizations?.length ?? 0} / {round.requiredParticipants}
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${((round.finalizations?.length ?? 0) / round.requiredParticipants) * 100}%`,
              }}
            />
          </div>

          <div className="participants-list">
            {round.finalizations?.map((f) => (
              <span key={f.user.id} className="badge badge-participant">
                {f.user.username} (Done)
              </span>
            ))}
            {missingMembers.map((member) => (
              <span key={member.id} className="badge" style={{ opacity: 0.5 }}>
                {member.username} (Pending)
              </span>
            ))}
          </div>
        </div>
      );
    }

    // Question / Summary Phase
    const allAnswered = round.questions.every((rq) =>
      myAnswers.some((a) => a.roundQuestionId === rq.id)
    );

    if (currentIdx >= round.questions.length) {
      // Summary View
      return (
        <div className="quiz-summary">
          <h3>Review Your Answers</h3>
          <div className="summary-list">
            {round.questions.map((rq, idx) => {
              const ans = myAnswers.find((a) => a.roundQuestionId === rq.id);
              return (
                <div key={rq.id} className="summary-item" style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                  <p style={{ margin: 0 }}>
                    <strong>Q{idx + 1}:</strong> {rq.question.questionText}
                  </p>
                  <p style={{ margin: '0.5rem 0' }}>
                    Your Answer:{' '}
                    {ans ? (
                      <strong>
                        {ans.selectedAnswer}.{' '}
                        {rq.question[`answer${ans.selectedAnswer}` as keyof Question] as string}
                      </strong>
                    ) : (
                      <strong>None</strong>
                    )}
                  </p>
                  <button className="btn btn-sm" onClick={() => setCurrentIdx(idx)}>
                    Edit Choice
                  </button>
                </div>
              );
            })}
          </div>
          <div className="form-actions" style={{ marginTop: '2rem' }}>
            <button
              className="btn btn-primary btn-lg"
              disabled={!allAnswered || finalizeMutation.isPending}
              onClick={() => finalizeMutation.mutate()}
            >
              {finalizeMutation.isPending ? 'Finalizing...' : 'Final Submit Round'}
            </button>
          </div>
        </div>
      );
    }

    // Question View
    if (!currentRQ) return null;
    const { question } = currentRQ;
    const options = [
      { key: 'A', text: question.answerA },
      { key: 'B', text: question.answerB },
      { key: 'C', text: question.answerC },
      { key: 'D', text: question.answerD },
    ];

    return (
      <div className="question-view">
        <div className="muted" style={{ marginBottom: '1rem' }}>
          Question {currentIdx + 1} of {round.questions.length}
        </div>
        <p className="question-text">{question.questionText}</p>
        <div className="answer-choices">
          {options.map(({ key, text }) => (
            <button
              key={key}
              className={`answer-btn ${currentAnswer?.selectedAnswer === key ? 'selected' : ''}`}
              onClick={() => submitMutation.mutate({ questionId: question.id, answer: key })}
              disabled={submitMutation.isPending}
            >
              <strong>{key}.</strong> {text}
            </button>
          ))}
        </div>
        <div className="form-actions" style={{ justifyContent: 'space-between', marginTop: '2rem' }}>
          <button
            className="btn"
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx(currentIdx - 1)}
          >
            Previous
          </button>
          <button
            className="btn btn-primary"
            disabled={!currentAnswer}
            onClick={() => setCurrentIdx(currentIdx + 1)}
          >
            {currentIdx === round.questions.length - 1 ? 'Go to Summary' : 'Next Question'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="card">
        <div className="card-header">
          <h2>
            Quiz Round #{round.id}
            <span className="muted" style={{ fontSize: '0.85rem', marginLeft: '0.75rem' }}>
              ({round.team?.name ?? 'Global'})
            </span>
          </h2>
          <div style={{ textAlign: 'right' }}>
            <span className={`badge badge-${round.status.toLowerCase()}`}>
              {round.status}
            </span>
          </div>
        </div>

        {renderQuizContent()}

        {canCancel && (
          <div style={{ marginTop: '3rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            {!showCancelConfirm ? (
              <button
                className="btn btn-error btn-sm"
                onClick={() => setShowCancelConfirm(true)}
              >
                Cancel Quiz
              </button>
            ) : (
              <div className="alert alert-error" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span>Cancel this quiz for everyone?</span>
                <button
                  className="btn btn-error btn-sm"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                >
                  Yes, Cancel
                </button>
                <button
                  className="btn btn-sm"
                  onClick={() => setShowCancelConfirm(false)}
                >
                  No
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}