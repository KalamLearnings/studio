/**
 * Word library endpoints on the `words` edge function.
 */

import { fetchWithAuth } from '@/lib/api/client';
import { suggestHarakatRequest, type SuggestHarakatResponse } from '@/lib/soundBlend/harakat';

/**
 * `POST /words/suggest-harakat` (staff only, SB-B8). Writes nothing. Throws
 * `ApiError` with code `SPEND_DISABLED` / `SPEND_BUDGET_EXCEEDED` (503) or
 * `PROVIDER_RATE_LIMITED` (429).
 */
export async function suggestHarakat(text: string): Promise<SuggestHarakatResponse> {
  return fetchWithAuth<SuggestHarakatResponse>('/words/suggest-harakat', {
    method: 'POST',
    body: JSON.stringify(suggestHarakatRequest(text)),
  });
}
