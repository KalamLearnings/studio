import { describe, expect, it } from "vitest";
import { familyProposal, pictureProposal } from "./normalise/links.fixtures";
import { planFamilyProposal, planPictureProposal } from "./linkPlans";

const noWords = () => undefined;

describe("planFamilyProposal", () => {
  it("creates the proposed family with its headword, then adds the others", () => {
    const plan = planFamilyProposal(familyProposal(), noWords, new Map());
    expect(plan).toEqual({
      ok: true,
      familyId: "book",
      create: true,
      ops: [
        { op: "createFamily", familyId: "book", gloss: "book", headwordId: "w-kitab" },
        { op: "setFamily", wordId: "w-kitabu", familyId: "book", prev: null },
      ],
    });
  });
  it("uses the headword's own family, and confirms the readings it proposes", () => {
    const p = familyProposal({
      members: [
        { id: "w-kitab", arabic: "كِتَاب", reason: "headword", family_id: "books", reads_as_id: null },
        { id: "w-ktb", arabic: "كتاب", reason: "reads_as", of: "w-kitab", family_id: "other", reads_as_id: null },
      ],
    });
    const plan = planFamilyProposal(p, noWords, new Map([["books", { headword_id: "w-kitab" }]]));
    expect(plan.ok && plan.ops).toEqual([
      { op: "setFamily", wordId: "w-ktb", familyId: null, prev: "other" },
      { op: "setFamily", wordId: "w-ktb", familyId: "books", prev: null },
      { op: "setReadsAs", wordId: "w-ktb", readsAsId: "w-kitab", prev: null },
    ]);
  });
  it("joins an existing family with the proposal's id instead of creating it", () => {
    const plan = planFamilyProposal(familyProposal(), noWords, new Map([["book", { headword_id: null }]]));
    expect(plan.ok && plan.create).toBe(false);
    expect(plan.ok && plan.ops.at(-1)).toEqual({ op: "setHeadword", familyId: "book", headwordId: "w-kitab", prev: null });
  });
  it("asks for a name when the id is missing or taken by another suggestion", () => {
    expect(planFamilyProposal(familyProposal({ slug: null }), noWords, new Map()).ok).toBe(false);
    expect(planFamilyProposal(familyProposal({ slug_clash: true }), noWords, new Map(), { slug: "book", gloss: null }).ok).toBe(false);
    const named = planFamilyProposal(familyProposal({ slug_clash: true }), noWords, new Map(), { slug: "book-2", gloss: "a book" });
    expect(named.ok && named.familyId).toBe("book-2");
  });
});

describe("planPictureProposal", () => {
  it("creates a missing meaning first", () => {
    expect(planPictureProposal(pictureProposal())).toEqual([
      { op: "createConcept", slug: "sea-lion", name: { en: "Sea lion", ar: "فُقْمَة" }, kind: null },
      { op: "attachPicture", concept: "sea-lion", assetId: "a-1" },
    ]);
  });
  it("attaches to an existing meaning", () => {
    const p = pictureProposal({ concept: { id: "u", slug: "seal", name: { en: "Seal" } } });
    expect(planPictureProposal(p)).toEqual([{ op: "attachPicture", concept: "seal", assetId: "a-1" }]);
  });
});
