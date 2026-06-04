import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  TeamFilterSelect,
  withTeamFilter,
  type TeamFilterValue,
} from '../components/TeamFilterSelect';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

interface UserStat {
  id: number;
  username: string;
  played: number;
  correct: number;
  incorrect: number;
  accuracy: number;
}

interface ActivityStat {
  date: string;
  count: number;
}

export function InsightsPage() {
  const [teamFilter, setTeamFilter] = useState<TeamFilterValue>('all');

  const { data: stats = [], isLoading: statsLoading } = useQuery<UserStat[]>({
    queryKey: ['insights', teamFilter],
    queryFn: () =>
      api.get<UserStat[]>(withTeamFilter('/quiz/insights', teamFilter)),
    staleTime: 1000 * 60 * 10,
  });

  const { data: activity = [], isLoading: activityLoading } = useQuery<ActivityStat[]>({
    queryKey: ['activity', teamFilter],
    queryFn: () =>
      api.get<ActivityStat[]>(withTeamFilter('/quiz/activity', teamFilter)),
    staleTime: 1000 * 60 * 10,
  });

  if (statsLoading || activityLoading) return <div className="loading">Loading…</div>;

  const mostActive = [...stats].sort((a, b) => b.played - a.played)[0];
  const highestAccuracy = [...stats]
    .filter((s) => s.played > 0)
    .sort((a, b) => b.accuracy - a.accuracy)[0];

  const chartData = {
    labels: activity.map((a) => a.date),
    datasets: [
      {
        label: 'Rounds Finished',
        data: activity.map((a) => a.count),
        backgroundColor: '#00ff41',
        borderColor: '#39ff14',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#00ff41', font: { family: 'monospace' } },
      },
      title: {
        display: true,
        text: 'Activity (Last 30 Days)',
        color: '#00ff41',
        font: { family: 'monospace', size: 16 },
      },
    },
    scales: {
      y: {
        ticks: { color: '#00ff41', font: { family: 'monospace' }, stepSize: 1 },
        grid: { color: '#1a1a1a' },
      },
      x: {
        ticks: { color: '#00ff41', font: { family: 'monospace' } },
        grid: { color: '#1a1a1a' },
      },
    },
  };

  return (
    <div className="page">
      <div className="card">
        <h2>Insights</h2>
        <TeamFilterSelect value={teamFilter} onChange={setTeamFilter} />

        {mostActive && (
          <div className="insights-highlights">
            <div className="highlight-card">
              🏆 Most Active: <strong>{mostActive.username}</strong> ({mostActive.played}{' '}
              answers)
            </div>
            {highestAccuracy && (
              <div className="highlight-card">
                🎯 Highest Accuracy: <strong>{highestAccuracy.username}</strong> (
                {highestAccuracy.accuracy}%)
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: '2rem' }}>
          <Bar data={chartData} options={chartOptions} />
        </div>

        <h3>User Ranking</h3>
        <table className="results-table">
          <thead>
            <tr>
              <th>#</th>
              <th>User</th>
              <th>Correct</th>
              <th>Incorrect</th>
              <th>Played</th>
              <th>Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s, i) => (
              <tr key={s.id}>
                <td>{i + 1}</td>
                <td>{s.username}</td>
                <td>{s.correct}</td>
                <td>{s.incorrect}</td>
                <td>{s.played}</td>
                <td>{s.accuracy}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
