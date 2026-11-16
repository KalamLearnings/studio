/**
 * The decisions of the Spelling and Reading lenses (CW-5), as `DecisionSpec`s.
 *
 * Spellings: approve and withdraw (`PUT /words/:id/review`), the shared notes
 * Not a real word and Wrong harakat (`PUT/DELETE /words/:id/review-decision`),
 * and, for a spelling no activity uses, the respelling itself
 * (`PUT /words/:id/spelling`, owner answer 5). Readings: confirm and clear
 * (`PUT /words/:id/reads-as`). Every one but the respelling has an inverse
 * route, so Undo sends it; the respelling is held for 5 s instead.
 */

import { ApiError } from "@/lib/api/client";
import { changeWordSpelling, setWordReadsAs } from "@/lib/api/wordFamilies";
import { setWordReviewed } from "@/lib/api/wordReview";
import { clearReviewDecision, setReviewDecision } from "@/lib/api/wordReviewDecisions";
import { familyErrorText } from "@/lib/words/family";
import type { ReviewNote } from "@/lib/words/review/queue";
import { parseWordSpellingError } from "@/lib/words/spelling";
import type { ReadingItem, SpellingItem, BankWord } from "../normalise/words";
import type { InboxItem } from "../inbox";
import type { DecisionSpec } from "./types";

/** Cache writers `useReviewInbox` provides, so a decision leaves the cached rows as the server has them. */
export interface WordCache {
  patchWord: (wordId: string, patch: Partial<BankWord>) => void;
  setNote: (wordId: string, note: ReviewNote | null) => void;
}

const message = (e: unknown, fallback = "The request failed.") =>
  e instanceof Error && e.message ? e.message : fallback;

export function describeWordError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === "WORD_RETIRED") return "This word is retired, so it cannot be approved.";
    if (e.status === 403) return "Only staff can review words.";
    return familyErrorText(e.code, e.message);
  }
  return message(e);
}

export function describeRespellError(e: unknown): string {
  if (e instanceof ApiError) {
    const invalid = parseWordSpellingError(e);
    if (invalid) return invalid.messages.join(" ");
    if (e.code === "WORD_SPELLING_TAKEN") return "Another word already has this spelling.";
    if (e.code === "WORD_IN_USE") return "An activity uses this word now, so it cannot be respelled here. Save a note instead.";
    if (e.code === "WORD_HAS_BLEND") return "This word has a stored blend split, so its spelling cannot change here.";
  }
  return describeWordError(e);
}

function withState<I extends InboxItem>(state: InboxItem["state"]) {
  return (item: InboxItem) => ({ ...(item as I), state });
}

// ---- spellings ---------------------------------------------------------------------

export function approveSpelling(item: SpellingItem, cache: WordCache): DecisionSpec {
  const id = item.id;
  return {
    item,
    mode: "inverse",
    message: { text: "Approved:", arabic: item.title },
    optimistic: withState("approved"),
    run: async () => cache.patchWord(id, await setWordReviewed(id, true)),
    undo: async () => cache.patchWord(id, await setWordReviewed(id, false)),
    describeError: describeWordError,
  };
}

export function withdrawSpelling(item: SpellingItem, cache: WordCache): DecisionSpec {
  const id = item.id;
  return {
    item,
    mode: "inverse",
    message: { text: "Approval withdrawn:", arabic: item.title },
    optimistic: withState("todo"),
    run: async () => cache.patchWord(id, await setWordReviewed(id, false)),
    undo: async () => cache.patchWord(id, await setWordReviewed(id, true)),
    describeError: describeWordError,
    advance: false,
  };
}

function noteSpec(item: SpellingItem, note: ReviewNote, text: string, cache: WordCache): DecisionSpec {
  const id = item.id;
  const previous = item.data.note;
  return {
    item,
    mode: "inverse",
    message: { text, arabic: item.title },
    optimistic: (it) => {
      const s = it as SpellingItem;
      return { ...s, state: note.decision === "pseudo" ? "noted_pseudo" : "noted_wrong", data: { ...s.data, note } };
    },
    run: async () => cache.setNote(id, await setReviewDecision(note)),
    undo: async () => {
      if (previous) cache.setNote(id, await setReviewDecision(previous));
      else {
        await clearReviewDecision(id);
        cache.setNote(id, null);
      }
    },
    describeError: (e) => `The note was not saved: ${describeWordError(e)}`,
  };
}

