import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export type CategoryFilterValue = 'all' | number;

export function CategoryFilterSelect({
  value,
  onChange,
}: {
  value: CategoryFilterValue;
  onChange: (v: CategoryFilterValue) => void;
}) {
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', 'filter-options'],
    queryFn: () => api.categories.getAll(),
    staleTime: 1000 * 60,
  });

  return (
    <div className="form-group" style={{ marginBottom: '1rem', marginLeft: '1rem' }}>
      <label>Filter by category</label>
      <select
        value={value === 'all' ? 'all' : String(value)}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val === 'all' ? 'all' : Number(val));
        }}
      >
        <option value="all">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function categoryFilterQueryParam(filter: CategoryFilterValue): string {
  if (filter === 'all') return '';
  return `categoryId=${encodeURIComponent(filter)}`;
}

export function withCategoryFilter(path: string, filter: CategoryFilterValue): string {
  const param = categoryFilterQueryParam(filter);
  if (!param) return path;
  return path.includes('?') ? `${path}&${param}` : `${path}?${param}`;
}