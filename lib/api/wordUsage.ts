/** `GET /words/:wordId/usage` (`words` edge function, CM-USAGE), staff only. */

import { fetchWithAuth } from './client';

export type WordUsageRole = 'target' | 'distractor' | 'exposure';

export interface WordUsageItem {
  activity_id: string;
  type: string;
  node_id: string;
  curriculum_id: string;
  node_title: string;
  topic_title: string;
  curriculum_title: string;
  role: WordUsageRole;
}

export async function getWordUsage(wordId: string): Promise<WordUsageItem[]> {
  const res = await fetchWithAuth<{ items: WordUsageItem[] }>(`/words/${encodeURIComponent(wordId)}/usage`);
  return res.items;
}
