/**
 * API Client for Promo Code operations
 * All functions throw on error - wrap in try/catch
 */

import { getPersistedEnvironment, getConfigForEnvironment } from '@/lib/stores/environmentStore';
import { getClientForEnv } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export type PromoPlanType =
  | 'monthly'      // 31 days
  | 'two_month'    // 61 days
  | 'three_month'  // 92 days
  | 'six_month'    // 183 days
  | 'yearly'       // 365 days
  | 'lifetime';    // Forever (200 years)

export interface PromoCode {
  id: string;
  code: string;
  plan_type: PromoPlanType;
  description: string | null;
  max_redemptions: number | null;
  current_redemptions: number;
  is_active: boolean;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromoRedemption {
  id: string;
  promo_code_id: string;
  user_id: string;
  revenuecat_granted: boolean;
  revenuecat_error: string | null;
  created_at: string;
}

export interface CreatePromoCode {
  code: string;
  plan_type?: PromoPlanType;
  description?: string;
  max_redemptions?: number;
  expires_at?: string;
}

export interface UpdatePromoCode {
  description?: string;
  max_redemptions?: number | null;
  is_active?: boolean;
  expires_at?: string | null;
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
// API FUNCTIONS
// ============================================================================

/**
 * List all promo codes
 */
export async function listPromoCodes(): Promise<PromoCode[]> {
  return fetchWithAuth<PromoCode[]>('/billing/promo/codes');
}

/**
 * Create a new promo code
 */
export async function createPromoCode(data: CreatePromoCode): Promise<PromoCode> {
  return fetchWithAuth<PromoCode>('/billing/promo/codes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a promo code
 */
export async function updatePromoCode(
  id: string,
  data: UpdatePromoCode
): Promise<PromoCode> {
  return fetchWithAuth<PromoCode>(`/billing/promo/codes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a promo code
 */
export async function deletePromoCode(id: string): Promise<void> {
  await fetchWithAuth<{ deleted: boolean }>(`/billing/promo/codes/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Get redemptions for a promo code
 */
export async function getPromoCodeRedemptions(
  promoCodeId: string
): Promise<PromoRedemption[]> {
  return fetchWithAuth<PromoRedemption[]>(
    `/billing/promo/codes/${promoCodeId}/redemptions`
  );
}
