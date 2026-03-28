import type { Session } from './session'

const API_BASE = 'http://127.0.0.1:8000/api'

export async function apiRequest<T>(
  path: string,
  session: Session | null,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Demo-Role': session?.role ?? 'ANALYST',
      'X-Demo-User-Id': session?.userId ?? 'EMP001',
      'X-Demo-User-Name': session?.userName ?? 'Naina Kapoor',
      ...(init?.headers ?? {}),
    },
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(payload.detail ?? 'Request failed')
  }
  if (response.headers.get('Content-Type')?.includes('application/json')) {
    return (await response.json()) as T
  }
  return response as unknown as T
}
