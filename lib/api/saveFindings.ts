/** Logged save findings on the `curriculum` edge function (backend CM-S13r). */

import { fetchWithAuth } from './client';
import type { ActivitySaveFindings } from '@/lib/activityConfig/saveFindings';

export const getActivitySaveFindings = (activityId: string) =>
  fetchWithAuth<ActivitySaveFindings>(
    `/curriculum/reading/activities/${encodeURIComponent(activityId)}/save-findings`,
  );
