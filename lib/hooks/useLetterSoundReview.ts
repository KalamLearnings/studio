/**
 * The Letter sounds lens's sources (CW-11): the audio library's
 * `letter_sounds` files, the open review flags (BE-3) and the letters that
 * name the groups, plus the cache writer its decisions use.
 */

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listLetterSoundFlags } from "@/lib/api/assets";
import { fetchLetters, type Letter } from "@/lib/hooks/useLetters";
import type { LetterCache } from "@/lib/review/actions/letters";
import type { LetterSoundFlag } from "@/lib/review/normalise/letters";
import { getAudioAssets } from "@/lib/services/audioService";

export const LETTER_SOUND_FILES_KEY = ["review", "letter-sound-files"] as const;
export const LETTER_SOUND_FLAGS_KEY = ["review", "letter-sound-flags"] as const;

const NO_LETTERS: Letter[] = [];

export function useLetterSoundSources(enabled: boolean) {
  const files = useQuery({
    queryKey: LETTER_SOUND_FILES_KEY,
    queryFn: () => getAudioAssets({ category: "letter_sounds" }),
    enabled,
    staleTime: 5 * 60_000,
  });
  const flags = useQuery({ queryKey: LETTER_SOUND_FLAGS_KEY, queryFn: listLetterSoundFlags, enabled, staleTime: 30_000 });
  // The same cache entry as `useLetters`; the groups fall back to the tag when it fails.
  const letters = useQuery({ queryKey: ["letters"], queryFn: fetchLetters, enabled, staleTime: 30 * 60_000 });
  return { files, flags, letters: letters.data ?? NO_LETTERS };
}

export function useLetterCache(): LetterCache {
  const queryClient = useQueryClient();
  return React.useMemo<LetterCache>(
    () => ({
      setFlag: (assetId, flag) =>
        queryClient.setQueryData<LetterSoundFlag[]>(LETTER_SOUND_FLAGS_KEY, (old) => {
          const rest = (old ?? []).filter((f) => f.asset_id !== assetId);
          return flag ? [flag, ...rest] : rest;
        }),
    }),
    [queryClient],
  );
}
