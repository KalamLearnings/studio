/**
 * The Suggested links a reviewer skipped, kept in this browser per staff
 * member: the backend has no dismiss, so a skipped proposal comes back on
 * every read. Storage can be missing or throw (private windows, blocked site
 * data); then nothing is remembered and every proposal shows. Pure apart from
 * the storage it is given.
 */

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

export const skippedLinksKey = (userId: string | null) => `studio.review.skipped-links.${userId ?? "anonymous"}`;

function storage(given?: KeyValueStorage | null): KeyValueStorage | null {
  if (given !== undefined) return given;
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadSkippedLinks(userId: string | null, given?: KeyValueStorage | null): string[] {
  try {
    const raw = storage(given)?.getItem(skippedLinksKey(userId));
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function saveSkippedLinks(userId: string | null, ids: readonly string[], given?: KeyValueStorage | null): void {
  try {
    storage(given)?.setItem(skippedLinksKey(userId), JSON.stringify(Array.from(new Set(ids))));
  } catch {
    // Not remembered: the proposal shows again next time.
  }
}
