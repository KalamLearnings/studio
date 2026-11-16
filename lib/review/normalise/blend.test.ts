import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({ ApiError: class ApiError extends Error {} }));

import type { BlendReviewForm, BlendReviewWord } from "../../blendWord/review";
import type { BlendReviewTake } from "../../blendWord/takes";
import { blendTargets, focusedTarget, moveTarget, withSplitReview, withTakeReview } from "./blend";
import { blendItems } from "./sources";

const take = (over: Partial<BlendReviewTake>): BlendReviewTake =>
  ({ id: "t", kind: "natural", status: "ready", current: true, error: null, createdAt: "2026-11-01T00:00:00Z", ...over }) as BlendReviewTake;
const form = (over: Partial<BlendReviewForm>): BlendReviewForm =>
  ({ form: "full", vowelisedText: "كِتَابٌ", units: [], reviewStatus: "ready", review: null, qaFlags: [], takes: [], ...over }) as BlendReviewForm;
const word = (forms: BlendReviewForm[]): BlendReviewWord => ({
  wordId: "w",
  word: { arabic: "كِتَابٌ", english: "book", isPseudo: false, usageCount: 2 },
  forms,
});
const who = { by: "me", at: "2026-11-16T10:00:00Z" };

// Full form listed first on purpose: the targets follow reading order, pausal first.
const kitab = word([
  form({ form: "full", takes: [take({ id: "t2", status: "needs_review" }), take({ id: "t3", status: "pending" })] }),
  form({ form: "pausal", vowelisedText: "كِتَابْ", reviewStatus: "needs_review", takes: [take({ id: "t1" })] }),
]);

describe("blendTargets", () => {
  it("lists each form's split, then its takes that wait, pausal first", () => {
    expect(blendTargets(kitab).map((t) => t.id)).toEqual(["split:pausal", "take:t2"]);
  });
  it("leaves out a split its current review rejected (it waits for the author) and old takes", () => {
    const w = word([
      form({ reviewStatus: "needs_review", review: { decision: "rejected", by: "x", at: "y", note: "n", current: true } }),
      form({ form: "pausal", reviewStatus: "needs_review", review: { decision: "rejected", by: "x", at: "y", note: "n", current: false } }),
      form({ form: "full", takes: [take({ id: "old", status: "needs_review", current: false })] }),
    ]);
    expect(blendTargets(w).map((t) => t.id)).toEqual(["split:pausal"]);
  });
  it("focuses the named target, else the first, and tab wraps", () => {
    const t = blendTargets(kitab);
    expect(focusedTarget(t, "take:t2")?.id).toBe("take:t2");
    expect(focusedTarget(t, "gone")?.id).toBe("split:pausal");
    expect(focusedTarget([], null)).toBeNull();
    expect(moveTarget(t, "take:t2", 1)).toBe("split:pausal");
    expect(moveTarget(t, "split:pausal", -1)).toBe("take:t2");
    expect(moveTarget(t, null, 1)).toBe("take:t2");
    expect(moveTarget([], null, 1)).toBeNull();
  });
});

describe("the optimistic word", () => {
  it("an approved split is ready with a current review; the word still waits for its take", () => {
    const w = withSplitReview(kitab, "pausal", { decision: "approved" }, who);
    const pausal = w.forms.find((f) => f.form === "pausal")!;
    expect(pausal).toMatchObject({ reviewStatus: "ready", review: { decision: "approved", by: "me", current: true, note: null } });
    expect(blendTargets(w).map((t) => t.id)).toEqual(["take:t2"]);
    expect(blendItems([w])[0]).toMatchObject({ state: "todo", context: "1 take to hear" });
  });
  it("a rejected split stays in needs_review, as the backend keeps it, and the word reads as rejected", () => {
    const w = withTakeReview(withSplitReview(kitab, "pausal", { decision: "rejected", note: "two units" }, who), "t2", { decision: "approve" }, who);
    expect(w.forms.find((f) => f.form === "pausal")).toMatchObject({ reviewStatus: "needs_review", review: { decision: "rejected", note: "two units" } });
    expect(blendTargets(w)).toEqual([]);
    expect(blendItems([w])[0].state).toBe("rejected");
  });
  it("an approved take is ready; a rejected one carries the reason as the backend stores it", () => {
    const approved = withTakeReview(kitab, "t2", { decision: "approve" }, who);
    expect(approved.forms[0].takes[0]).toMatchObject({ status: "ready", reviewedBy: "me" });
    const rejected = withTakeReview(kitab, "t2", { decision: "reject", reason: "noise", note: "hiss" }, who);
    expect(rejected.forms[0].takes[0]).toMatchObject({ status: "rejected", error: "rejected (noise): hiss" });
    expect(rejected.forms[0].takes[1]).toBe(kitab.forms[0].takes[1]);
  });
  it("is approved once every decision is made and none was a rejection", () => {
    const w = withTakeReview(withSplitReview(kitab, "pausal", { decision: "approved" }, who), "t2", { decision: "approve" }, who);
    expect(blendItems([w])[0]).toMatchObject({ state: "approved", context: "Reviewed" });
  });
});
