/**
 * Drafted meanings and picture labels (Review's `meaning` and `label` lenses,
 * CM-DRAFTS): the drafts read, and the skips Studio keeps itself, because the
 * backend keeps no decision on a draft. Skipped drafts are remembered per
 * staff member in this browser (`lib/review/skippedLinks.ts`, scope
 * `drafts`). An approval patches the read's `applied`, so its overlay goes
 * when it lands; the next read confirms it from the library.
 */

import * as React from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { listContentDrafts, type ContentDrafts } from "@/lib/api/contentDrafts";
import type { DraftMarks } from "@/lib/review/normalise/drafts";
import { loadSkippedLinks, saveSkippedLinks } from "@/lib/review/skippedLinks";
import { WORD_REVIEW_KEY } from "@/lib/hooks/useWordReviewQueue";

export const CONTENT_DRAFTS_KEY = ["review", "content-drafts"] as const;
export const draftMarksKey = (userId: string | null) => ["review", "draft-marks", userId ?? "anonymous"] as const;

/** What a draft decision writes. */
export interface DraftCache {
  /** `key` is the item key (`meaning:<word id>`, `label:<asset id>`). */
  setSkipped: (key: string, skipped: boolean) => void;
  setApplied: (key: string, applied: boolean) => void;
  /** After a write: the drafts, words, families, meanings and the Words page read again. */
  libraryChanged: () => Promise<void>;
}

export function useContentDrafts(enabled: boolean) {
  return useQuery({ queryKey: CONTENT_DRAFTS_KEY, queryFn: listContentDrafts, enabled, staleTime: 5 * 60_000 });
}

export function useDraftMarks(userId: string | null, enabled: boolean): DraftMarks {
  const q = useQuery({
    queryKey: draftMarksKey(userId),
    queryFn: (): string[] => loadSkippedLinks(userId, undefined, "drafts"),
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return React.useMemo(() => ({ skipped: new Set(q.data ?? []) }), [q.data]);
}

const LIBRARY_KEYS = [
  CONTENT_DRAFTS_KEY,
  WORD_REVIEW_KEY,
  ["word-families"],
  ["concept-details"],
  ["word-family"],
  ["concept"],
  ["connections"],
];

export function draftCache(qc: QueryClient, userId: string | null): DraftCache {
  return {
    setSkipped: (key, on) =>
      qc.setQueryData<string[]>(draftMarksKey(userId), (old) => {
        const list = old ?? loadSkippedLinks(userId, undefined, "drafts");
        const next = on ? Array.from(new Set([...list, key])) : list.filter((x) => x !== key);
        saveSkippedLinks(userId, next, undefined, "drafts");
        return next;
      }),
    setApplied: (key, on) =>
      qc.setQueryData<ContentDrafts>(CONTENT_DRAFTS_KEY, (old) =>
        old
          ? {
              meanings: old.meanings.map((m) => (`meaning:${m.word_id}` === key ? { ...m, applied: on } : m)),
              pictures: old.pictures.map((p) => (`label:${p.asset_id}` === key ? { ...p, applied: on } : p)),
            }
          : old,
      ),
    libraryChanged: async () => {
      await Promise.all(LIBRARY_KEYS.map((k) => qc.invalidateQueries({ queryKey: k })));
    },
  };
}

export function useDraftCache(userId: string | null): DraftCache {
  const qc = useQueryClient();
  return React.useMemo(() => draftCache(qc, userId), [qc, userId]);
}
