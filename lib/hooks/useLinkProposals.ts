/**
 * Suggested links (Review's `link` lens): the proposals read, and the marks
 * Studio keeps itself, because the backend keeps no decision on a proposal.
 * Skipped proposals are remembered per staff member in this browser
 * (`lib/review/skippedLinks.ts`); approved ones are marked until the next
 * read drops them. Both live in the query cache, so a decision patches them
 * and its overlay goes when it lands, like every other source.
 */

import * as React from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { listWordProposals } from "@/lib/api/wordProposals";
import type { LinkMarks } from "@/lib/review/normalise/links";
import { loadSkippedLinks, saveSkippedLinks } from "@/lib/review/skippedLinks";
import { WORD_REVIEW_KEY } from "@/lib/hooks/useWordReviewQueue";

export const WORD_PROPOSALS_KEY = ["review", "word-proposals"] as const;
export const linkMarksKey = (userId: string | null) => ["review", "link-marks", userId ?? "anonymous"] as const;

interface StoredMarks {
  skipped: string[];
  applied: string[];
}

/** What a link decision writes. */
export interface LinkCache {
  setSkipped: (proposalId: string, skipped: boolean) => void;
  setApplied: (proposalId: string, applied: boolean) => void;
  /** After a connection write: the words, families, meanings and the Words page read again. */
  libraryChanged: () => Promise<void>;
}

export function useWordProposals(enabled: boolean) {
  return useQuery({ queryKey: WORD_PROPOSALS_KEY, queryFn: listWordProposals, enabled, staleTime: 5 * 60_000 });
}

export function useLinkMarks(userId: string | null, enabled: boolean): LinkMarks {
  const q = useQuery({
    queryKey: linkMarksKey(userId),
    queryFn: (): StoredMarks => ({ skipped: loadSkippedLinks(userId), applied: [] }),
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return React.useMemo(
    () => ({ skipped: new Set(q.data?.skipped ?? []), applied: new Set(q.data?.applied ?? []) }),
    [q.data],
  );
}

const LIBRARY_KEYS = [WORD_REVIEW_KEY, ["word-families"], ["concept-details"], ["word-family"], ["concept"], ["connections"]];

export function linkCache(qc: QueryClient, userId: string | null): LinkCache {
  const key = linkMarksKey(userId);
  const update = (fn: (m: StoredMarks) => StoredMarks) =>
    qc.setQueryData<StoredMarks>(key, (old) => fn(old ?? { skipped: loadSkippedLinks(userId), applied: [] }));
  const toggle = (list: string[], id: string, on: boolean) => (on ? Array.from(new Set([...list, id])) : list.filter((x) => x !== id));
  return {
    setSkipped: (id, on) =>
      update((m) => {
        const skipped = toggle(m.skipped, id, on);
        saveSkippedLinks(userId, skipped);
        return { ...m, skipped };
      }),
    setApplied: (id, on) => update((m) => ({ ...m, applied: toggle(m.applied, id, on) })),
    libraryChanged: async () => {
      await Promise.all(LIBRARY_KEYS.map((k) => qc.invalidateQueries({ queryKey: k })));
    },
  };
}

export function useLinkCache(userId: string | null): LinkCache {
  const qc = useQueryClient();
  return React.useMemo(() => linkCache(qc, userId), [qc, userId]);
}
