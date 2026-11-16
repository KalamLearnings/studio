import { describe, expect, it } from "vitest";
import { canApplySuggestion, harakatDiff, sourceLabel, verdictText } from "./wordChecks";

describe("word checks", () => {
  it("labels sources and verdicts", () => {
    expect(sourceLabel("catt_camel")).toContain("CAMeL");
    expect(sourceLabel("llm:claude-opus-5-5")).toBe("Language model (claude-opus-5-5)");
    expect(sourceLabel("other")).toBe("other");
    expect(verdictText("flag_vowels").tone).toBe("flag");
    expect(verdictText("likely_drill").tone).toBe("note");
    expect(verdictText("new_verdict")).toEqual({ label: "new_verdict", tone: "note" });
  });

  it("diffs harakat letter by letter", () => {
    const d = harakatDiff("نُفُعُ", "نَفَعَ")!;
    expect(d.map((u) => u.base).join("")).toBe("نفع");
    expect(d.every((u) => u.changed)).toBe(true);
    const same = harakatDiff("كِتَاب", "كِتَابٌ")!;
    expect(same.map((u) => u.changed)).toEqual([false, false, false, true]);
  });

  it("treats shadda order as the same mark set", () => {
    expect(harakatDiff("مَدَّ", "مَدَّ")!.some((u) => u.changed)).toBe(false);
    expect(harakatDiff("مَدَّ", "مَدَّ".replace("َّ", "َّ").normalize("NFD"))!.some((u) => u.changed)).toBe(false);
  });

  it("refuses a diff when the letters differ", () => {
    expect(harakatDiff("ارْض", "أَرْض")).toBeNull();
  });

  it("only a same-letters, different-harakat suggestion can be applied", () => {
    expect(canApplySuggestion("نُفُعُ", { suggested_text: "نَفَعَ" })).toBe(true);
    expect(canApplySuggestion("نُفُعُ", { suggested_text: "نُفُعُ" })).toBe(false);
    expect(canApplySuggestion("ارْض", { suggested_text: "أَرْض" })).toBe(false);
    expect(canApplySuggestion("نُفُعُ", { suggested_text: null })).toBe(false);
  });
});
