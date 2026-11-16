/**
 * `GET /content/usage?unit=word:<id>|letter:<id>|concept:<slug>` (B-1,
 * `content` edge function), staff only: the activities and storybook units
 * that use one unit, from `content_index`.
 */

import { fetchWithAuth } from './client';
import type { WordUsageItem } from './wordUsage';

export type ContentUsageUnit = `word:${string}` | `letter:${string}` | `concept:${string}`;

/** One storybook unit that shows the unit. */
export interface BookUnitUse {
  unit_id: string;
  book_id: string;
  book_title: string | null;
  book_title_ar: string | null;
  item_id: string | null;
  role: string;
}

export interface ContentUsage {
  unit: string;
  activities: WordUsageItem[];
  book_units: BookUnitUse[];
}

export const getContentUsage = (unit: ContentUsageUnit) =>
  fetchWithAuth<ContentUsage>(`/content/usage?unit=${encodeURIComponent(unit)}`);
