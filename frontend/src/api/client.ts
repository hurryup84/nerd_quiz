const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api';

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
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
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
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
