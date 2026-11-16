/**
 * Bulk approve (CW-10). Pure: the selection, and the run that sends one
 * decision at a time and reports progress and partial failure.
 *
 * Only bulk-safe items can be selected (`isBulkSafe`: unflagged, fully
 * vowelled spellings that wait, owner answer 8). Audio, drafts and phrases are
 * never bulk. Each item is still its own decision in the ledger, so it is
 * optimistic, undoable through its inverse route and reported on its own.
 *
 * The run does not wrap the decision's request; it watches the session: a
 * step is over when the item is no longer busy, and its outcome is read from
 * the session's error and the item's state. So it works with any `decide`.
 */

import { isBulkSafe as isSafeItem, type InboxItem, type InboxKind, type ItemState } from "./inbox";

/** The kinds bulk approve covers. Audio, drafts and phrases never join, whatever their normaliser says. */
export const BULK_KINDS: readonly InboxKind[] = ["spelling"];

/** Bulk-safe (`isBulkSafe`) and of a bulk kind. */
export const canBulk = (item: InboxItem): boolean => BULK_KINDS.includes(item.kind) && isSafeItem(item);
const isBulkSafe = canBulk;

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

/** `x`: adds or removes the item; anything not bulk-safe is left out. */
export function toggleChecked(checked: ReadonlySet<string>, item: InboxItem | null): ReadonlySet<string> {
  if (!item) return checked;
  const next = new Set(checked);
  if (next.has(item.key)) next.delete(item.key);
  else if (isBulkSafe(item)) next.add(item.key);
  else return checked;
  return next;
}

/** Drops keys whose item is gone or no longer bulk-safe (decided elsewhere, flagged, refetched). */
export function pruneChecked(checked: ReadonlySet<string>, items: readonly InboxItem[]): ReadonlySet<string> {
  if (checked.size === 0) return checked;
  const safe = new Set(items.filter(isBulkSafe).map((i) => i.key));
  const next = new Set(Array.from(checked).filter((k) => safe.has(k)));
  return next.size === checked.size ? checked : next;
}

/** The checked items that may be approved together, in list order. */
export function bulkTargets(list: readonly InboxItem[], checked: ReadonlySet<string>): InboxItem[] {
  return list.filter((i) => checked.has(i.key) && isBulkSafe(i));
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

export type BulkAction = "approve" | "withdraw";

export interface BulkFailure {
  key: string;
  title: string;
  reason: string;
}

export interface BulkRun {
  action: BulkAction;
  /** The state an item has once its decision has landed. */
  expect: ItemState;
  /** Keys still to send, in order. */
  queue: string[];
  /** The key being sent, and whether the session has shown it busy yet. */
  current: { key: string; seen: boolean } | null;
  total: number;
  done: string[];
  failed: BulkFailure[];
  /** Undone while sending, stopped, or gone from the list. */
  skipped: string[];
  /** Titles by key, for the report. */
  titles: Record<string, string>;
}

export function startRun(action: BulkAction, items: readonly InboxItem[]): BulkRun {
  return {
    action,
    expect: action === "approve" ? "approved" : "todo",
    queue: items.map((i) => i.key),
    current: null,
    total: items.length,
    done: [],
    failed: [],
    skipped: [],
    titles: Object.fromEntries(items.map((i) => [i.key, i.title])),
  };
}

export const isRunning = (run: BulkRun | null): boolean => !!run && (run.current !== null || run.queue.length > 0);

/** What the session says about one item. */
export interface ItemObservation {
  item: InboxItem | undefined;
  busy: boolean;
  error: string | undefined;
}

export type BulkStep =
  /** Send this key's decision now. */
  | { type: "send"; key: string; run: BulkRun }
  /** Nothing to do until the session changes. */
  | { type: "wait"; run: BulkRun }
  | { type: "finished"; run: BulkRun };

/**
 * One step of the run against the session as it is now. The caller calls
 * `decide` for a `send` step and stores the returned run either way.
 */
export function stepRun(run: BulkRun, observe: (key: string) => ItemObservation): BulkStep {
  let r = run;
  if (r.current) {
    const { key, seen } = r.current;
    const o = observe(key);
    if (o.busy) {
      if (!seen) r = { ...r, current: { key, seen: true } };
      return { type: "wait", run: r };
    }
    if (o.error) {
      r = { ...r, current: null, failed: [...r.failed, { key, title: r.titles[key] ?? key, reason: o.error }] };
    } else if (o.item && o.item.state === r.expect) {
      r = { ...r, current: null, done: [...r.done, key] };
    } else if (seen || !o.item) {
      r = { ...r, current: null, skipped: [...r.skipped, key] };
    } else {
      // Sent, but the session has not shown it yet.
      return { type: "wait", run: r };
    }
  }
  while (r.queue.length > 0) {
    const [key, ...rest] = r.queue;
    const o = observe(key);
    const ok = o.item && (r.action === "approve" ? isBulkSafe(o.item) : o.item.state === "approved") && !o.busy;
    if (!ok) {
      r = { ...r, queue: rest, skipped: [...r.skipped, key] };
      continue;
    }
    return { type: "send", key, run: { ...r, queue: rest, current: { key, seen: false } } };
  }
  return { type: "finished", run: r };
}

/** Stop: nothing new is sent; the decision in flight finishes. */
export function stopRun(run: BulkRun): BulkRun {
  return { ...run, queue: [], skipped: [...run.skipped, ...run.queue] };
}

/** How many have been answered (done, failed or skipped). */
export function answered(run: BulkRun): number {
  return run.done.length + run.failed.length + run.skipped.length;
}

/** "Approving 3 of 12" while it runs; "Approved 10 of 12. 2 failed." once it is over. */
export function runSummary(run: BulkRun): string {
  const verb = run.action === "approve" ? ["Approving", "Approved"] : ["Withdrawing", "Withdrew"];
  if (isRunning(run)) return `${verb[0]} ${Math.min(answered(run) + 1, run.total)} of ${run.total}...`;
  const parts = [`${verb[1]} ${run.done.length} of ${run.total}.`];
  if (run.failed.length) parts.push(`${run.failed.length} failed.`);
  if (run.skipped.length) parts.push(`${run.skipped.length} skipped.`);
  return parts.join(" ");
}
