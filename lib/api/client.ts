/**
 * Shared edge-function fetch helpers.
 *
 * Extracted verbatim from lib/api/books.ts, which games.ts had already
 * duplicated byte-for-byte. New API modules should import from here rather
 * than making a third copy.
 */

import { getPersistedEnvironment, getConfigForEnvironment } from '@/lib/stores/environmentStore';
import { getClientForEnv } from '@/lib/supabase/client';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function fetchWithAuth<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const env = getPersistedEnvironment();
  const config = getConfigForEnvironment(env);
  const token = await getAuthToken();

  const res = await fetch(`${config.url}/functions/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: config.anonKey,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    const envelope = body?.error && typeof body.error === 'object' ? body.error : undefined;
    throw new ApiError(
      body?.message || envelope?.message || `HTTP ${res.status}`,
      res.status,
      envelope?.code ?? body?.code,
    );
  }

  const json = await res.json();
  return json.data?.data || json.data || json;
}

export async function getAuthToken(): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Auth token only available client-side');
  }

  const env = getPersistedEnvironment();
  const supabase = getClientForEnv(env);

  let {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const storageKey = `kalam-auth-${env}`;
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const stored = JSON.parse(raw);
        const accessToken = stored?.access_token;
        const refreshToken = stored?.refresh_token;
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error) {
            session = data.session;
          }
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  if (!session) {
    throw new Error('NOT_AUTHENTICATED_FOR_ENV');
  }

  const expiresAt = session.expires_at ?? 0;
  const nowSec = Math.floor(Date.now() / 1000);

  if (expiresAt - nowSec < 60) {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (error || !refreshed.session) {
      throw new Error('NOT_AUTHENTICATED_FOR_ENV');
    }
    return refreshed.session.access_token;
  }

  return session.access_token;
}
