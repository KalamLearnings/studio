/**
 * The decisions of the AI drafts and word requests lenses (CW-7), as
 * `DecisionSpec`s. None has an inverse route (a rejected draft cannot be
 * approved, a fulfilled request cannot be reopened), so each is held for 5 s
 * and Undo cancels it before it is sent. Approve and reject need a curriculum
 * lead (the server checks); fulfil and decline are any staff member.
 */

import { approveDraft, declineWordRequest, fulfilWordRequest, rejectDraft } from "@/lib/api/generation";
import { describeGenerationError, type WordRequest } from "@/lib/generation/drafts";
import type { DraftItem, InboxDraftRow, RequestItem } from "../normalise/sources";
import type { DecisionSpec } from "./types";

/** Cache writers for the drafts and word-request sources (`useDraftSources`). */
export interface DraftCache {
  patchDraft: (id: string, patch: Partial<InboxDraftRow>) => void;
  patchRequest: (id: string, patch: Partial<WordRequest>) => void;
}

const nowIso = () => new Date().toISOString();

export function approveDraftSpec(item: DraftItem, cache: DraftCache, userId: string | null): DecisionSpec {
  const id = item.id;
  return {
    item,
    mode: "hold",
    message: { text: `Draft approved: ${item.title}. Publish it from the builder as usual.` },
    optimistic: (it) => {
      const d = it as DraftItem;
      const at = nowIso();
      return { ...d, state: "approved", decidedAt: at, decidedBy: userId, data: { ...d.data, approved_by: userId ?? "you", approved_at: at } };
    },
    run: async () => cache.patchDraft(id, await approveDraft(id)),
    describeError: describeGenerationError,
  };
}

export function rejectDraftSpec(item: DraftItem, reason: string, cache: DraftCache, userId: string | null): DecisionSpec {
  const id = item.id;
  const why = reason.trim() || undefined;
  return {
    item,
    mode: "hold",
    message: { text: `Draft rejected: ${item.title}` },
    optimistic: (it) => {
      const d = it as DraftItem;
      const at = nowIso();
      const provenance = d.data.provenance
        ? { ...d.data.provenance, review: { decision: "rejected" as const, by: userId ?? "", at, reason: why ?? null } }
        : d.data.provenance;
      return { ...d, state: "rejected", decidedAt: at, decidedBy: userId, data: { ...d.data, provenance } };
    },
    run: async () => cache.patchDraft(id, await rejectDraft(id, why)),
    describeError: describeGenerationError,
  };
}

export function fulfilRequestSpec(item: RequestItem, word: { id: string; arabic: string }, cache: DraftCache): DecisionSpec {
  const id = item.id;
  return {
    item,
    mode: "hold",
    message: { text: "Request fulfilled with", arabic: word.arabic },
    optimistic: (it) => {
      const r = it as RequestItem;
      return { ...r, state: "approved", decidedAt: nowIso(), data: { ...r.data, status: "fulfilled", fulfilled_word_id: word.id } };
    },
    run: async () => cache.patchRequest(id, await fulfilWordRequest(id, word.id)),
    describeError: describeGenerationError,
  };
}

export function declineRequestSpec(item: RequestItem, reason: string, cache: DraftCache): DecisionSpec {
  const id = item.id;
  const why = reason.trim() || undefined;
  return {
    item,
    mode: "hold",
    message: { text: `Request declined: ${item.title}` },
    optimistic: (it) => {
      const r = it as RequestItem;
      return { ...r, state: "rejected", decidedAt: nowIso(), data: { ...r.data, status: "declined", decline_reason: why ?? null } };
    },
    run: async () => cache.patchRequest(id, await declineWordRequest(id, why)),
    describeError: describeGenerationError,
  };
}
