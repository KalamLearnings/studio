import { describe, expect, it } from "vitest";
import { describeMadd, effectiveCounts } from "./describeMadd";

describe("describeMadd", () => {
  it("is empty for no text", () => {
    expect(describeMadd(undefined)).toEqual({ status: "empty" });
    expect(describeMadd("  ")).toEqual({ status: "empty" });
  });

  it("finds the one madd, its letter, kind and default counts", () => {
    const d = describeMadd("قَالَ");
    expect(d).toMatchObject({ status: "one", position: 2, kind: "natural", defaultCounts: 2 });
    expect(describeMadd("جَاءَ")).toMatchObject({ status: "one", kind: "muttasil", defaultCounts: 4 });
    expect(describeMadd("دَابَّة")).toMatchObject({ status: "one", kind: "lazim", defaultCounts: 6 });
  });

  it("reports a word with no madd and a word with several", () => {
    expect(describeMadd("كَتَبَ")).toEqual({ status: "none" });
    expect(describeMadd("قَالَ قِيلَ")).toEqual({ status: "many", count: 2 });
  });

  it("uses the override over the default", () => {
    const d = describeMadd("قَالَ");
    expect(effectiveCounts(d, undefined)).toBe(2);
    expect(effectiveCounts(d, 4)).toBe(4);
    expect(effectiveCounts(describeMadd("كَتَبَ"), 4)).toBeNull();
  });
});
