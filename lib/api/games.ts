/**
 * API Client for Game operations (Mini-Games)
 * All functions throw on error - wrap in try/catch
 *
 * Mirrors lib/api/books.ts conventions.
 */

import { getPersistedEnvironment, getConfigForEnvironment } from '@/lib/stores/environmentStore';
import { getClientForEnv } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type AvailabilityType = 'store_always' | 'store_unlockable' | 'curriculum_reward' | 'default';
export type PrerequisiteType = 'topic' | 'node';

export interface GameAvailability {
  id: string;
  game_id: string;
  availability_type: AvailabilityType;
  curriculum_id: string | null;
  curriculum_name: string | null;
  prerequisite_type: PrerequisiteType | null;
  prerequisite_topic_id: string | null;
  prerequisite_topic_name: string | null;
  prerequisite_node_id: string | null;
  created_at: string;
}

export interface Game {
  id: string;
  shop_item_id: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  game_key: string;
  difficulty_level: 1 | 2 | 3;
  target_skills: string[];
  min_age: number | null;
  max_age: number | null;
  created_at: string;
  updated_at: string;
  image_url: string;
  price: number;
  is_premium: boolean;
  is_active: boolean;
  availability_rules: GameAvailability[];
}

export interface CreateGameRequest {
  title: string;
  title_ar?: string;
  description?: string;
  cover_image_url: string;
  game_key: string;
  difficulty_level: 1 | 2 | 3;
  target_skills?: string[];
  min_age?: number;
  max_age?: number;
  price?: number;
  is_premium?: boolean;
}

export interface UpdateGameRequest {
  title?: string;
  title_ar?: string | null;
  description?: string | null;
  cover_image_url?: string;
  game_key?: string;
  difficulty_level?: 1 | 2 | 3;
  target_skills?: string[];
  min_age?: number | null;
  max_age?: number | null;
  price?: number;
  is_premium?: boolean;
  is_active?: boolean;
}

export interface CreateAvailabilityRequest {
  availability_type: AvailabilityType;
  curriculum_id?: string;
  prerequisite_type?: PrerequisiteType;
  prerequisite_topic_id?: string;
  prerequisite_node_id?: string;
}

export interface UpdateAvailabilityRequest {
  availability_type?: AvailabilityType;
  curriculum_id?: string;
  prerequisite_type?: PrerequisiteType;
  prerequisite_topic_id?: string;
  prerequisite_node_id?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

async function fetchWithAuth<T>(
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
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  const json = await res.json();
  return json.data?.data || json.data || json;
}

async function getAuthToken(): Promise<string> {
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

// ============================================================================
// GAMES
// ============================================================================

export async function listGames(): Promise<Game[]> {
  return fetchWithAuth<Game[]>('/games/admin');
}

export async function getGame(gameId: string): Promise<Game> {
  return fetchWithAuth<Game>(`/games/admin/${gameId}`);
}

export async function createGame(data: CreateGameRequest): Promise<Game> {
  return fetchWithAuth<Game>('/games/admin', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateGame(gameId: string, data: UpdateGameRequest): Promise<Game> {
  return fetchWithAuth<Game>(`/games/admin/${gameId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteGame(gameId: string): Promise<void> {
  return fetchWithAuth<void>(`/games/admin/${gameId}`, { method: 'DELETE' });
}

// ============================================================================
// AVAILABILITY
// ============================================================================

export async function listAvailability(gameId: string): Promise<GameAvailability[]> {
  return fetchWithAuth<GameAvailability[]>(`/games/admin/${gameId}/availability`);
}

export async function createAvailability(
  gameId: string,
  data: CreateAvailabilityRequest
): Promise<GameAvailability> {
  return fetchWithAuth<GameAvailability>(`/games/admin/${gameId}/availability`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAvailability(
  gameId: string,
  ruleId: string,
  data: UpdateAvailabilityRequest
): Promise<GameAvailability> {
  return fetchWithAuth<GameAvailability>(`/games/admin/${gameId}/availability/${ruleId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAvailability(gameId: string, ruleId: string): Promise<void> {
  return fetchWithAuth<void>(`/games/admin/${gameId}/availability/${ruleId}`, {
    method: 'DELETE',
  });
}
