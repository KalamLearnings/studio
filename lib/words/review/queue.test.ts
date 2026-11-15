import { describe, expect, it } from "vitest";
import {
  buildReviewQueue,
  exportDecisionsCsv,
  filterQueue,
  queueCounts,
  validateNote,
  type QueueWord,
} from "./queue";
import { parseNotes, withNote } from "./notes";

const w = (id: string, arabic: string, usage_count = 0, extra: Partial<QueueWord> = {}): QueueWord => ({
  id, arabic, usage_count, created_at: "2026-01-01", ...extra,
});

const BAB = "بَاب";
const KITAB = "كِتَابٌ";
const bank: QueueWord[] = [
  w("a", "كِتَابٌ", 2),
  w("b", "بَابُ", 7),
  w("c", "كتاب", 9), // unvowelised: not queued
  w("d", "بَ", 4), // letter: not queued
  w("e", "كِتَاب", 7),
  w("f", "مَنْ", 5), // two consonants
  w("g", "قَلَمٌ", 1, { retired_at: "2026-02-01" }), // retired: left out
  w("h", "سَلَامُ", 3, { is_pseudo: true }), // flagged pseudo: left out
];

describe("buildReviewQueue", () => {
  const queue = buildReviewQueue(bank);
  it("queues only vowelled real spellings and variants, most used first", () => {
    expect(queue.map((r) => r.word.id)).toEqual(["b", "e", "f", "a"]);
    expect(queue.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
  });
  it("leaves out unvowelised, letters, retired and pseudo rows", () => {
    const ids = queue.map((r) => r.word.id);
    for (const id of ["c", "d", "g", "h"]) expect(ids).not.toContain(id);
  });
  it("flags two-consonant spellings", () => {
    expect(queue.find((r) => r.word.id === "f")?.flags).toContain("two_letters");
  });
  it("flags a row no activity uses", () => {
    const q = buildReviewQueue([w("z", KITAB, 0)]);
    expect(q[0].flags).toContain("unused");
  });
  it("suggests joining the base for a case-ending variant", () => {
    const q = buildReviewQueue([w("1", "كِتَابُ", 3), w("2", "كِتَابَ", 1)]);
    const variant = q.find((r) => r.class === "case_variant");
    expect(variant?.action.kind).toBe("join_base");
    expect(variant?.action.text).toContain("Case-ending");
  });
  it("suggests adding harakat for a partly vowelled row", () => {
    const q = buildReviewQueue([w("p", "كِتاب", 1)]);
    expect(q[0].class).toBe("real_partial");
    expect(q[0].action.kind).toBe("add_harakat");
  });
  it("marks a row with reviewed_at as reviewed", () => {
    const q = buildReviewQueue([w("r", KITAB, 1, { reviewed_at: "2026-11-15T00:00:00Z", reviewed_by: "u" })]);
    expect(q[0].reviewed).toBe(true);
    expect(queueCounts(q)).toEqual({ todo: 0, reviewed: 1, all: 1 });
  });
  it("flags many vowelings of the same letters", () => {
    const q = buildReviewQueue(["بَابَ", "بِابِ", "بُابُ", "بَابِ"].map((t, i) => w(`p${i}`, t, 1)));
    expect(q.every((r) => r.flags.includes("vowel_permutations"))).toBe(true);
    expect(BAB.length).toBeGreaterThan(0);
  });
});

describe("filterQueue", () => {
  const queue = buildReviewQueue([w("a", KITAB, 2, { reviewed_at: "x", reviewed_by: "u" }), w("f", "مَنْ", 5)]);
  it("filters by status", () => {
    expect(filterQueue(queue, { status: "todo", slice: "all", search: "" }).map((r) => r.word.id)).toEqual(["f"]);
    expect(filterQueue(queue, { status: "reviewed", slice: "all", search: "" }).map((r) => r.word.id)).toEqual(["a"]);
  });
  it("filters by flag and by search", () => {
    expect(filterQueue(queue, { status: "all", slice: "two_letters", search: "" }).map((r) => r.word.id)).toEqual(["f"]);
    expect(filterQueue(queue, { status: "all", slice: "all", search: "مَنْ" }).map((r) => r.word.id)).toEqual(["f"]);
  });
});

describe("validateNote", () => {
  const row = buildReviewQueue([w("a", KITAB, 2)])[0];
  it("accepts pseudo with no correction", () => {
    expect(validateNote(row, { decision: "pseudo" })).toBeNull();
  });
  it("requires a correction for wrong", () => {
    expect(validateNote(row, { decision: "wrong" })).toMatch(/corrected spelling/);
  });
  it("refuses a correction that changes the letters", () => {
    expect(validateNote(row, { decision: "wrong", correctedSpelling: "قَلَمٌ" })).toMatch(/letters/);
  });
  it("refuses an unchanged correction", () => {
    expect(validateNote(row, { decision: "wrong", correctedSpelling: KITAB })).toMatch(/same/);
  });
  it("accepts a harakat-only correction", () => {
    expect(validateNote(row, { decision: "wrong", correctedSpelling: "كِتَابٍ" })).toBeNull();
  });
});

describe("exportDecisionsCsv", () => {
  const rows = buildReviewQueue([
    w("a", KITAB, 2, { reviewed_at: "x", reviewed_by: "u" }),
    w("f", "مَنْ", 5),
    w("k", "بَابُ", 1),
  ]);
  const csv = exportDecisionsCsv(rows, [
    { wordId: "f", decision: "pseudo" },
    { wordId: "k", decision: "wrong", correctedSpelling: "بَابٌ" },
  ]);
  const lines = csv.trim().split("\n");
  it("uses the queue columns the apply script reads", () => {
    expect(lines[0]).toBe(
      "rank,word_id,arabic,class,activities,as_target,as_distractor_only,edges,suspect,skeleton_siblings,family_role,family_headword,family_members,gloss_proposed,decision,gloss_en,corrected_spelling",
    );
  });
  it("exports approved as real, notes as pseudo and wrong with the correction", () => {
    const cell = (id: string) => lines.find((l) => l.split(",")[1] === id)!.split(",");
    expect(cell("a")[14]).toBe("real");
    expect(cell("f")[14]).toBe("pseudo");
    expect(cell("k")[14]).toBe("wrong");
    expect(cell("k")[16]).toBe("بَابٌ");
  });
  it("skips undecided rows", () => {
    const only = exportDecisionsCsv(rows, []).trim().split("\n");
    expect(only).toHaveLength(2);
  });
});

describe("notes", () => {
  it("parses only valid notes and survives bad JSON", () => {
    expect(parseNotes("not json")).toEqual([]);
    expect(parseNotes(JSON.stringify([{ wordId: "a", decision: "pseudo" }, { wordId: 1 }, null]))).toEqual([
      { wordId: "a", decision: "pseudo" },
    ]);
  });
  it("replaces and clears a word's note", () => {
    const one = withNote([], "a", { wordId: "a", decision: "pseudo" });
    const two = withNote(one, "a", { wordId: "a", decision: "wrong", correctedSpelling: "x" });
    expect(two).toHaveLength(1);
    expect(two[0].decision).toBe("wrong");
    expect(withNote(two, "a", null)).toEqual([]);
  });
});
