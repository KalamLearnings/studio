import { describe, expect, it } from "vitest";
import { buildGraph } from "./graph";
import { SAMPLE } from "./fixtures";
import { allWords, gaps } from "./gaps";

const g = buildGraph(SAMPLE);

describe("gaps", () => {
  const byId = Object.fromEntries(gaps(g).map((x) => [x.id, x.items]));
  it("lists real spellings with no family, the most used first", () => {
    expect(byId["no-family"]).toEqual(["word:w-warda", "word:w-jml"]);
  });
  it("lists readings to confirm", () => {
    expect(byId["reading"]).toEqual(["word:w-warda", "word:w-jml"]);
  });
  it("lists spellings and families with several meanings", () => {
    expect(byId["several-meanings"]).toEqual(["word:w-jml", "family:camel"]);
  });
  it("lists words with no meaning, meanings with no picture and meanings no word names", () => {
    expect(byId["no-meaning"]).toEqual(["family:house"]);
    expect(byId["no-picture"]).toEqual(["concept:camel"]);
    expect(byId["no-word"]).toEqual(["concept:cat"]);
  });
});

describe("All words", () => {
  const all = allWords(g);
  it("has one card per word, by meaning", () => {
    expect(all.families.map((c) => c.family.id)).toEqual(["bear", "book", "camel", "house"]);
    const book = all.families[1];
    expect(book.headword?.arabic).toBe("كِتَاب");
    expect(book.picture?.assetId).toBe("pic-book");
    expect(book.others.map((o) => [o.word.id, o.readsAs?.id ?? null])).toEqual([
      ["w-ktb", "w-kitab"],
      ["w-kitabu", null],
    ]);
    expect(book.flags).toEqual([]);
  });
  it("flags what each card misses", () => {
    expect(all.families.find((c) => c.family.id === "house")?.flags).toEqual(["no-meaning"]);
    expect(all.families.find((c) => c.family.id === "camel")?.flags).toEqual(["no-picture", "several-meanings"]);
  });
  it("lists the loose spellings, the meanings no word names and the drills", () => {
    expect(all.loose.map((w) => w.id)).toEqual(["w-warda", "w-jml"]);
    expect(all.orphanMeanings.map((c) => c.slug)).toEqual(["cat"]);
    expect(all.drills.map((w) => w.id)).toEqual(["w-ba-drill"]);
    expect(all.counts).toEqual({ families: 4, spellings: 11, meanings: 4, pictures: 3 });
  });
});
