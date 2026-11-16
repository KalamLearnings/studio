/** One phrase's whole-phrase audio takes (CM-S14), shared by the old phrase page and Review's Recordings. */

import { useQuery } from "@tanstack/react-query";
import { getPhraseAudio } from "@/lib/api/phraseReview";
import { hasTakeInProgress } from "@/lib/phrases/phraseAudio";

export const phraseAudioKey = (phraseKey: string) => ["reading-phrase-audio", phraseKey] as const;

/** `GET .../:key/audio`; looked at again every 5 s while a take is being made. */
export function usePhraseAudio(phraseKey: string, enabled = true) {
  return useQuery({
    queryKey: phraseAudioKey(phraseKey),
    queryFn: () => getPhraseAudio(phraseKey),
    enabled,
    refetchInterval: (q) => (q.state.data && hasTakeInProgress(q.state.data) ? 5_000 : false),
  });
}
