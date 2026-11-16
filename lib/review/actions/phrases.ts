/**
 * The decisions of the Phrases and Recordings lenses (CW-8), as
 * `DecisionSpec`s. All need a phrase reviewer or a curriculum lead (the
 * server checks).
 *
 * Phrases have inverse routes, so Undo sends them: approve and revoke
 * (`POST /approvals`, `DELETE /approvals/:key`), reject and clear the
 * rejection (BE-5, `POST /:key/reject`, `DELETE /:key/rejection`).
 * A take review has none (CM-S14), so approve and reject take are held 5 s.
 * After a take decision the list and the take read are fetched again: the
 * server works out which take is served.
 */

import {
  approvePhrase,
  approvePhraseTake,
  clearPhraseRejection,
  rejectPhrase,
  rejectPhraseTake,
  revokePhrase,
} from "@/lib/api/phraseReview";
import { phraseAudioErrorText, type PhraseRejectReason } from "@/lib/phrases/phraseAudio";
import { phraseReviewErrorText, type PhraseRejectionBody } from "@/lib/phrases/phraseReview";
import type { InboxPhraseList, PhraseItem, PhraseRejection, RecordingItem } from "../normalise/sources";
import { withApproved, withPending, withRejected } from "./phraseList";
import type { DecisionSpec } from "./types";

/** Cache writers for the phrase list (`usePhraseSources`). */
export interface PhraseCache {
  updateList: (fn: (list: InboxPhraseList) => InboxPhraseList) => void;
  /** Reads the list again; resolves once the answer is in the cache. */
  refreshList: () => Promise<void>;
  /** Reads one phrase's takes again (`GET .../:key/audio`). */
  refreshAudio: (phraseKey: string) => Promise<void>;
}

const nowIso = () => new Date().toISOString();

// ---- phrases ---------------------------------------------------------------------

export function approvePhraseSpec(item: PhraseItem, cache: PhraseCache, userId: string | null): DecisionSpec {
  const entry = item.data;
  return {
    item,
    mode: "inverse",
    message: { text: `${entry.is_sentence ? "Sentence" : "Phrase"} approved:`, arabic: item.title },
    optimistic: (it) => ({ ...(it as PhraseItem), state: "approved", decidedAt: nowIso(), decidedBy: userId }),
    run: async () => {
      const answer = await approvePhrase(entry);
      cache.updateList((l) => withApproved(l, entry, answer));
    },
    undo: async () => {
      await revokePhrase(entry.phrase_key);
      cache.updateList((l) => withPending(l, entry));
    },
    describeError: phraseReviewErrorText,
  };
}

export function revokePhraseSpec(item: PhraseItem, cache: PhraseCache): DecisionSpec {
  const entry = item.data;
  return {
    item,
    mode: "inverse",
    message: { text: "Approval revoked:", arabic: item.title },
    optimistic: (it) => ({ ...(it as PhraseItem), state: "todo", decidedAt: null, decidedBy: null }),
    run: async () => {
      await revokePhrase(entry.phrase_key);
      cache.updateList((l) => withPending(l, entry));
    },
    undo: async () => {
      const answer = await approvePhrase(entry);
      cache.updateList((l) => withApproved(l, entry, answer));
    },
    describeError: phraseReviewErrorText,
    advance: false,
  };
}

export function rejectPhraseSpec(item: PhraseItem, body: PhraseRejectionBody, cache: PhraseCache, userId: string | null): DecisionSpec {
  const entry = item.data;
  const local: PhraseRejection = { reason: body.reason, note: body.note ?? null, reviewed_by: userId, reviewed_at: nowIso() };
  return {
    item,
    mode: "inverse",
    message: { text: `${entry.is_sentence ? "Sentence" : "Phrase"} rejected:`, arabic: item.title },
    optimistic: (it) => {
      const p = it as PhraseItem;
      return { ...p, state: "rejected", decidedAt: local.reviewed_at, decidedBy: userId, data: { ...p.data, rejection: local } };
    },
    run: async () => {
      const answer = await rejectPhrase(entry.phrase_key, body);
      cache.updateList((l) => withRejected(l, entry, local, answer));
    },
    undo: async () => {
      await clearPhraseRejection(entry.phrase_key);
      cache.updateList((l) => withPending(l, entry));
    },
    describeError: phraseReviewErrorText,
  };
}

export function clearRejectionSpec(item: PhraseItem, cache: PhraseCache): DecisionSpec {
  const entry = item.data;
  const previous = entry.rejection;
  return {
    item,
    mode: "inverse",
    message: { text: "Rejection cleared:", arabic: item.title },
    optimistic: (it) => {
      const p = it as PhraseItem;
      return { ...p, state: "todo", decidedAt: null, decidedBy: null, data: { ...p.data, rejection: null } };
    },
    run: async () => {
      await clearPhraseRejection(entry.phrase_key);
      cache.updateList((l) => withPending(l, entry));
    },
    undo: async () => {
      if (!previous) return;
      const body = { reason: previous.reason, ...(previous.note ? { note: previous.note } : {}) } as PhraseRejectionBody;
      const answer = await rejectPhrase(entry.phrase_key, body);
      cache.updateList((l) => withRejected(l, entry, previous, answer));
    },
    describeError: phraseReviewErrorText,
    advance: false,
  };
}

// ---- recordings --------------------------------------------------------------------

async function refreshAfterTake(cache: PhraseCache, phraseKey: string) {
  await Promise.all([cache.refreshList(), cache.refreshAudio(phraseKey)]);
}

export function approveTakeSpec(item: RecordingItem, takeId: string, cache: PhraseCache): DecisionSpec {
  const key = item.id;
  return {
    item,
    mode: "hold",
    message: { text: "Take approved; children hear it now:", arabic: item.title },
    optimistic: (it) => {
      const r = it as RecordingItem;
      return {
        ...r,
        state: "approved",
        decidedAt: nowIso(),
        data: { ...r.data, audio: { state: "served", served_take_id: takeId, needs_review_take_id: null } },
      };
    },
    run: async () => {
      await approvePhraseTake(takeId);
      await refreshAfterTake(cache, key);
    },
    describeError: phraseAudioErrorText,
  };
}

export function rejectTakeSpec(
  item: RecordingItem,
  takeId: string,
  body: { reason: PhraseRejectReason; note?: string },
  cache: PhraseCache,
): DecisionSpec {
  const key = item.id;
  return {
    item,
    mode: "hold",
    message: { text: "Take rejected:", arabic: item.title },
    optimistic: (it) => {
      const r = it as RecordingItem;
      const served = r.data.audio.served_take_id && r.data.audio.served_take_id !== takeId ? r.data.audio.served_take_id : null;
      return {
        ...r,
        state: "rejected",
        decidedAt: nowIso(),
        data: { ...r.data, audio: { state: served ? "served" : "none", served_take_id: served, needs_review_take_id: null } },
      };
    },
    run: async () => {
      await rejectPhraseTake(takeId, body);
      await refreshAfterTake(cache, key);
    },
    describeError: phraseAudioErrorText,
  };
}
