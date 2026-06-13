const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';

// Store token in localStorage as fallback for iOS cross-site cookie issues
let fallbackToken: string | null = localStorage.getItem('auth-token');

export function setFallbackToken(token: string) {
  fallbackToken = token;
  localStorage.setItem('auth-token', token);
}

export function clearFallbackToken() {
  fallbackToken = null;
  localStorage.removeItem('auth-token');
}

async function parseResponseBody<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) {
    return undefined as T;
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return JSON.parse(text) as T;
  }

  const maybeHtml = text.trim().startsWith('<!DOCTYPE html') || text.trim().startsWith('<html');
  if (maybeHtml) {
    throw new Error(
      'API returned HTML instead of JSON. Check VITE_API_BASE_URL and ensure frontend rewrites do not intercept API routes.',
    );
  }

  throw new Error(
    `Unexpected API response content-type: ${contentType || 'unknown'}. Expected application/json.`,
  );
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  // Build headers - include Authorization header as fallback for iOS cross-site cookie issues
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fallbackToken ? { Authorization: `Bearer ${fallbackToken}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers,
    ...options,
  });
  if (!res.ok) {
    const body = await parseResponseBody<{ message?: string }>(res).catch(() => undefined);
    throw new Error(body?.message ?? res.statusText);
  }

  return parseResponseBody<T>(res);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  categories: {
    getAll: () => request<{ categories: { id: number; name: string }[] }>('/questions/meta').then((m) => m.categories),
  },
  teams: {
    create: (data: { name: string; description?: string }) =>
      request('/teams', { method: 'POST', body: JSON.stringify(data) }),
    getMyTeams: () => request('/teams/me'),
    getFilterOptions: () => request('/teams/all'),
    getMembers: (teamId: string) => request(`/teams/${teamId}/members`),
    invite: (teamId: string, username: string) =>
      request(`/teams/${teamId}/invites`, {
        method: 'POST',
        body: JSON.stringify({ username }),
      }),
    getMyInvites: () => request('/teams/invites/me'),
    acceptInvite: (inviteId: number) =>
      request(`/teams/invites/${inviteId}/accept`, { method: 'POST' }),
    declineInvite: (inviteId: number) =>
      request(`/teams/invites/${inviteId}/decline`, { method: 'POST' }),
    revokeInvite: (inviteId: number) =>
      request(`/teams/invites/${inviteId}`, { method: 'DELETE' }),
    getPendingInvites: (teamId: string) =>
      request(`/teams/invites/${teamId}/pending`),
    leave: (teamId: string) =>
      request(`/teams/${teamId}/leave`, { method: 'POST' }),
    delete: (teamId: string) => request(`/teams/${teamId}`, { method: 'DELETE' }),
    // Admin endpoints
    getTeam: (teamId: string) => request(`/teams/${teamId}`),
    addMember: (teamId: string, userId: number) =>
      request(`/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify({ userId }) }),
    removeMember: (teamId: string, userId: number) =>
      request(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' }),
    transferOwnership: (teamId: string, newOwnerId: number) =>
      request(`/teams/${teamId}/transfer`, { method: 'POST', body: JSON.stringify({ newOwnerId }) }),
    getPendingInvitesAdmin: (teamId: string) =>
      request(`/teams/${teamId}/invites/pending`),
    revokeInviteAdmin: (inviteId: number) =>
      request(`/teams/invites/${inviteId}/admin`, { method: 'DELETE' }),
    // Category exclusion endpoints
    toggleExclusion: (teamId: string, categoryId: number, isExcluded: boolean) =>
      request(`/teams/${teamId}/exclusion`, {
        method: 'POST',
        body: JSON.stringify({ categoryId, isExcluded }),
      }) as Promise<{ categoryId: number; category: { id: number; name: string } }>,
    getExcludedCategories: (teamId: string) =>
      request(`/teams/${teamId}/exclusion`) as Promise<
        Array<{ categoryId: number; category: { id: number; name: string } }>
      >,
    // Admin endpoints
    toggleExclusionAdmin: (teamId: string, categoryId: number, isExcluded: boolean) =>
      request(`/teams/${teamId}/exclusion/admin`, {
        method: 'POST',
        body: JSON.stringify({ categoryId, isExcluded }),
      }) as Promise<{ categoryId: number; category: { id: number; name: string } }>,
    getExcludedCategoriesAdmin: (teamId: string) =>
      request(`/teams/${teamId}/exclusion/admin`) as Promise<
        Array<{ categoryId: number; category: { id: number; name: string } }>
      >,
  },
  users: {
    listAll: () => request('/users'),
    search: (q: string) => request(`/users/search?q=${encodeURIComponent(q)}`),
  },
};
