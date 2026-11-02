/**
 * API Client for Studio localization (activity translations)
 * All functions throw on error - wrap in try/catch
 */

import { fetchWithAuth } from './client';

// ============================================================================
// TYPES
// ============================================================================

export type LocaleStatus = 'disabled' | 'backfilling' | 'live';

export interface LocalizationLocale {
  code: string;
  englishName: string;
  nativeName: string;
  status: LocaleStatus;
}

export type TranslationStatus =
  | 'ready'
  | 'pending'
  | 'failed'
  | 'stale'
  | 'missing';

export interface ActivityTranslation {
  code: string;
  englishName: string;
  nativeName: string;
  localeStatus: Exclude<LocaleStatus, 'disabled'>;
  status: TranslationStatus;
  text: string | null;
  audioUrl: string | null;
  error: string | null;
  attempts: number;
  updatedAt: string | null;
}

export interface ActivityTranslations {
  activityId: string;
  englishText: string | null;
  locales: ActivityTranslation[];
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const LOCALIZATION_PATH = '/admin/localization';

export async function listLocalizationLocales(): Promise<LocalizationLocale[]> {
  return fetchWithAuth<LocalizationLocale[]>(`${LOCALIZATION_PATH}/locales`);
}

export async function getActivityTranslations(
  activityId: string
): Promise<ActivityTranslations> {
  return fetchWithAuth<ActivityTranslations>(
    `${LOCALIZATION_PATH}/activities/${encodeURIComponent(activityId)}/translations`
  );
}

export async function retryActivityTranslation(
  activityId: string,
  locale: string
): Promise<{ status: 'pending' }> {
  return fetchWithAuth<{ status: 'pending' }>(
    `${LOCALIZATION_PATH}/activities/${encodeURIComponent(activityId)}/translations/${encodeURIComponent(locale)}/retry`,
    { method: 'POST' }
  );
}
