/**
 * API Client for Book operations (Storytime Books)
 * All functions throw on error - wrap in try/catch
 */

import { getPersistedEnvironment, getConfigForEnvironment } from '@/lib/stores/environmentStore';
import { getClientForEnv } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type AvailabilityType = 'store_always' | 'store_unlockable' | 'curriculum_reward' | 'default';
export type PrerequisiteType = 'topic' | 'node';

export interface BookAvailability {
  id: string;
  book_id: string;
  availability_type: AvailabilityType;
  curriculum_id: string | null;
  curriculum_name: string | null;
  prerequisite_type: PrerequisiteType | null;
  prerequisite_topic_id: string | null;
  prerequisite_topic_name: string | null;
  prerequisite_node_id: string | null;
  created_at: string;
}

export interface WordTiming {
  word: string;
  start_ms: number;
  end_ms: number;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface InteractiveElement {
  id: string;
  type: 'tap_animation' | 'tap_sound' | 'tap_speech';
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  animation_url?: string;
  sound_url?: string;
  speech_text?: string;
}

export interface BookPage {
  id: string;
  book_id: string;
  page_number: number;
  layout: 'single' | 'split';
  background_image_url: string;
  text: string;
  audio_url: string | null;
  word_timings: WordTiming[];
  interactive_elements: InteractiveElement[];
  layers: unknown[];
  created_at: string;
}

export interface Book {
  id: string;
  shop_item_id: string;
  title: string;
  title_ar: string;
  synopsis: string | null;
  synopsis_ar: string | null;
  difficulty_level: 1 | 2 | 3;
  page_count: number;
  estimated_read_time_minutes: number | null;
  target_letters: string[];
  created_at: string;
  updated_at: string;
  image_url: string;
  price: number;
  is_premium: boolean;
  is_active: boolean;
  availability_rules: BookAvailability[];
}

export interface CreateBookRequest {
  title: string;
  title_ar: string;
  synopsis?: string;
  synopsis_ar?: string;
  cover_image_url: string;
  difficulty_level: 1 | 2 | 3;
  target_letters?: string[];
  price?: number;
  is_premium?: boolean;
}

export interface UpdateBookRequest {
  title?: string;
  title_ar?: string;
  synopsis?: string | null;
  synopsis_ar?: string | null;
  cover_image_url?: string;
  difficulty_level?: 1 | 2 | 3;
  target_letters?: string[];
  price?: number;
  is_premium?: boolean;
  is_active?: boolean;
}

export interface CreatePageRequest {
  page_number: number;
  layout?: 'single' | 'split';
  background_image_url: string;
  text: string;
  audio_url?: string;
  word_timings?: WordTiming[];
  interactive_elements?: InteractiveElement[];
  layers?: unknown[];
}

export interface UpdatePageRequest {
  page_number?: number;
  layout?: 'single' | 'split';
  background_image_url?: string;
  text?: string;
  audio_url?: string | null;
  word_timings?: WordTiming[];
  interactive_elements?: InteractiveElement[];
  layers?: unknown[];
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
// BOOKS
// ============================================================================

export async function listBooks(): Promise<Book[]> {
  return fetchWithAuth<Book[]>('/books/admin');
}

export async function getBook(bookId: string): Promise<Book> {
  return fetchWithAuth<Book>(`/books/admin/${bookId}`);
}

export async function createBook(data: CreateBookRequest): Promise<Book> {
  return fetchWithAuth<Book>('/books/admin', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBook(bookId: string, data: UpdateBookRequest): Promise<Book> {
  return fetchWithAuth<Book>(`/books/admin/${bookId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteBook(bookId: string): Promise<void> {
  return fetchWithAuth<void>(`/books/admin/${bookId}`, { method: 'DELETE' });
}

// ============================================================================
// PAGES
// ============================================================================

export async function listPages(bookId: string): Promise<BookPage[]> {
  return fetchWithAuth<BookPage[]>(`/books/admin/${bookId}/pages`);
}

export async function createPage(bookId: string, data: CreatePageRequest): Promise<BookPage> {
  return fetchWithAuth<BookPage>(`/books/admin/${bookId}/pages`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePage(
  bookId: string,
  pageId: string,
  data: UpdatePageRequest
): Promise<BookPage> {
  return fetchWithAuth<BookPage>(`/books/admin/${bookId}/pages/${pageId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deletePage(bookId: string, pageId: string): Promise<void> {
  return fetchWithAuth<void>(`/books/admin/${bookId}/pages/${pageId}`, {
    method: 'DELETE',
  });
}

export async function reorderPages(
  bookId: string,
  pages: Array<{ id: string; page_number: number }>
): Promise<void> {
  return fetchWithAuth<void>(`/books/admin/${bookId}/pages/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ pages }),
  });
}

// ============================================================================
// AVAILABILITY
// ============================================================================

export async function listAvailability(bookId: string): Promise<BookAvailability[]> {
  return fetchWithAuth<BookAvailability[]>(`/books/admin/${bookId}/availability`);
}

export async function createAvailability(
  bookId: string,
  data: CreateAvailabilityRequest
): Promise<BookAvailability> {
  return fetchWithAuth<BookAvailability>(`/books/admin/${bookId}/availability`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAvailability(
  bookId: string,
  ruleId: string,
  data: UpdateAvailabilityRequest
): Promise<BookAvailability> {
  return fetchWithAuth<BookAvailability>(`/books/admin/${bookId}/availability/${ruleId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAvailability(bookId: string, ruleId: string): Promise<void> {
  return fetchWithAuth<void>(`/books/admin/${bookId}/availability/${ruleId}`, {
    method: 'DELETE',
  });
}
