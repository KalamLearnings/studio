import { describe, expect, it } from "vitest";
import type { ConceptDetail, WordFamily } from "../types/wordFamilies";
import {
  conceptGapCounts,
  familyGapCounts,
  familyRows,
  moveRef,
  sameRef,
  visibleConcepts,
  visibleFamilies,
  type LibraryWord,
} from "./library";

const fam = (id: string, over: Partial<WordFamily> = {}): WordFamily => ({
  id,
  headword_id: null,
  gloss_en: id,
  notes: null,
  created_at: null,
  updated_at: null,
  ...over,
});
const word = (id: string, arabic: string, over: Partial<LibraryWord> = {}): LibraryWord => ({
  id,
  arabic,
  is_pseudo: false,
  family_id: null,
  reads_as_id: null,
  retired_at: null,
  usage_count: 1,
  reviewed_at: null,
  ...over,
});
const concept = (slug: string, families: WordFamily[], pictures: Array<{ status: string }> = []): ConceptDetail =>
  ({
    id: slug,
    slug,
    name: { en: slug },
    kind: "object",
    metadata: {},
    created_at: null,
    updated_at: null,
    unitKey: `concept:${slug}`,
    families,
    pictures: pictures.map((p, i) => ({ assetId: `a${i}`, url: "", status: p.status, label: {}, link: {} })),
  }) as unknown as ConceptDetail;

const BOOK = fam("book", { headword_id: "w1", gloss_en: "book" });
const BOY = fam("boy", { gloss_en: "boy" });
const WORDS = [
  word("w1", "كِتَاب", { family_id: "book", reviewed_at: "2026-01-01" }),
  word("w2", "كتاب", { family_id: "book" }),
  word("w3", "وَلَد", { family_id: "boy", reviewed_at: "2026-01-01" }),
  word("w4", "كُتُب", { family_id: "book", retired_at: "2026-01-01" }),
];

describe("family rows", () => {
  it("counts live members, unreviewed spellings and readings to confirm", () => {
    const [book] = familyRows([BOOK], WORDS, []);
    expect(book.headword).toBe("كِتَاب");
    expect(book.members).toBe(2);
    expect(book.unreviewed).toBe(1);
    expect(book.readings).toBe(1);
    expect(book.concepts).toEqual([]);
  });

  it("does not call a family conceptless before the concepts load", () => {
    const rows = familyRows([BOOK, BOY], WORDS, null);
    expect(rows[0].concepts).toBeNull();
    expect(visibleFamilies(rows, "no-concept", "")).toEqual([]);
  });

  it("filters by gap and counts each gap", () => {
    const rows = familyRows([BOOK, BOY], WORDS, [concept("book", [BOOK])]);
    expect(visibleFamilies(rows, "no-concept", "").map((r) => r.family.id)).toEqual(["boy"]);
    expect(visibleFamilies(rows, "no-headword", "").map((r) => r.family.id)).toEqual(["boy"]);
    expect(visibleFamilies(rows, "unreviewed", "").map((r) => r.family.id)).toEqual(["book"]);
    expect(familyGapCounts(rows)).toEqual({ all: 2, "no-concept": 1, "no-headword": 1, unreviewed: 1, readings: 1 });
  });

  it("searches id, gloss, headword (harakat folded) and concept", () => {
    const rows = familyRows([BOOK, BOY], WORDS, [concept("volume", [BOOK])]);
    expect(visibleFamilies(rows, "all", "كتاب").map((r) => r.family.id)).toEqual(["book"]);
    expect(visibleFamilies(rows, "all", "BO").map((r) => r.family.id)).toEqual(["book", "boy"]);
    expect(visibleFamilies(rows, "all", "volume").map((r) => r.family.id)).toEqual(["book"]);
  });
});

describe("concepts", () => {
  const list = [
    concept("moon", [], []),
    concept("book", [BOOK], [{ status: "active" }]),
    concept("sun", [BOY], [{ status: "broken" }]),
  ];
  it("filters by gap", () => {
    expect(visibleConcepts(list, "no-picture", "").map((c) => c.slug)).toEqual(["moon"]);
    expect(visibleConcepts(list, "no-family", "").map((c) => c.slug)).toEqual(["moon"]);
    expect(visibleConcepts(list, "picture-problem", "").map((c) => c.slug)).toEqual(["sun"]);
    expect(conceptGapCounts(list)).toEqual({ all: 3, "no-picture": 1, "picture-problem": 1, "no-family": 1 });
  });
  it("searches slug, names and linked families, in name order", () => {
    expect(visibleConcepts(list, "all", "").map((c) => c.slug)).toEqual(["book", "moon", "sun"]);
    expect(visibleConcepts(list, "all", "boy").map((c) => c.slug)).toEqual(["sun"]);
  });
});

describe("refs", () => {
  it("compares and moves", () => {
    const a = { type: "family" as const, id: "a" };
    const b = { type: "family" as const, id: "b" };
    expect(sameRef(a, { type: "family", id: "a" })).toBe(true);
    expect(sameRef(a, { type: "concept", slug: "a" })).toBe(false);
    expect(moveRef([a, b], null, 1)).toEqual(a);
    expect(moveRef([a, b], a, 1)).toEqual(b);
    expect(moveRef([a, b], b, 1)).toEqual(b);
    expect(moveRef([], a, 1)).toBeNull();
  });
});
