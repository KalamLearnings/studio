/**
 * The reviewer's pseudo / wrong-spelling notes, kept in this browser until
 * they are exported (the backend has no route that applies them; see queue.ts).
 * Storage can be missing or throw (private window), so every access is guarded.
 */

import type { ReviewNote } from "./queue";

const KEY = "studio.wordReview.notes.v1";

export function parseNotes(raw: string | null): ReviewNote[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v.filter(
      (n): n is ReviewNote =>
        !!n && typeof n.wordId === "string" && (n.decision === "pseudo" || n.decision === "wrong"),
    );
  } catch {
    return [];
  }
}

export function loadNotes(): ReviewNote[] {
  try {
    return parseNotes(globalThis.localStorage?.getItem(KEY) ?? null);
  } catch {
    return [];
  }
}

export function saveNotes(notes: readonly ReviewNote[]): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(notes));
  } catch {
    /* kept in memory only */
  }
}

/** Replace the word's note, or remove it when `note` is null. */
export function withNote(notes: readonly ReviewNote[], wordId: string, note: ReviewNote | null): ReviewNote[] {
  const rest = notes.filter((n) => n.wordId !== wordId);
  return note ? [...rest, note] : rest;
}
