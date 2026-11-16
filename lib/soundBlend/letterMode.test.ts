import { describe, expect, it } from "vitest";
import { clearBlendFields } from "./config";
import { letterBlendTarget, toLetterBlendRef, withLetterBlend } from "./letterMode";

describe("letterBlendTarget (CM-D3f)", () => {
  it("reads targetLetter, never the word glyph, when the row has one", () => {
    // a migrated row whose stored glyph is older than an edit of its reference
    const row = {
      blendVersion: 2 as const,
      contentType: "letter" as const,
      targetLetter: { letterId: "jeem", form: "initial", haraka: "kasra" },
      word: "جـَ",
      segments: [{ sound: "جـَ", duration: 2 as const }],
    };
    expect(letterBlendTarget(row)).toEqual({ letterId: "jeem", form: "initial", haraka: "kasra" });
  });

  it("reads a legacy row's glyph with the server reader: a haraka after the tatweel is still the initial form", () => {
    expect(letterBlendTarget({ contentType: "letter", word: "جـَ" })).toEqual({
      letterId: "jeem",
      form: "initial",
      haraka: "fatha",
    });
    expect(letterBlendTarget({ contentType: "letter", word: "ـعـَ" })).toEqual({
      letterId: "ayn",
      form: "medial",
      haraka: "fatha",
    });
    expect(letterBlendTarget({ contentType: "letter", word: "ـهُ" })).toEqual({
      letterId: "heh",
      form: "final",
      haraka: "damma",
    });
    expect(letterBlendTarget({ contentType: "letter", segments: [{ sound: "رَ", duration: 2 }] })).toEqual({
      letterId: "ra",
      form: "isolated",
      haraka: "fatha",
    });
  });

  it("is null for word mode and for a row with no letter", () => {
    expect(letterBlendTarget({ word: "باب" })).toBeNull();
    expect(letterBlendTarget({ contentType: "word", word: "ب" })).toBeNull();
    expect(letterBlendTarget({ contentType: "letter", word: "" })).toBeNull();
  });
});

describe("withLetterBlend (CM-D3f)", () => {
  it("a pick sends blendVersion 2, contentType letter and the reference; the preview rides along", () => {
    const legacy = { contentType: "letter" as const, word: "جـَ", segments: [{ sound: "جـَ", duration: 2 as const }], speed: "none" as const };
    const ref = toLetterBlendRef({ letterId: "jeem", form: "initial", haraka: "kasra", madd: false })!;
    const next = withLetterBlend(legacy, ref, { glyph: "جِـ", segment: { sound: "جِـ", duration: 2 } });
    expect(next).toEqual({
      blendVersion: 2,
      contentType: "letter",
      targetLetter: { letterId: "jeem", form: "initial", haraka: "kasra" },
      word: "جِـ",
      segments: [{ sound: "جِـ", duration: 2 }],
      speed: "none",
    });
    // no wordRef, no stages: the server refuses them on a letter blend
    expect("wordRef" in next || "stages" in next).toBe(false);
  });

  it("drops haraka none and madd from the picked reference", () => {
    expect(toLetterBlendRef({ letterId: "ba", form: "isolated", haraka: "none", madd: false })).toEqual({
      letterId: "ba",
      form: "isolated",
    });
    expect(toLetterBlendRef("x")).toBeNull();
  });

  it("switching mode clears the reference", () => {
    const row = { blendVersion: 2 as const, contentType: "letter" as const, targetLetter: { letterId: "ba", form: "isolated" } };
    expect(clearBlendFields(row)).toEqual({ contentType: "letter" });
  });
});
