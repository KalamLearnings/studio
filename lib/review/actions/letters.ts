/**
 * The decisions of the Letter sounds lens (CW-11), as `DecisionSpec`s: flag a
 * file (`PUT /assets/:assetId/review-flag`) and clear the flag (`DELETE`).
 * Each is the other's inverse, so both are sent at once and Undo sends the
 * inverse (no 5 s hold). Neither opens the next item: the reviewer keeps
 * listening and moves on with `j`.
 */

import { ApiError } from "@/lib/api/client";
import { clearLetterSoundFlag, flagLetterSound } from "@/lib/api/assets";
import { LETTER_FLAG_LABELS, withLetterFlag, type LetterFlagInput, type LetterItem, type LetterSoundFlag } from "../normalise/letters";
import type { InboxItem } from "../inbox";
import type { DecisionSpec } from "./types";

/** Writes the flag list cache, so a decision leaves it as the server has it. */
export interface LetterCache {
  setFlag: (assetId: string, flag: LetterSoundFlag | null) => void;
}

export function describeLetterError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 403) return "Only a phrase reviewer or a curriculum lead can flag a letter sound.";
    if (e.code === "NOT_A_LETTER_SOUND") return "This file is not in the letter sounds category, so it cannot be flagged here.";
    if (e.status === 404) return "The file or its flag is gone. It may have been cleared or removed; the list reloads.";
    if (e.status === 400) return e.message ? `The flag was refused: ${e.message}` : "The flag was refused.";
  }
  return e instanceof Error && e.message ? e.message : "The request failed.";
}

const inputOf = (flag: LetterSoundFlag): LetterFlagInput => (flag.note ? { reason: flag.reason, note: flag.note } : { reason: flag.reason });

async function setFlag(id: string, input: LetterFlagInput, cache: LetterCache) {
  const saved = await flagLetterSound(id, input);
  cache.setFlag(id, { ...saved, asset: saved.asset ?? null });
}

async function clearFlag(id: string, cache: LetterCache) {
  await clearLetterSoundFlag(id);
  cache.setFlag(id, null);
}

export function flagLetterSpec(item: LetterItem, input: LetterFlagInput, userId: string | null, cache: LetterCache): DecisionSpec {
  const id = item.id;
  const previous = item.data.flag;
  const flag: LetterSoundFlag = {
    asset_id: id,
    reason: input.reason,
    note: input.note ?? null,
    flagged_by: userId ?? "",
    flagged_at: new Date().toISOString(),
    cleared_by: null,
    cleared_at: null,
  };
  return {
    item,
    mode: "inverse",
    message: { text: `Flagged (${LETTER_FLAG_LABELS[input.reason]}):`, arabic: item.title },
    optimistic: (it: InboxItem) => withLetterFlag(it as LetterItem, flag),
    run: () => setFlag(id, input, cache),
    undo: () => (previous ? setFlag(id, inputOf(previous), cache) : clearFlag(id, cache)),
    describeError: (e) => `The flag was not saved: ${describeLetterError(e)}`,
    advance: false,
  };
}

export function clearLetterFlagSpec(item: LetterItem, cache: LetterCache): DecisionSpec {
  const id = item.id;
  const previous = item.data.flag;
  return {
    item,
    mode: "inverse",
    message: { text: "Flag cleared:", arabic: item.title },
    optimistic: (it: InboxItem) => withLetterFlag(it as LetterItem, null),
    run: () => clearFlag(id, cache),
    undo: async () => {
      if (previous) await setFlag(id, inputOf(previous), cache);
    },
    describeError: (e) => `The flag was not cleared: ${describeLetterError(e)}`,
    advance: false,
  };
}
