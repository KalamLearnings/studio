/**
 * The decisions of the Blend lens (CW-6), as `DecisionSpec`s: a split review
 * (`POST /words/blend/:wordId/:form/review`) and a take review
 * (`POST /words/:wordId/audio/:takeId/review`, with the optional regenerate).
 * Neither has an inverse route, so both are held for 5 s and Undo cancels
 * them. `run` reads the queue again once the server answers (the answers
 * carry no playable URLs), so the overlay goes when the new rows land.
 *
 * Generate, Regenerate, marks and the AI check are not decisions: the pane
 * calls `useBlendAudioActions` and `useBlendAiCheck` for them, as the old page did.
 */

import { reviewTake, reviewWordBlend } from "@/lib/api/words";
import { ENDING_LABELS, type BlendEnding } from "@/lib/blendWord/config";
import type { SplitReviewBody } from "@/lib/blendWord/review";
import { audioErrorView, KIND_LABELS, type BlendReviewTake, type TakeReviewBody } from "@/lib/blendWord/takes";
import { blendItems, type BlendItem } from "../normalise/sources";
import { withSplitReview, withTakeReview, type Reviewer } from "../normalise/blend";
import type { InboxItem } from "../inbox";
import type { DecisionSpec } from "./types";

export interface BlendDecisionContext {
  /** Reads the blend queue (and any open word blend) again; resolves when the new rows are in the cache. */
  refresh: () => Promise<void>;
  userId: string | null;
  /** True when this is the word's last open decision: the workspace then opens the next item. */
  last: boolean;
}

export const describeBlendError = (e: unknown) => audioErrorView(e).message;

/** The item again from a changed word, keeping what the source row cannot say. */
function reBlend(item: BlendItem, word: BlendItem["data"]): BlendItem {
  const [next] = blendItems([word]);
  return { ...next, waitingSince: item.waitingSince, decidedAt: item.decidedAt, decidedBy: item.decidedBy };
}

const reviewer = (ctx: BlendDecisionContext): Reviewer => ({ by: ctx.userId, at: new Date().toISOString() });

export function reviewSplitSpec(item: BlendItem, form: BlendEnding, body: SplitReviewBody, ctx: BlendDecisionContext): DecisionSpec {
  const label = ENDING_LABELS[form].label;
  const who = reviewer(ctx);
  return {
    item,
    mode: "hold",
    message: { text: `${label} split ${body.decision === "approved" ? "approved" : "rejected"}:`, arabic: item.title },
    optimistic: (it: InboxItem) => {
      const b = it as BlendItem;
      return reBlend(b, withSplitReview(b.data, form, body, who));
    },
    run: async () => {
      await reviewWordBlend(item.id, form, body);
      await ctx.refresh();
    },
    describeError: (e) => `The split review was not saved: ${describeBlendError(e)}`,
    advance: ctx.last,
  };
}

export function reviewTakeSpec(item: BlendItem, take: BlendReviewTake, body: TakeReviewBody, ctx: BlendDecisionContext): DecisionSpec {
  const who = reviewer(ctx);
  const what = `${KIND_LABELS[take.kind]} take`;
  const text =
    body.decision === "approve"
      ? `${what} approved:`
      : body.regenerate
        ? `${what} rejected, a new one is being made:`
        : `${what} rejected:`;
  return {
    item,
    mode: "hold",
    message: { text, arabic: item.title },
    optimistic: (it: InboxItem) => {
      const b = it as BlendItem;
      return reBlend(b, withTakeReview(b.data, take.id, body, who));
    },
    run: async () => {
      await reviewTake(item.id, take.id, body);
      await ctx.refresh();
    },
    describeError: (e) => `The take review was not saved: ${describeBlendError(e)}`,
    advance: ctx.last,
  };
}
