/**
 * The lens contract (see components/review/README.md). A lens is one kind of
 * decision: its normaliser lives in lib/review/normalise, its decisions in
 * lib/review/actions, and its pane here. Registering a lens in `./index.ts`
 * is what makes its kind appear in Review (rail, counts, number key, sheet).
 */

import type * as React from "react";
import type { DecisionSpec } from "@/lib/review/actions/types";
import type { InboxItem, InboxKind, ReviewRoles } from "@/lib/review/inbox";
import type { ReviewCommand, ShortcutGroup } from "@/lib/review/keyboard";
import type { ReviewBank } from "@/lib/hooks/useReviewInbox";
import type { WordCache } from "@/lib/review/actions/words";
import type { DecisionStatus } from "@/lib/review/decisions";

export interface PaneProps<I extends InboxItem = InboxItem> {
  item: I;
  roles: ReviewRoles;
  userId: string | null;
  bank: ReviewBank;
  wordCache: WordCache;
  /** Records a decision (optimistic, with Undo). The workspace moves on when `advance` is not false. */
  decide: (spec: DecisionSpec) => void;
  /** The last refusal for this item, shown in the decision bar. */
  error: string | null;
  clearError: () => void;
  /** A decision on this item is held, being sent or being undone. */
  busy: DecisionStatus | null;
  /**
   * Opens the family or concept; null opens the library to pick or create one.
   * Today these go to the old Families and Concepts pages; CW-9 opens the editors in the pane.
   */
  openFamily: (familyId: string | null) => void;
  openConcept: (slug: string | null) => void;
  /** Wall-clock now, for ages. */
  now: number;
}

/** A handler gets every command first; true means it handled it (the workspace then does nothing). */
export type CommandHandler = (cmd: ReviewCommand) => boolean;

export interface LensDefinition {
  kind: InboxKind;
  Pane: React.ComponentType<PaneProps>;
  /** Rows this lens adds to the shortcut sheet. */
  shortcuts?: ShortcutGroup[];
  /** Kind tools shown in the list header while this lens is open (CW-6 AI check, CW-7 drafts). */
  ListTools?: React.ComponentType<{ items: InboxItem[] }>;
}
