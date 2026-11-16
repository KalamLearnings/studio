import { describe, expect, it } from "vitest";
import { draftPreview, logicalLetters, previewLetter, type GridPreview, type WordPreview } from "./draftPreview";

describe("previewLetter", () => {
  it("reads a reference, a glyph string and a positional form", () => {
    expect(previewLetter({ letterId: "ta", form: "isolated" })).toEqual({ glyph: "ت", base: "ت", form: "isolated" });
    expect(previewLetter("ب")).toMatchObject({ glyph: "ب", base: "ب" });
    expect(previewLetter({ letterId: "ta", form: "medial" })?.glyph).toBe("ـتـ");
    expect(previewLetter({ letterId: "ba", form: "isolated", haraka: "fatha" })?.glyph).toBe("بَ");
  });
  it("is null for what is not a letter", () => {
    expect(previewLetter({ letterId: "nope", form: "isolated" })).toBeNull();
    expect(previewLetter("كتاب")).toBeNull();
    expect(previewLetter(null)).toBeNull();
  });
});

describe("draftPreview: grid_tap", () => {
  const config = {
    targetLetter: { letterId: "ta", form: "isolated" },
    distractorLetters: [{ letterId: "ba", form: "isolated" }, { letterId: "tha", form: "isolated" }],
    targetCount: 4,
    totalItems: 12,
  };
  it("draws the targets among the distractors", () => {
    const p = draftPreview("grid_tap", config) as GridPreview;
    expect(p.kind).toBe("grid");
    expect(p.cells).toHaveLength(12);
    expect(p.cells.filter((c) => c.target)).toHaveLength(4);
    expect(p.cells.filter((c) => !c.target).map((c) => c.glyph)).toEqual(["ب", "ث", "ب", "ث", "ب", "ث", "ب", "ث"]);
    expect(p.countsDefaulted).toBe(false);
  });
  it("uses 4 of 12 when the counts are left to the app, and reads several targets", () => {
    const p = draftPreview("grid_tap", { targetLetter: ["ت", "ث"], distractorLetters: ["ب"] }) as GridPreview;
    expect([p.targetCount, p.total, p.countsDefaulted]).toEqual([4, 12, true]);
    expect(p.targets.map((t) => t.glyph)).toEqual(["ت", "ث"]);
    expect(p.cells.filter((c) => c.target).map((c) => c.glyph)).toEqual(["ت", "ث", "ت", "ث"]);
  });
  it("says what is missing instead of guessing", () => {
    expect(draftPreview("grid_tap", { distractorLetters: [] })).toMatchObject({ kind: "missing" });
    expect(draftPreview("grid_tap", null)).toMatchObject({ kind: "missing" });
    expect(draftPreview("letter_rain", {})).toMatchObject({ kind: "missing", reason: expect.stringContaining("letter_rain") });
  });
});

describe("draftPreview: tap_letter_in_word", () => {
  it("splits the word into logical letters and marks the positions", () => {
    expect(logicalLetters("بَتَبَ")).toEqual(["بَ", "تَ", "بَ"]);
    const p = draftPreview("tap_letter_in_word", {
      targetWord: "بَتَبَ",
      targetLetter: { letterId: "ta", form: "isolated" },
      targetIndices: [1],
      targetCount: 1,
    }) as WordPreview;
    expect(p.units).toEqual([
      { text: "بَ", target: false },
      { text: "تَ", target: true },
      { text: "بَ", target: false },
    ]);
    expect([p.byPosition, p.targetCount, p.letter?.glyph]).toEqual([true, 1, "ت"]);
  });
  it("marks every matching letter when the draft names no positions", () => {
    const p = draftPreview("tap_letter_in_word", { targetWord: "مَطْعَم", targetLetter: { letterId: "meem", form: "initial" } }) as WordPreview;
    expect(p.units.map((u) => u.target)).toEqual([true, false, false, true]);
    expect([p.byPosition, p.targetCount]).toEqual([false, 2]);
  });
  it("needs a word", () => {
    expect(draftPreview("tap_letter_in_word", { targetLetter: "ت" })).toMatchObject({ kind: "missing" });
  });
});
