import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import {
  TeamFilterSelect,
  withTeamFilter,
  type TeamFilterValue,
} from '../components/TeamFilterSelect';

interface HistoryRound {
  id: number;
  status: string;
  createdAt: string;
  createdBy?: { id: number; username: string } | null;
  team?: { id: string; name: string } | null;
  questions: { question: { questionId: string; questionText: string } }[];
  _count: { finalizations: number };
}

interface HistoryResponse {
  rounds: HistoryRound[];
  total: number;
  page: number;
  pageSize: number;
}

export function HistoryPage() {
  const [page, setPage] = useState(1);
  const [teamFilter, setTeamFilter] = useState<TeamFilterValue>('all');

  const { data, isLoading } = useQuery<HistoryResponse>({
    queryKey: ['history', page, teamFilter],
    queryFn: () =>
      api.get<HistoryResponse>(
        withTeamFilter(`/quiz/history?page=${page}`, teamFilter),
      ),
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) return <div className="loading">Loading…</div>;

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <div className="page">
      <div className="card">
        <h2>History</h2>
        <TeamFilterSelect
          value={teamFilter}
          onChange={(v) => {
            setTeamFilter(v);
            setPage(1);
          }}
        />
        <div className="table-container">
          <table className="results-table">
            <thead>
            <tr>
              <th>Date</th>
              <th>Team</th>
              <th>Created by</th>
              <th>Topic / First Q</th>
              <th>Questions</th>
              <th>Participants</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data?.rounds.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                <td>{r.team?.name ?? 'Global'}</td>
                <td>{r.createdBy?.username ?? '—'}</td>
                <td>
                  {r.status === 'FINISHED' ? (
                    <Link to={`/quiz/${r.id}`}>
                      {r.questions[0]?.question.questionText.substring(0, 40)}…
                    </Link>
                  ) : (
                    r.questions[0]?.question.questionText.substring(0, 40)
                  )}
                </td>
                <td>{r.questions.length}</td>
                <td>{r._count.finalizations}</td>
                <td>
                  <span className={`badge badge-${r.status.toLowerCase()}`}>
                    {r.status}
                  </span>
                </td>
                <td>
                  {r.status === 'FINISHED' && (
                    <Link to={`/quiz/${r.id}`} className="btn btn-sm">
                      Results
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <div className="pagination">
          <button
            className="btn btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
