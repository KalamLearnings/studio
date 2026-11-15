/**
 * The reviewer's pseudo / wrong-spelling notes. They live on the server (the
 * `words` function, `lib/api/wordReviewDecisions.ts`) so reviewers share them;
 * the CSV export in queue.ts stays. The backend applies nothing (see queue.ts).
 *
 * Before the server held them they were kept in this browser's localStorage.
 * That key is still read, once: notes the server does not have are uploaded,
 * and the key is removed only after every upload succeeded. A note that could
 * not be uploaded stays under the key and on screen, so none is ever lost.
 * Storage can be missing or throw (private window), so every access is guarded.
 */

import type { ReviewNote } from "./queue";

/** The old browser-only key; read until its notes are on the server. */
const LEGACY_KEY = "studio.wordReview.notes.v1";

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

/** The notes still in the old browser-only key. */
export function loadLegacyNotes(): ReviewNote[] {
  try {
    return parseNotes(globalThis.localStorage?.getItem(LEGACY_KEY) ?? null);
  } catch {
    return [];
  }
}

/** Keeps only `pending` under the old key, or removes the key when nothing is pending. */
function writeLegacyNotes(pending: readonly ReviewNote[]): void {
  try {
    if (pending.length === 0) globalThis.localStorage?.removeItem(LEGACY_KEY);
    else globalThis.localStorage?.setItem(LEGACY_KEY, JSON.stringify(pending));
  } catch {
    /* the old key stays as it was */
  }
}

/**
 * Merges the server's notes with the old browser notes. Local notes for words
 * the server has no note for are uploaded (the server's note wins when both
 * have one). Returns every note to show, and the local notes whose upload
 * failed (kept in the old key, and shown, until a later load uploads them).
 */
export async function reconcileNotes(opts: {
  server: readonly ReviewNote[];
  local: readonly ReviewNote[];
  upload: (note: ReviewNote) => Promise<ReviewNote>;
}): Promise<{ notes: ReviewNote[]; pending: ReviewNote[] }> {
  const onServer = new Set(opts.server.map((n) => n.wordId));
  const seen = new Set<string>();
  const toUpload = opts.local.filter((n) => {
    if (onServer.has(n.wordId) || seen.has(n.wordId)) return false;
    seen.add(n.wordId);
    return true;
  });
  const uploaded: ReviewNote[] = [];
  const pending: ReviewNote[] = [];
  for (const note of toUpload) {
    try {
      uploaded.push(await opts.upload(note));
    } catch {
      pending.push(note);
    }
  }
  return { notes: [...opts.server, ...uploaded, ...pending], pending };
}

/**
 * Loads the shared notes, uploading any left in the old browser key first.
 * Rejects when the server list cannot be read (nothing is touched then).
 */
export async function loadNotes(): Promise<ReviewNote[]> {
  // Imported here so the pure helpers above stay testable without the Supabase client.
  const { listReviewDecisions, setReviewDecision } = await import("@/lib/api/wordReviewDecisions");
  const server = await listReviewDecisions();
  const local = loadLegacyNotes();
  if (local.length === 0) return server;
  const { notes, pending } = await reconcileNotes({ server, local, upload: setReviewDecision });
  // Notes the server already had are safe there; only failed uploads stay local.
  writeLegacyNotes(pending);
  return notes;
}

/** Replace the word's note, or remove it when `note` is null. */
export function withNote(notes: readonly ReviewNote[], wordId: string, note: ReviewNote | null): ReviewNote[] {
  const rest = notes.filter((n) => n.wordId !== wordId);
  return note ? [...rest, note] : rest;
}