export function noteNotReal(item: SpellingItem, cache: WordCache): DecisionSpec {
  return noteSpec(item, { wordId: item.id, decision: "pseudo" }, "Noted as not a real word:", cache);
}

export function noteWrongHarakat(item: SpellingItem, corrected: string, cache: WordCache): DecisionSpec {
  return noteSpec(item, { wordId: item.id, decision: "wrong", correctedSpelling: corrected }, `Noted: respell as ${corrected}`, cache);
}

export function clearSpellingNote(item: SpellingItem, cache: WordCache): DecisionSpec {
  const id = item.id;
  const previous = item.data.note;
  return {
    item,
    mode: "inverse",
    message: { text: "Note cleared:", arabic: item.title },
    optimistic: (it) => {
      const s = it as SpellingItem;
      return { ...s, state: s.data.row.reviewed ? "approved" : "todo", data: { ...s.data, note: null } };
    },
    run: async () => {
      await clearReviewDecision(id);
      cache.setNote(id, null);
    },
    undo: async () => {
      if (previous) cache.setNote(id, await setReviewDecision(previous));
    },
    describeError: (e) => `The note was not cleared: ${describeWordError(e)}`,
    advance: false,
  };
}

/**
 * Wrong harakat on a spelling no activity uses: the row is respelled (held
 * 5 s so Undo cancels it). It stays in the queue under its new spelling, not
 * reviewed yet, so the reviewer can approve it next.
 */
export function respellSpelling(item: SpellingItem, corrected: string, cache: WordCache): DecisionSpec {
  const id = item.id;
  return {
    item,
    mode: "hold",
    message: { text: "Respelling as", arabic: corrected },
    optimistic: (it) => {
      const s = it as SpellingItem;
      return {
        ...s,
        title: corrected,
        state: "todo",
        data: { ...s.data, row: { ...s.data.row, reviewed: false, word: { ...s.data.row.word, arabic: corrected } } },
      };
    },
    run: async () => cache.patchWord(id, await changeWordSpelling(id, corrected)),
    describeError: (e) => `The spelling was not changed: ${describeRespellError(e)}`,
    advance: false,
  };
}

// ---- readings ----------------------------------------------------------------------

export function confirmReading(item: ReadingItem, target: BankWord, cache: WordCache): DecisionSpec {
  const id = item.id;
  const previous = item.data.word.reads_as_id ?? null;
  return {
    item,
    mode: "inverse",
    message: { text: `Reading confirmed: ${item.title} reads as`, arabic: target.arabic },
    optimistic: (it) => {
      const r = it as ReadingItem;
      return { ...r, state: "approved", data: { ...r.data, readsAs: target } };
    },
    run: async () => cache.patchWord(id, { reads_as_id: (await setWordReadsAs(id, target.id)).reads_as_id }),
    undo: async () => cache.patchWord(id, { reads_as_id: (await setWordReadsAs(id, previous)).reads_as_id }),
    describeError: describeWordError,
  };
}

export function clearReading(item: ReadingItem, cache: WordCache): DecisionSpec {
  const id = item.id;
  const previous = item.data.word.reads_as_id ?? null;
  return {
    item,
    mode: "inverse",
    message: { text: "Reading cleared:", arabic: item.title },
    optimistic: (it) => {
      const r = it as ReadingItem;
      return { ...r, state: "todo", data: { ...r.data, readsAs: null } };
    },
    run: async () => cache.patchWord(id, { reads_as_id: (await setWordReadsAs(id, null)).reads_as_id }),
    undo: async () => cache.patchWord(id, { reads_as_id: (await setWordReadsAs(id, previous)).reads_as_id }),
    describeError: describeWordError,
    advance: false,
  };
}
