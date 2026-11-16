import { describe, expect, it } from "vitest";
import { readingItems, sameLetterSpellings, spellingItems, wordItems, type BankWord } from "./words";

const w = (id: string, arabic: string, usage_count = 0, extra: Partial<BankWord> = {}): BankWord => ({
  id,
  arabic,
  usage_count,
  created_at: "2026-11-01T00:00:00Z",
  is_pseudo: false,
  family_id: null,
  reads_as_id: null,
  retired_at: null,
  reviewed_at: null,
  reviewed_by: null,
  ...extra,
});

const bank: BankWord[] = [
  w("kitab", "كِتَاب", 2, { family_id: "book" }),
  w("kitabBare", "كتاب", 1, { family_id: "book" }),
  w("bab", "بَاب", 7),
  w("man", "مَنْ", 5),
  w("walad", "وَلَدُ", 2, { family_id: "boy", reviewed_at: "2026-11-10T00:00:00Z", reviewed_by: "u1" }),
  w("waladBare", "ولد", 1, { family_id: "boy", reads_as_id: "walad" }),
  w("partial", "صُبح", 1),
];

describe("spellingItems", () => {
  const items = spellingItems(bank, [{ wordId: "man", decision: "pseudo" }]);
  const byId = new Map(items.map((i) => [i.id, i]));

  it("turns the review queue into items, most used first", () => {
    expect(items.map((i) => i.id)).toEqual(["bab", "man", "kitab", "walad", "partial"]);
    expect(byId.get("bab")).toMatchObject({ key: "spelling:bab", kind: "spelling", title: "بَاب", state: "todo", usage: 7 });
  });
  it("shows the shared notes and the approvals", () => {
    expect(byId.get("man")?.state).toBe("noted_pseudo");
    expect(byId.get("walad")).toMatchObject({ state: "approved", decidedBy: "u1", decidedAt: "2026-11-10T00:00:00Z" });
  });
  it("is bulk safe only for an unflagged, fully vowelled spelling still to review", () => {
    expect(byId.get("bab")?.bulkSafe).toBe(true);
    expect(byId.get("man")?.bulkSafe).toBe(false); // two letters, and noted
    expect(byId.get("partial")?.bulkSafe).toBe(false); // partly vowelled
    expect(byId.get("walad")?.bulkSafe).toBe(false); // already approved
  });
  it("says the class, the use and the flags in one line", () => {
    expect(byId.get("man")?.context).toBe("Fully vowelled · used by 5 · Two consonants");
    expect(byId.get("kitab")?.familyId).toBe("book");
  });
});

describe("readingItems", () => {
  const items = readingItems(bank, new Set(["partial"]));
  const byId = new Map(items.map((i) => [i.id, i]));
  it("lists unvowelled spellings with no reading, with their candidates", () => {
    const r = byId.get("kitabBare");
    expect(r).toMatchObject({ key: "reading:kitabBare", state: "todo" });
    expect(r?.data.candidates.map((c) => c.id)).toEqual(["kitab"]);
    expect(r?.context).toBe("Read as كِتَاب? · family book");
  });
  it("shows a confirmed reading as decided", () => {
    expect(byId.get("waladBare")).toMatchObject({ state: "approved" });
    expect(byId.get("waladBare")?.data.readsAs?.id).toBe("walad");
  });
  it("leaves out words already in the spelling queue", () => {
    expect(byId.has("partial")).toBe(false);
  });
  it("says so when no vowelled spelling exists", () => {
    const only = readingItems([w("x", "قلم")], new Set());
    expect(only[0].data.candidates).toEqual([]);
    expect(only[0].context).toBe("No vowelled spelling with these letters yet");
  });
});

describe("wordItems", () => {
  it("never shows a word twice", () => {
    const keys = wordItems(bank, []).map((i) => i.id);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain("partial");
    expect(keys).toContain("kitabBare");
  });
});

describe("sameLetterSpellings", () => {
  it("lists the other live spellings with the same letters", () => {
    expect(sameLetterSpellings(bank[0], bank).map((x) => x.id)).toEqual(["kitabBare"]);
  });
});
