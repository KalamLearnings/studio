/**
 * The Review sources of CW-7 and CW-8: AI drafts across every node (BE-1),
 * open word requests, and the phrase list with its audio summary (BE-2,
 * BE-5), which feeds both Phrases and Recordings. `useReviewInbox` merges
 * what this returns; the panes write the cache through `useDraftCache` and
 * `usePhraseCache`.
 *
 * The word-request and phrase keys are the old pages' keys, so a decision on
 * either page shows on the other.
 */

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { create } from "zustand";
import { listPendingDrafts, listWordRequests, type PendingDraftPage } from "@/lib/api/generation";
import { listPhrases } from "@/lib/api/phraseReview";
import { phraseAudioKey } from "./usePhraseAudio";
import type { WordRequest } from "@/lib/generation/drafts";
import type { DraftCache } from "@/lib/review/actions/drafts";
import type { PhraseCache } from "@/lib/review/actions/phrases";
import type { InboxItem, InboxKind } from "@/lib/review/inbox";
import {
  draftItems,
  phraseItems,
  recordingItems,
  requestItems,
  titleText,
  type InboxDraftRow,
  type InboxPhraseList,
} from "@/lib/review/normalise/sources";
import type { SourceState } from "./useReviewInbox";

/** Under the old drafts page's key prefix, so its actions refresh this list too. */
export const PENDING_DRAFTS_KEY = ["generation-drafts", "review-pending"] as const;
export const OPEN_WORD_REQUESTS_KEY = ["word-requests", "open"] as const;
export const PHRASES_KEY = ["reading-phrases"] as const;

/** Pages of 200, at most 5 (1,000 drafts); far more than wait at once. */
const DRAFT_PAGE = 200;
const DRAFT_PAGES = 5;

async function listAllPendingDrafts(): Promise<InboxDraftRow[]> {
  const out: InboxDraftRow[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < DRAFT_PAGES; i++) {
    const page: PendingDraftPage<InboxDraftRow> = await listPendingDrafts<InboxDraftRow>({ limit: DRAFT_PAGE, cursor });
    out.push(...(page.items ?? []));
    cursor = page.next_cursor ?? null;
    if (!cursor) break;
  }
  return out;
}

// ---- the drafts lens tools' filter -----------------------------------------------------

export interface DraftScope {
  curriculumId: string;
  nodeId: string;
  setCurriculum: (id: string) => void;
  setNode: (id: string) => void;
}

/** Every curriculum and node by default; the drafts lens tools narrow it. */
export const useDraftScope = create<DraftScope>((set) => ({
  curriculumId: "",
  nodeId: "",
  setCurriculum: (curriculumId) => set({ curriculumId, nodeId: "" }),
  setNode: (nodeId) => set({ nodeId }),
}));

export function inDraftScope(row: Pick<InboxDraftRow, "curriculum_id" | "node_id">, scope: Pick<DraftScope, "curriculumId" | "nodeId">) {
  if (scope.nodeId) return row.node_id === scope.nodeId;
  return !scope.curriculumId || row.curriculum_id === scope.curriculumId;
}

// ---- sources ----------------------------------------------------------------------------

const errorText = (e: unknown) => (e instanceof Error ? e.message : "unknown error");

function state(
  id: string,
  label: string,
  q: { isPending: boolean; isError: boolean; error: unknown; dataUpdatedAt: number; refetch: () => unknown },
): SourceState {
  return {
    id,
    label,
    status: q.isError ? "error" : q.isPending ? "loading" : "ready",
    error: q.isError ? errorText(q.error) : null,
    updatedAt: q.dataUpdatedAt,
    retry: () => void q.refetch(),
  };
}

export interface DraftPhraseSources {
  sources: SourceState[];
  items: InboxItem[];
  refetch: () => void;
}

