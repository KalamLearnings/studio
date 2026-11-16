import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({ ApiError: class ApiError extends Error {} }));

import type { BlendReviewForm, BlendReviewWord } from "@/lib/blendWord/review";
import type { BlendReviewTake } from "@/lib/blendWord/takes";
import type { DraftRow, WordRequest } from "@/lib/generation/drafts";
import type { PhraseAudioStatus, PhraseAudioTake } from "@/lib/phrases/phraseAudio";
import type { PhraseEntry } from "@/lib/phrases/phraseReview";
import { blendItems, draftItems, phraseItems, recordingItems, requestItems } from "./sources";

const take = (over: Partial<BlendReviewTake>): BlendReviewTake =>
  ({ id: "t", kind: "natural", status: "ready", current: true, createdAt: "2026-11-01T00:00:00Z", ...over }) as BlendReviewTake;
const form = (over: Partial<BlendReviewForm>): BlendReviewForm =>
  ({ form: "full", vowelisedText: "كِتَابٌ", units: [], reviewStatus: "ready", qaFlags: [], takes: [], ...over }) as BlendReviewForm;
const blend = (id: string, forms: BlendReviewForm[]): BlendReviewWord => ({
  wordId: id,
  word: { arabic: "كِتَابٌ", english: "book", isPseudo: false, usageCount: 2 },
  forms,
});

describe("blendItems", () => {
  it("waits when a split or a take needs review", () => {
    const [a] = blendItems([blend("a", [form({ reviewStatus: "needs_review" }), form({ takes: [take({ status: "needs_review" })] })])]);
    expect(a).toMatchObject({ key: "blend:a", state: "todo", usage: 2, context: "1 split to review · 1 take to hear" });
  });
  it("marks a word with nothing to review but a take not voiceable as failed", () => {
    const [b] = blendItems([blend("b", [form({ takes: [take({ status: "not_voiceable" })] })])]);
    expect(b).toMatchObject({ state: "failed", failedLabel: "Not voiceable" });
  });
});

describe("draftItems", () => {
  const row = (id: string, over: Partial<DraftRow> = {}): DraftRow =>
    ({ id, node_id: "n1", type: "grid_tap", is_published: false, is_exemplar: false, provenance: null, approved_by: null, approved_at: null, config: null, created_at: "2026-11-01T00:00:00Z", ...over }) as DraftRow;
  it("uses draftStatus and names the node", () => {
    const items = draftItems(
      [row("p"), row("a", { approved_by: "lead" }), row("r", { provenance: { review: { decision: "rejected", by: "l", at: "x", reason: "Too close" } } as DraftRow["provenance"] })],
      new Map([["n1", "Letter ta, practice"]]),
    );
    expect(items.map((i) => i.state)).toEqual(["todo", "approved", "rejected"]);
    expect(items[0]).toMatchObject({ title: "Grid tap (themed hunts)", titleScript: "latin", context: "Letter ta, practice" });
    expect(items[2].context).toBe("Letter ta, practice · Too close");
  });
});

describe("requestItems", () => {
  it("maps open, fulfilled and declined", () => {
    const r = (id: string, status: WordRequest["status"]): WordRequest =>
      ({ id, node_id: "n", activity_type: "grid_tap", letters: [], description_en: "a tent", status, requested_by: "u", created_at: "2026-11-01T00:00:00Z" });
    expect(requestItems([r("1", "open"), r("2", "fulfilled"), r("3", "declined")]).map((i) => i.state)).toEqual(["todo", "approved", "rejected"]);
  });
});

describe("phraseItems", () => {
  const p = (key: string, over: Partial<PhraseEntry> = {}): PhraseEntry => ({
    phrase_key: key, word_ids: key.split(" "), is_sentence: false, text: "بَابٌ كَبِيرٌ", word_problems: [], used_in: [], approval: null, reason: "unreviewed", ...over,
  });
  it("lists pending then approved, and asks to confirm a flag mismatch again", () => {
    const items = phraseItems({ pending: [p("a b", { reason: "flag_mismatch" })], approved: [p("c d", { reason: null })] });
    expect(items.map((i) => [i.state, i.todoLabel])).toEqual([["todo", "Confirm again"], ["approved", undefined]]);
  });
});

describe("recordingItems", () => {
  const t = (over: Partial<PhraseAudioTake>): PhraseAudioTake =>
    ({ id: "t", status: "approved", current: true, served: false, created_at: "2026-11-01T00:00:00Z", ...over }) as PhraseAudioTake;
  const s = (key: string, takes: PhraseAudioTake[], approved = true): PhraseAudioStatus =>
    ({ phrase_key: key, word_ids: [], text: "فِي البَيْتِ", phrase_approved: approved, is_sentence: false, generation_enabled: true, served_take_id: null, takes });
  it("waits on a take to hear, fails on a failed take, skips phrases with no take", () => {
    const items = recordingItems([
      s("a", [t({ status: "needs_review" }), t({ id: "s", served: true })]),
      s("b", [t({ status: "failed" })]),
      s("c", []),
      s("d", [t({ status: "needs_review" })], false),
    ]);
    expect(items.map((i) => [i.id, i.state])).toEqual([["a", "todo"], ["b", "failed"]]);
    expect(items[0].context).toBe("Phrase · new take beside the served one");
  });
});
