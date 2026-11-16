/**
 * The Blend pane's pure side (CW-6): the open decisions of one blend word, in
 * the order `tab` walks them, and how the word looks once one of them is
 * decided (the optimistic overlay, re-normalised with `blendItems`).
 */

import { sortedForms, type BlendReviewWord, type SplitReviewBody } from "../../blendWord/review";
import type { BlendEnding } from "../../blendWord/config";
import type { TakeReviewBody } from "../../blendWord/takes";

/**
 * One open decision on a blend word: a split to review (not one its current
 * review rejected: that waits for the author), or a current take that waits.
 */
export type BlendTarget = { type: "split"; form: BlendEnding; id: string } | { type: "take"; form: BlendEnding; takeId: string; id: string };

export const splitTargetId = (form: BlendEnding) => `split:${form}`;
export const takeTargetId = (takeId: string) => `take:${takeId}`;

/** The word's open decisions: per form (pausal, then full), its split, then its takes as listed. */
export function blendTargets(word: BlendReviewWord): BlendTarget[] {
  const out: BlendTarget[] = [];
  for (const f of sortedForms(word)) {
    const rejected = f.review?.current && f.review.decision === "rejected";
    if (f.reviewStatus === "needs_review" && !rejected) out.push({ type: "split", form: f.form, id: splitTargetId(f.form) });
    for (const t of f.takes) {
      if (t.current && t.status === "needs_review") out.push({ type: "take", form: f.form, takeId: t.id, id: takeTargetId(t.id) });
    }
  }
  return out;
}

/** The target `focusId` names, else the first open one. */
export function focusedTarget(targets: readonly BlendTarget[], focusId: string | null): BlendTarget | null {
  return targets.find((t) => t.id === focusId) ?? targets[0] ?? null;
}

/** `tab` / `shift+tab`: the next or previous open decision, wrapping. */
export function moveTarget(targets: readonly BlendTarget[], focusId: string | null, delta: number): string | null {
  if (targets.length === 0) return null;
  const i = Math.max(0, targets.findIndex((t) => t.id === focusId));
  return targets[(i + delta + targets.length) % targets.length].id;
}

export interface Reviewer {
  by: string | null;
  at: string;
}

/** The word once the form's split is reviewed: ready, with a current review. */
export function withSplitReview(word: BlendReviewWord, form: BlendEnding, body: SplitReviewBody, who: Reviewer): BlendReviewWord {
  return {
    ...word,
    forms: word.forms.map((f) =>
      f.form === form
        ? {
            ...f,
            // The backend keeps a rejected split in needs_review (it waits for the author).
            reviewStatus: body.decision === "approved" ? ("ready" as const) : ("needs_review" as const),
            review: { decision: body.decision, by: who.by, at: who.at, note: body.note ?? null, current: true },
          }
        : f,
    ),
  };
}

/** The word once a take is approved (ready) or rejected (with the reason as the backend stores it). */
export function withTakeReview(word: BlendReviewWord, takeId: string, body: TakeReviewBody, who: Reviewer): BlendReviewWord {
  return {
    ...word,
    forms: word.forms.map((f) => ({
      ...f,
      takes: f.takes.map((t) => {
        if (t.id !== takeId) return t;
        const reviewed = { ...t, reviewedBy: who.by, reviewedAt: who.at };
        if (body.decision === "approve") return { ...reviewed, status: "ready" as const };
        const note = body.note ? `: ${body.note}` : "";
        return { ...reviewed, status: "rejected" as const, error: `rejected (${body.reason})${note}` };
      }),
    })),
  };
}
