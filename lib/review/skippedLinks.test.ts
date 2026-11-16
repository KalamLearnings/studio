import { describe, expect, it } from "vitest";
import { loadSkippedLinks, saveSkippedLinks, skippedLinksKey } from "./skippedLinks";

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

describe("skipped links", () => {
  it("keeps a list per staff member", () => {
    const s = memory();
    saveSkippedLinks("u1", ["a", "b", "a"], s);
    expect(loadSkippedLinks("u1", s)).toEqual(["a", "b"]);
    expect(loadSkippedLinks("u2", s)).toEqual([]);
    expect(skippedLinksKey(null)).toContain("anonymous");
  });
  it("survives storage that throws or holds junk", () => {
    const throwing = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(loadSkippedLinks("u1", throwing)).toEqual([]);
    expect(() => saveSkippedLinks("u1", ["a"], throwing)).not.toThrow();
    const junk = memory();
    junk.setItem(skippedLinksKey("u1"), "{not json");
    expect(loadSkippedLinks("u1", junk)).toEqual([]);
    expect(loadSkippedLinks("u1", null)).toEqual([]);
  });
});
