import { describe, expect, it } from "vitest";
import { buildGraph } from "./graph";
import { SAMPLE } from "./fixtures";
import { search, searchIndex } from "./search";

const index = searchIndex(buildGraph(SAMPLE));

describe("search", () => {
  it("finds Arabic with or without harakat, the exact spelling first", () => {
    expect(search(index, "كتاب")[0]).toBe("word:w-ktb");
    expect(search(index, "كِتَاب")).toContain("word:w-kitab");
    expect(search(index, "كِتَاب")).toContain("family:book");
  });
  it("folds ta marbuta", () => {
    expect(search(index, "ورده")).toEqual(["word:w-warda"]);
  });
  it("finds English meanings, glosses, transliteration and categories", () => {
    expect(search(index, "Camel").slice(0, 2)).toEqual(["family:camel", "concept:camel"]);
    expect(search(index, "kitab")).toContain("word:w-kitab");
    expect(search(index, "objects")).toEqual(["word:w-kitab"]);
  });
  it("finds pictures by their meaning and letters by name", () => {
    expect(search(index, "cat")).toEqual(expect.arrayContaining(["concept:cat", "picture:pic-cat"]));
    expect(search(index, "jeem")).toEqual(["letter:jeem"]);
  });
  it("returns nothing for an empty query, and honours the limit", () => {
    expect(search(index, "  ")).toEqual([]);
    expect(search(index, "a", 2)).toHaveLength(2);
  });
});
