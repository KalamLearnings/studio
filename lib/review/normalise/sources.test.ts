import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({ ApiError: class ApiError extends Error {} }));

import type { BlendReviewForm, BlendReviewWord } from "@/lib/blendWord/review";
import type { BlendReviewTake } from "@/lib/blendWord/takes";
import type { DraftRow, WordRequest } from "@/lib/generation/drafts";
import type { PhraseAudioTake } from "@/lib/phrases/phraseAudio";
import { blendItems, draftItems, phraseItems, recordingItems, recordingTakeToHear, requestItems, type InboxPhraseEntry } from "./sources";

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
    expect(draftItems([{ ...row("x"), node_title: "Letter ba, lesson", curriculum_title: "Kalam Readers" }])[0]).toMatchObject({
      context: "Letter ba, lesson",
    });
    expect(items.map((i) => i.state)).toEqual(["todo", "approved", "rejected"]);
    expect(items[0]).toMatchObject({ title: "Grid tap (themed hunts)", titleScript: "latin", context: "Letter ta, practice" });
    expect(items[2].context).toBe("Letter ta, practice · Too close");
  });
  it("reads BE-1's stored titles ({ en, ar? }) for the node, topic and curriculum", () => {
    const [d] = draftItems([
      { ...row("x"), node_title: { en: "Letter ta, practice" }, topic_title: { en: "Ta", ar: "ت" }, curriculum_title: { ar: "قراءة" } },
    ]);
    expect(d.context).toBe("Letter ta, practice");
    expect(d.searchText).toBe("grid_tap Letter ta, practice n1 Ta قراءة");
    expect(draftItems([{ ...row("y"), node_title: null }])[0].context).toBe("n1");
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
  const p = (key: string, over: Partial<InboxPhraseEntry> = {}): InboxPhraseEntry => ({
    phrase_key: key, word_ids: key.split(" "), is_sentence: false, text: "بَابٌ كَبِيرٌ", word_problems: [], used_in: [], approval: null, reason: "unreviewed", rejection: null, ...over,
  });
  it("lists pending, approved and rejected, and asks to confirm a flag mismatch again", () => {
    const items = phraseItems({
      pending: [p("a b", { reason: "flag_mismatch" })],
      approved: [p("c d", { reason: null })],
      rejected: [p("e f", { reason: null, rejection: { reason: "wrong_word_order", note: "Order is off", by: "u", at: "2026-11-15T00:00:00Z" } })],
    });
    expect(items.map((i) => [i.state, i.todoLabel])).toEqual([["todo", "Confirm again"], ["approved", undefined], ["rejected", undefined]]);
    expect(items[2]).toMatchObject({ context: "Phrase · 0 uses · Order is off", decidedBy: "u" });
  });
  it("reads the backend's reviewed_by and reviewed_at on a rejection", () => {
    const [r] = phraseItems({
      pending: [],
      approved: [],
      rejected: [p("e f", { reason: null, rejection: { reason: "unnatural", note: null, reviewed_by: "u9", reviewed_at: "2026-11-16T00:00:00Z" } })],
    });
    expect(r).toMatchObject({ decidedBy: "u9", decidedAt: "2026-11-16T00:00:00Z", context: "Phrase · 0 uses · Does not sound natural" });
  });
  it("reads the old answer with no rejected list", () => {
    expect(phraseItems({ pending: [p("a b")], approved: [] })).toHaveLength(1);
  });
});

describe("recordingItems (BE-2 audio summary)", () => {
  const e = (key: string, audio: InboxPhraseEntry["audio"]): InboxPhraseEntry => ({
    phrase_key: key, word_ids: [], is_sentence: false, text: "فِي البَيْتِ", word_problems: [], used_in: [], approval: null, reason: null, audio,
  });
  it("waits on a take to hear, fails on a failed take, skips phrases with no audio", () => {
    const items = recordingItems({
      pending: [],
      approved: [
        e("a", { state: "needs_review", needs_review_take_id: "t2", served_take_id: "t1" }),
        e("b", { state: "failed" }),
        e("c", { state: "none" }),
        e("d", null),
        e("f", { state: "served", served_take_id: "t1" }),
        e("g", { state: "in_progress" }),
      ],
      generation_enabled: false,
    });
    expect(items.map((i) => [i.id, i.state])).toEqual([["a", "todo"], ["b", "failed"], ["f", "approved"], ["g", "listen"]]);
    expect(items[0].context).toBe("Phrase · new take beside the served one");
    expect(items[0].data.generationEnabled).toBe(false);
  });
  it("picks the take to hear from the full read", () => {
    const t = (over: Partial<PhraseAudioTake>): PhraseAudioTake => ({ id: "t", status: "approved", current: true, served: false, created_at: "x", ...over }) as PhraseAudioTake;
    expect(recordingTakeToHear({ takes: [t({ id: "s", served: true }), t({ id: "n", status: "needs_review" })] })?.id).toBe("n");
  });
});
