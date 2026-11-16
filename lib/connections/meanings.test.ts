import { describe, expect, it } from "vitest";
import { buildGraph } from "./graph";
import { SAMPLE, WORDS } from "./fixtures";
import {
  familiesWithSeveralMeanings,
  innerVowelling,
  severalMeaningsInFamily,
  severalMeaningsOfWord,
  wordsWithSeveralMeanings,
} from "./meanings";

const g = buildGraph(SAMPLE);

describe("innerVowelling", () => {
  it("ignores the last letter (case endings, tanween)", () => {
    expect(innerVowelling("كِتَاب")).toBe(innerVowelling("كِتَابُ"));
    expect(innerVowelling("دُبّ")).toBe(innerVowelling("دُبٌّ"));
  });
  it("tells different words apart", () => {
    expect(innerVowelling("جَمَلُ")).not.toBe(innerVowelling("جُمَلُ"));
  });
  it("does not care about mark order", () => {
    expect(innerVowelling("\u0645\u064F\u062F\u0651\u064E\u0629")).toBe(innerVowelling("\u0645\u064F\u062F\u064E\u0651\u0629"));
  });
});

describe("one spelling, several words (owner decision 5)", () => {
  it("finds جمل and its two words", () => {
    const s = severalMeaningsOfWord(g, "w-jml");
    expect(s?.skeleton).toBe("جمل");
    expect(s?.meanings.map((m) => m.words.map((w) => w.id))).toEqual([["w-jamal"], ["w-jumal"]]);
    expect(s?.needsSplit).toBe(true);
    expect(s?.mixedFamilyId).toBe("camel");
  });
  it("says nothing for a spelling with one reading, a vowelled one, or a drill", () => {
    expect(severalMeaningsOfWord(g, "w-ktb")).toBeNull();
    expect(severalMeaningsOfWord(g, "w-jamal")).toBeNull();
    expect(severalMeaningsOfWord(g, "w-ba-drill")).toBeNull();
    expect(severalMeaningsOfWord(g, "missing")).toBeNull();
  });
  it("needs no split once each word has its own family", () => {
    const split = buildGraph({
      ...SAMPLE,
      words: WORDS.map((w) => (w.id === "w-jumal" ? { ...w, family_id: "sentences" } : w)),
    });
    const s = severalMeaningsOfWord(split, "w-jml");
    expect(s?.meanings).toHaveLength(2);
    expect(s?.needsSplit).toBe(false);
    expect(severalMeaningsInFamily(split, "camel")).toEqual([]);
  });
  it("flags a family that holds two words", () => {
    const [s] = severalMeaningsInFamily(g, "camel");
    expect(s.skeleton).toBe("جمل");
    expect(s.meanings).toHaveLength(2);
    expect(severalMeaningsInFamily(g, "book")).toEqual([]);
    expect(familiesWithSeveralMeanings(g)).toEqual(["camel"]);
  });
  it("lists the spellings to split for the gaps rail", () => {
    expect(wordsWithSeveralMeanings(g).map((w) => w.id)).toEqual(["w-jml"]);
  });
});
