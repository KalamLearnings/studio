/**
 * What a pane hands `useReviewInbox().decide` (CW-3). A lens builds these in
 * its own `actions` module; the hook applies `optimistic` at once, sends `run`
 * through the decision ledger (now, or after the 5 s hold), offers Undo, and
 * shows `describeError(e)` where the reviewer acted when the server refuses.
 */

import type { InboxItem } from "../inbox";
import type { DecisionMode } from "../decisions";

export interface DecisionSpec {
  item: InboxItem;
  mode: DecisionMode;
  /** The toast: plain text, with the Arabic it is about shown after it. */
  message: { text: string; arabic?: string };
  /** The item as it looks once decided; shown until the server answers. */
  optimistic: (item: InboxItem) => InboxItem;
  /** Sends the decision and patches the cached source rows with the answer. */
  run: () => Promise<void>;
  /** The inverse route (inverse decisions). Patches the cache back. */
  undo?: () => Promise<void>;
  /** A server refusal in plain words. */
  describeError: (e: unknown) => string;
  /** Open the next item that waits once this one is decided (default true). */
  advance?: boolean;
  /** No toast for this decision (a bulk run reports its items itself, CW-10). */
  quiet?: boolean;
}
