/**
 * React Query hooks for activity translations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';
import {
  listLocalizationLocales,
  getActivityTranslations,
  retryActivityTranslation,
  type ActivityTranslation,
} from '@/lib/api/localization';

const LOCALES_QUERY_KEY = ['localization', 'locales'] as const;
const translationsQueryKey = (activityId: string) =>
  ['localization', 'translations', activityId] as const;

export const TRANSLATIONS_POLL_MS = 5000;

export function translationsErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return "You don't have access to translations.";
    if (error.status === 404) return 'This activity or language could not be found.';
    if (error.status === 409) return 'Add an English instruction and save before translating.';
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

// ============================================================================
// QUERY HOOKS
// ============================================================================

export function useLocalizationLocales() {
  return useQuery({
    queryKey: LOCALES_QUERY_KEY,
    queryFn: listLocalizationLocales,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useActivityTranslations(activityId: string, enabled: boolean) {
  return useQuery({
    queryKey: translationsQueryKey(activityId),
    queryFn: () => getActivityTranslations(activityId),
    enabled,
    retry: false,
    refetchInterval: (query) =>
      query.state.data?.locales.some((l) => l.status === 'pending')
        ? TRANSLATIONS_POLL_MS
        : false,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

export function useRetryTranslation(activityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (translation: ActivityTranslation) =>
      retryActivityTranslation(activityId, translation.code),
    onSuccess: (_result, translation) => {
      toast.success(`Retrying ${translation.englishName} translation.`);
    },
    onError: (error) => {
      toast.error(translationsErrorMessage(error, 'Failed to retry translation'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: translationsQueryKey(activityId) });
    },
  });
}
