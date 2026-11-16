"use client";

/**
 * Bulk approve (CW-10): the checked rows, and the run that approves them one
 * at a time (a spelling's `PUT /words/:id/review`, a suggested family's link ops) through the inbox's own `decide`, so each
 * is optimistic, has its own error, and is undone through its inverse route.
 * The pure rules are in `lib/review/bulk.ts`.
 */

import * as React from "react";
import type { ReviewInbox } from "@/lib/hooks/useReviewInbox";
import { approveSpelling, withdrawSpelling } from "@/lib/review/actions/words";
import { approveLink, withdrawLink } from "@/lib/review/actions/links";
import type { DecisionSpec } from "@/lib/review/actions/types";
import { useLinkCache, type LinkCache } from "@/lib/hooks/useLinkProposals";
import type { ReviewBank } from "@/lib/hooks/useReviewInbox";
import { planFamilyProposal } from "@/lib/review/linkPlans";
import type { LinkItem } from "@/lib/review/normalise/links";
import {
  bulkTargets,
  isRunning,
  pruneChecked,
  startRun,
  stepRun,
  stopRun,
  toggleChecked,
  type BulkAction,
  type BulkRun,
} from "@/lib/review/bulk";
import type { InboxItem } from "@/lib/review/inbox";
import type { SpellingItem } from "@/lib/review/normalise/words";

export interface BulkApprove {
  checked: ReadonlySet<string>;
  run: BulkRun | null;
  running: boolean;
  /** `x` and the row checkbox. */
  toggle: (item: InboxItem | null) => void;
  clear: () => void;
  /** Shift+A: approves the checked rows of `list` (in its order). Returns the keys it will send. */
  approve: (list: readonly InboxItem[]) => string[];
  /** Withdraws every approval the last run made, one at a time. */
  undoAll: () => void;
  stop: () => void;
  dismiss: () => void;
}

/** One item's bulk decision: a spelling's approval, or a family link's connection. */
function bulkSpec(action: BulkAction, item: InboxItem, inbox: Pick<ReviewInbox, "wordCache" | "bank">, links: LinkCache): DecisionSpec {
  if (item.kind === "link") {
    const link = item as LinkItem;
    if (action === "withdraw") return withdrawLink(link, links);
    if (link.data.type !== "family") throw new Error("Picture links are never approved in bulk.");
    const bank: ReviewBank = inbox.bank;
    const words = (id: string) => {
      const w = bank.wordsById.get(id);
      return w ? { familyId: w.family_id ?? null, readsAsId: w.reads_as_id ?? null } : undefined;
    };
    const plan = planFamilyProposal(link.data.proposal, words, bank.familiesById);
    if (plan.ok) return approveLink(link, plan.ops, links);
    // Sent anyway, so the run reports the reason against this item.
    return { ...approveLink(link, [], links), run: async () => Promise.reject(new Error(plan.reason)) };
  }
  const word = item as SpellingItem;
  return action === "approve" ? approveSpelling(word, inbox.wordCache) : withdrawSpelling(word, inbox.wordCache);
}

export function useBulkApprove(inbox: Pick<ReviewInbox, "items" | "session" | "decide" | "wordCache" | "bank" | "userId">): BulkApprove {
  const links = useLinkCache(inbox.userId);
  const [rawChecked, setChecked] = React.useState<ReadonlySet<string>>(() => new Set());
  const [run, setRun] = React.useState<BulkRun | null>(null);
  const checked = React.useMemo(() => pruneChecked(rawChecked, inbox.items), [rawChecked, inbox.items]);

  // Step the run whenever the session moves: send the next one once the last has landed.
  const decideRef = React.useRef(inbox.decide);
  decideRef.current = inbox.decide;
  React.useEffect(() => {
    if (!run || !isRunning(run)) return;
    const byKey = new Map(inbox.items.map((i) => [i.key, i]));
    const step = stepRun(run, (key) => ({
      item: byKey.get(key),
      busy: key in inbox.session.busy,
      error: inbox.session.errors[key],
    }));
    if (step.type === "send") {
      const base = bulkSpec(run.action, byKey.get(step.key)!, inbox, links);
      decideRef.current({ ...base, quiet: true, advance: false });
    }
    if (step.run !== run) setRun(step.run);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `inbox` itself changes every render; its parts are listed
  }, [run, inbox.items, inbox.session, inbox.wordCache, inbox.bank, links]);

  const begin = React.useCallback((action: BulkAction, items: InboxItem[]) => {
    if (items.length === 0) return;
    setRun(startRun(action, items));
  }, []);

  const running = isRunning(run);

  return {
    checked,
    run,
    running,
    toggle: React.useCallback((item) => setChecked((c) => toggleChecked(c, item)), []),
    clear: React.useCallback(() => setChecked(new Set()), []),
    approve: React.useCallback(
      (list) => {
        if (running) return [];
        const targets = bulkTargets(list, checked);
        begin("approve", targets);
        setChecked(new Set());
        return targets.map((t) => t.key);
      },
      [running, checked, begin],
    ),
    undoAll: React.useCallback(() => {
      if (!run || running || run.action !== "approve") return;
      const keys = new Set(run.done);
      begin(
        "withdraw",
        inbox.items.filter((i) => keys.has(i.key) && i.state === "approved"),
      );
    }, [run, running, begin, inbox.items]),
    stop: React.useCallback(() => setRun((r) => (r ? stopRun(r) : r)), []),
    dismiss: React.useCallback(() => setRun((r) => (r && !isRunning(r) ? null : r)), []),
  };
}