export function useReviewDraftPhraseSources(kinds: readonly InboxKind[]): DraftPhraseSources {
  const wantsDrafts = kinds.includes("draft");
  const wantsRequests = kinds.includes("request");
  const wantsPhrase = kinds.includes("phrase");
  const wantsRecording = kinds.includes("recording");
  const wantsPhrases = wantsPhrase || wantsRecording;

  const drafts = useQuery({ queryKey: PENDING_DRAFTS_KEY, queryFn: listAllPendingDrafts, enabled: wantsDrafts, staleTime: 30_000 });
  const requests = useQuery({
    queryKey: OPEN_WORD_REQUESTS_KEY,
    queryFn: () => listWordRequests("open", 200),
    enabled: wantsRequests,
    staleTime: 30_000,
  });
  const phrases = useQuery({
    queryKey: PHRASES_KEY,
    queryFn: () => listPhrases() as Promise<InboxPhraseList>,
    enabled: wantsPhrases,
    staleTime: 30_000,
    // A take is made in the background; look again while one is.
    refetchInterval: (q) =>
      wantsRecording && (q.state.data as InboxPhraseList | undefined)?.approved.some((p) => p.audio?.state === "in_progress")
        ? 10_000
        : false,
  });
  const scope = useDraftScope();

  const sources = React.useMemo<SourceState[]>(() => {
    const out: SourceState[] = [];
    if (wantsDrafts) out.push(state("drafts", "AI drafts", drafts));
    if (wantsRequests) out.push(state("requests", "Word requests", requests));
    if (wantsPhrases) out.push(state("phrases", "Phrases and recordings", phrases));
    return out;
    // The query objects change identity on every render; their fields are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    wantsDrafts, wantsRequests, wantsPhrases,
    drafts.status, drafts.dataUpdatedAt, drafts.error,
    requests.status, requests.dataUpdatedAt, requests.error,
    phrases.status, phrases.dataUpdatedAt, phrases.error,
  ]);

  const items = React.useMemo<InboxItem[]>(() => {
    const out: InboxItem[] = [];
    const rows = (drafts.data ?? []) as InboxDraftRow[];
    const nodeTitles = new Map<string, string>();
    for (const d of rows) {
      const t = titleText(d.node_title);
      if (t) nodeTitles.set(d.node_id, t);
    }
    if (wantsDrafts) out.push(...draftItems(rows.filter((d) => inDraftScope(d, scope)), nodeTitles));
    if (wantsRequests && requests.data) out.push(...requestItems(requests.data, nodeTitles));
    if (phrases.data) {
      if (wantsPhrase) out.push(...phraseItems(phrases.data));
      if (wantsRecording) out.push(...recordingItems(phrases.data));
    }
    return out;
  }, [drafts.data, requests.data, phrases.data, wantsDrafts, wantsRequests, wantsPhrase, wantsRecording, scope]);

  const refetch = React.useCallback(() => {
    if (wantsDrafts) void drafts.refetch();
    if (wantsRequests) void requests.refetch();
    if (wantsPhrases) void phrases.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsDrafts, wantsRequests, wantsPhrases]);

  return { sources, items, refetch };
}

// ---- cache writers for the panes ------------------------------------------------------

export function useDraftCache(): DraftCache {
  const qc = useQueryClient();
  return React.useMemo<DraftCache>(
    () => ({
      patchDraft: (id, patch) =>
        qc.setQueryData<InboxDraftRow[]>(PENDING_DRAFTS_KEY, (old) => old?.map((d) => (d.id === id ? { ...d, ...patch } : d))),
      patchRequest: (id, patch) =>
        qc.setQueryData<WordRequest[]>(OPEN_WORD_REQUESTS_KEY, (old) => old?.map((r) => (r.id === id ? { ...r, ...patch } : r))),
    }),
    [qc],
  );
}

export function usePhraseCache(): PhraseCache {
  const qc = useQueryClient();
  return React.useMemo<PhraseCache>(
    () => ({
      updateList: (fn) => qc.setQueryData<InboxPhraseList>(PHRASES_KEY, (old) => (old ? fn(old) : old)),
      refreshList: () => qc.refetchQueries({ queryKey: PHRASES_KEY, exact: true }),
      refreshAudio: (phraseKey) => qc.refetchQueries({ queryKey: phraseAudioKey(phraseKey), exact: true }),
    }),
    [qc],
  );
}
