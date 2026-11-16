/**
 * How a phrase decision changes the cached phrase list (`GET
 * /curriculum/reading/phrases`, BE-2 and BE-5), so the overlay can go when the
 * server answers. Pure. A phrase key sits in one section at a time: pending,
 * approved or rejected (the server keys a rejection by the key, whatever the
 * phrase or sentence flag).
 */

import type { InboxPhraseEntry, InboxPhraseList, PhraseRejection } from "../normalise/sources";

function without(list: InboxPhraseList, key: string): InboxPhraseList {
  const keep = (e: InboxPhraseEntry) => e.phrase_key !== key;
  return {
    ...list,
    pending: list.pending.filter(keep),
    approved: list.approved.filter(keep),
    rejected: list.rejected ? list.rejected.filter(keep) : list.rejected,
  };
}

/** Approved: the server's entry over ours; its audio starts at nothing until the list is read again. */
export function withApproved(list: InboxPhraseList, entry: InboxPhraseEntry, answer?: Partial<InboxPhraseEntry>): InboxPhraseList {
  const next = without(list, entry.phrase_key);
  const approved: InboxPhraseEntry = {
    ...entry,
    ...answer,
    reason: null,
    rejection: null,
    audio: answer?.audio ?? entry.audio ?? { state: "none" },
  };
  return { ...next, approved: [...next.approved, approved] };
}

/** Pending again (a revoke, or a rejection cleared): not reviewed, no audio. */
export function withPending(list: InboxPhraseList, entry: InboxPhraseEntry): InboxPhraseList {
  const next = without(list, entry.phrase_key);
  const pending: InboxPhraseEntry = { ...entry, reason: "unreviewed", approval: null, rejection: null, audio: null };
  return { ...next, pending: [...next.pending, pending] };
}

/** Rejected, with the server's rejection when it sent one. */
export function withRejected(
  list: InboxPhraseList,
  entry: InboxPhraseEntry,
  rejection: PhraseRejection,
  answer?: Partial<InboxPhraseEntry>,
): InboxPhraseList {
  const next = without(list, entry.phrase_key);
  const rejected: InboxPhraseEntry = {
    ...entry,
    ...answer,
    reason: null,
    approval: null,
    audio: null,
    rejection: answer?.rejection ?? rejection,
  };
  return { ...next, rejected: [...(next.rejected ?? []), rejected] };
}
