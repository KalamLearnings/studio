import { describe, expect, it } from "vitest";
import { labelDraft, meaningDraft } from "./normalise/drafts.fixtures";
import { defaultFamilyId, planLabelDraft, planMeaningDraft } from "./draftPlans";
import { inverseOps } from "../connections/ops";

const none = new Set<string>();

describe("planMeaningDraft", () => {
  it("writes the gloss to the word's family, and Undo puts the old one back", () => {
    const d = meaningDraft({ family: { id: "book", headword_id: "w-kitab", gloss_en: "a book" } });
    const plan = planMeaningDraft(d, none);
    expect(plan).toEqual({ ok: true, newFamilyId: null, ops: [{ op: "setGloss", familyId: "book", gloss: "book", prev: "a book" }] });
    expect(plan.ok && inverseOps(plan.ops)).toEqual([{ op: "setGloss", familyId: "book", gloss: "a book", prev: "book" }]);
  });

  it("starts a family with the spelling as headword when it has none", () => {
    expect(planMeaningDraft(meaningDraft(), none)).toEqual({
      ok: true,
      newFamilyId: "book",
      ops: [{ op: "createFamily", familyId: "book", gloss: "book", headwordId: "w-kitab" }],
    });
  });

  it("an unvowelled spelling starts the family of the spelling it is read as", () => {
    const d = meaningDraft({ word: { id: "w-ktb", arabic: "كتاب", family_id: null, reads_as_id: "w-kitab", is_pseudo: false } });
    expect(planMeaningDraft(d, none).ok && (planMeaningDraft(d, none) as { ops: unknown[] }).ops[0]).toMatchObject({ headwordId: "w-kitab" });
  });

  it("uses the reviewer's gloss and id; refuses a taken id, an empty gloss, the same gloss and a practice word", () => {
    const plan = planMeaningDraft(meaningDraft(), none, { gloss: " a book ", familyId: "kitab" });
    expect(plan.ok && plan.ops).toEqual([{ op: "createFamily", familyId: "kitab", gloss: "a book", headwordId: "w-kitab" }]);
    expect(planMeaningDraft(meaningDraft(), new Set(["book"]))).toEqual({ ok: false, reason: "Give the new word an id first." });
    expect(planMeaningDraft(meaningDraft(), new Set(["book"]), { familyId: "book" })).toEqual({
      ok: false,
      reason: "A word with the id book exists. Pick another id.",
    });
    expect(planMeaningDraft(meaningDraft(), none, { gloss: "  " }).ok).toBe(false);
    expect(planMeaningDraft(meaningDraft({ family: { id: "book", headword_id: null, gloss_en: "book" } }), none).ok).toBe(false);
    expect(planMeaningDraft(meaningDraft({ word: { ...meaningDraft().word!, is_pseudo: true } }), none).ok).toBe(false);
  });
});

describe("planLabelDraft", () => {
  it("creates the meaning, attaches the picture, starts the word's family and names the meaning", () => {
    expect(planLabelDraft(labelDraft(), none)).toEqual({
      ok: true,
      newFamilyId: "cat",
      ops: [
        { op: "createConcept", slug: "cat", name: { en: "Cat", ar: "قِطَّة" }, kind: null },
        { op: "attachPicture", concept: "cat", assetId: "a1" },
        { op: "createFamily", familyId: "cat", gloss: "Cat", headwordId: "w-qitta" },
        { op: "linkConcept", familyId: "cat", concept: "cat" },
      ],
    });
  });

  it("leaves out the steps already in place", () => {
    const d = labelDraft({
      concept: { id: "c1", slug: "cat", name: { en: "Cat" } },
      picture_concepts: ["cat"],
      family: { id: "qitta", headword_id: "w-qitta", gloss_en: "cat" },
    });
    expect(planLabelDraft(d, none)).toEqual({ ok: true, newFamilyId: null, ops: [{ op: "linkConcept", familyId: "qitta", concept: "cat" }] });
    expect(planLabelDraft({ ...d, family_concepts: ["cat"] }, none)).toEqual({ ok: false, reason: "Already connected." });
  });

  it("connects the picture only when no word names the meaning", () => {
    const plan = planLabelDraft(labelDraft({ word_id: null, word: null, needs_word: true, concept: { id: "c1", slug: "cat", name: { en: "Cat" } } }), none);
    expect(plan.ok && plan.ops).toEqual([{ op: "attachPicture", concept: "cat", assetId: "a1" }]);
  });

  it("refuses an unregistered picture and a taken family id", () => {
    expect(planLabelDraft(labelDraft({ status: null }), none).ok).toBe(false);
    expect(planLabelDraft(labelDraft(), new Set(["cat"]), { familyId: "cat" })).toEqual({
      ok: false,
      reason: "A word with the id cat exists. Pick another id.",
    });
  });

  it("Undo of a full approval removes the links and leaves the created rows", () => {
    const plan = planLabelDraft(labelDraft(), none);
    expect(plan.ok && inverseOps(plan.ops)).toEqual([
      { op: "unlinkConcept", familyId: "cat", concept: "cat" },
      { op: "setHeadword", familyId: "cat", headwordId: null, prev: "w-qitta" },
      { op: "setFamily", wordId: "w-qitta", familyId: null, prev: "cat" },
      { op: "detachPicture", concept: "cat", assetId: "a1" },
    ]);
  });
});

describe("defaultFamilyId", () => {
  it("takes the preferred id, else the gloss made a slug, when free", () => {
    expect(defaultFamilyId("cat", "Cat", none)).toBe("cat");
    expect(defaultFamilyId("cat", "House cat", new Set(["cat"]))).toBe("house-cat");
    expect(defaultFamilyId(null, "Cat", new Set(["cat"]))).toBeNull();
  });
});
