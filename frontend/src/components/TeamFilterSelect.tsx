import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export type TeamFilterValue = 'all' | 'global' | string;

interface TeamOption {
  id: string;
  name: string;
}

interface UserTeam {
  role: string;
  team: TeamOption;
}

function normalizeTeams(data: UserTeam[] | TeamOption[]): TeamOption[] {
  if (!data?.length) return [];
  if ('team' in data[0]) {
    return (data as UserTeam[]).map((ut) => ut.team);
  }
  return data as TeamOption[];
}

export function TeamFilterSelect({
  value,
  onChange,
}: {
  value: TeamFilterValue;
  onChange: (v: TeamFilterValue) => void;
}) {
  const { data: rawTeams = [] } = useQuery({
    queryKey: ['teams', 'filter-options'],
    queryFn: () => api.teams.getFilterOptions(),
    staleTime: 1000 * 60,
  });

  const teams = normalizeTeams(rawTeams as UserTeam[] | TeamOption[]);

  return (
    <div className="form-group" style={{ marginBottom: '1rem' }}>
      <label>Filter by team</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as TeamFilterValue)}
      >
        <option value="all">All my teams</option>
        <option value="global">Global</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function teamFilterQueryParam(filter: TeamFilterValue): string {
  if (filter === 'all') return '';
  return `teamId=${encodeURIComponent(filter)}`;
}

export function withTeamFilter(path: string, filter: TeamFilterValue): string {
  const param = teamFilterQueryParam(filter);
  if (!param) return path;
  return path.includes('?') ? `${path}&${param}` : `${path}?${param}`;
}
