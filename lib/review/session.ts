/**
 * The optimistic side of Review's decisions (CW-3). Pure: `useReviewInbox`
 * keeps one `InboxSession` and folds the ledger's status changes into it.
 *
 * A decision shows at once (its overlay transforms the item), stays shown
 * while it is held or sent, and its overlay goes when the server answers: on
 * success the cached rows already carry the answer, on failure the item
 * returns to what the server has and the error shows where the reviewer acted.
 */

import type { Decision, DecisionStatus } from "./decisions";
import type { InboxItem } from "./inbox";

export interface Overlay {
  decisionId: number;
  itemKey: string;
  transform: (item: InboxItem) => InboxItem;
}

export interface InboxSession {
  overlays: readonly Overlay[];
  /** The last refusal per item, in plain words. */
  errors: Readonly<Record<string, string>>;
  /** Items decided in this session (Decided by me). */
  decidedHere: ReadonlySet<string>;
  /** Items with a decision held, being sent or being undone: the pane takes no new decision on them. */
  busy: Readonly<Record<string, DecisionStatus>>;
}

export const EMPTY_SESSION: InboxSession = { overlays: [], errors: {}, decidedHere: new Set(), busy: {} };

const without = <T extends Record<string, unknown>>(o: T, key: string): T => {
  if (!(key in o)) return o;
  const next = { ...o };
  delete next[key];
  return next;
};

export function sessionSubmitted(
  s: InboxSession,
  d: Pick<Decision, "id" | "itemKey" | "status">,
  transform: Overlay["transform"],
): InboxSession {
  const decidedHere = new Set(s.decidedHere);
  decidedHere.add(d.itemKey);
  return {
    overlays: [...s.overlays, { decisionId: d.id, itemKey: d.itemKey, transform }],
    errors: without(s.errors, d.itemKey),
    decidedHere,
    busy: { ...s.busy, [d.itemKey]: d.status },
  };
}

export function sessionChanged(
  s: InboxSession,
  d: Pick<Decision, "id" | "itemKey" | "status" | "error">,
  describeError: (e: unknown) => string,
): InboxSession {
  const dropOverlay = () => s.overlays.filter((o) => o.decisionId !== d.id);
  const forget = () => {
    const next = new Set(s.decidedHere);
    next.delete(d.itemKey);
    return next;
  };
  switch (d.status) {
    case "held":
    case "sending":
      return { ...s, busy: { ...s.busy, [d.itemKey]: d.status } };
    case "done":
      return { ...s, overlays: dropOverlay(), busy: without(s.busy, d.itemKey) };
    case "failed":
      return {
        overlays: dropOverlay(),
        errors: { ...s.errors, [d.itemKey]: describeError(d.error) },
        decidedHere: forget(),
        busy: without(s.busy, d.itemKey),
      };
    case "cancelled":
      return { ...s, overlays: dropOverlay(), decidedHere: forget(), busy: without(s.busy, d.itemKey) };
    case "undoing":
      // Shown as undone at once; the inverse route patches the cache when it lands.
      return { ...s, overlays: dropOverlay(), busy: { ...s.busy, [d.itemKey]: "undoing" } };
    case "undone":
      return { ...s, decidedHere: forget(), busy: without(s.busy, d.itemKey) };
    case "undo_failed":
      return {
        ...s,
        errors: { ...s.errors, [d.itemKey]: `Undo failed: ${describeError(d.error)}` },
        busy: without(s.busy, d.itemKey),
      };
  }
}

export function clearSessionError(s: InboxSession, itemKey: string): InboxSession {
  return { ...s, errors: without(s.errors, itemKey) };
}

/** The items as the reviewer should see them, every open decision applied in order. */
export function applyOverlays<I extends InboxItem>(items: readonly I[], overlays: readonly Overlay[]): I[] {
  if (overlays.length === 0) return items as I[];
  const byKey = new Map<string, Overlay[]>();
  for (const o of overlays) byKey.set(o.itemKey, [...(byKey.get(o.itemKey) ?? []), o]);
  return items.map((it) => {
    const list = byKey.get(it.key);
    return list ? (list.reduce<InboxItem>((acc, o) => o.transform(acc), it) as I) : it;
  });
}
