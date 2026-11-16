import { describe, expect, it } from "vitest";
import type { WordUsageItem } from "../api/wordUsage";
import { buildGraph } from "./graph";
import { SAMPLE } from "./fixtures";
import type { NodeKey } from "./keys";
import { activityRows, existsInGraph, neighbourhood, usageUnitsFor, type Box, type UsageLookup } from "./neighbourhood";

const g = buildGraph(SAMPLE);

const use = (o: Partial<WordUsageItem> = {}): WordUsageItem => ({
  activity_id: "a1",
  type: "tap_letter_in_word",
  node_id: "n1",
  curriculum_id: "c1",
  node_title: "Letter  Kaf",
  topic_title: "Kaf",
  curriculum_title: "Level 1",
  role: "target",
  ...o,
});

const ready = (byUnit: Record<string, WordUsageItem[]>): UsageLookup => (unit) =>
  unit in byUnit ? { status: "ready", items: byUnit[unit] } : { status: "ready", items: [] };
const loading: UsageLookup = () => ({ status: "loading" });

const boxes = (focus: NodeKey, usage: UsageLookup = ready({})) => neighbourhood(g, focus, usage).boxes;
const byKind = (bs: Box[], kind: Box["kind"]) => bs.filter((b) => b.kind === kind);
const keys = (b: Box | undefined) => b?.items.map((i) => i.key);

describe("a spelling in focus", () => {
  it("puts its word and the other forms above, editable", () => {
    const [forms] = byKind(boxes("word:w-ktb"), "forms");
    expect(forms.area).toBe("top");
    expect(forms.title).toBe("Forms of the word");
    expect(keys(forms)).toEqual(["family:book", "word:w-kitab", "word:w-kitabu"]);
    expect(forms.items[1].head).toBe(true);
    expect(forms.editable).toBe(true);
    expect(forms.accepts).toBe("family");
  });
  it("shows how it is read, on the left", () => {
    const [r] = byKind(boxes("word:w-ktb"), "readings");
    expect(r.area).toBe("left");
    expect(r.title).toBe("Other readings");
    expect(r.items).toEqual([{ key: "word:w-kitab", tag: "read as", flags: [] }]);
    expect(r.missing).toBe(false);
    const [inbound] = byKind(boxes("word:w-kitab"), "readings");
    expect(keys(inbound)).toEqual(["word:w-ktb"]);
    expect(inbound.items[0].tag).toBe("reads as this");
  });
  it("rings a missing reading and a missing family", () => {
    const bs = boxes("word:w-warda");
    expect(byKind(bs, "readings")[0].missing).toBe(true);
    expect(byKind(bs, "forms")[0].missing).toBe(true);
    expect(byKind(bs, "meaning")).toEqual([]);
  });
  it("has no family by rule when it is a drill", () => {
    const [forms] = byKind(boxes("word:w-ba-drill"), "forms");
    expect(forms.missing).toBe(false);
    expect(forms.empty).toMatch(/drill/);
  });
  it("shows meaning and pictures through the family, locked", () => {
    const bs = boxes("word:w-ktb");
    const [meaning] = byKind(bs, "meaning");
    const [pics] = byKind(bs, "pictures");
    expect(keys(meaning)).toEqual(["concept:book"]);
    expect(keys(pics)).toEqual(["picture:pic-book"]);
    for (const b of [meaning, pics]) {
      expect(b.area).toBe("right");
      expect(b.editable).toBe(false);
      expect(b.accepts).toBeUndefined();
      expect(b.through).toMatch(/family/);
    }
  });
  it("works out its letters, in order and once each", () => {
    const [letters] = byKind(boxes("word:w-kitab"), "letters");
    expect(keys(letters)).toEqual(["letter:kaf", "letter:ta", "letter:alif", "letter:ba"]);
    expect(letters.editable).toBe(false);
  });
  it("lists the lessons that use it, one row per activity", () => {
    const [u] = byKind(
      boxes("word:w-kitab", ready({ "word:w-kitab": [use(), use({ role: "distractor" }), use({ activity_id: "a2" })] })),
      "usedIn",
    );
    expect(u.title).toBe("Used in lessons");
    expect(u.state).toBe("ready");
    expect(u.activities?.map((a) => [a.activityId, a.roles])).toEqual([["a1", ["target", "distractor"]], ["a2", ["target"]]]);
    expect(u.activities?.[0].path).toBe("Level 1 › Kaf › Letter Kaf");
  });
  it("waits for the lessons, and says when they fail", () => {
    expect(byKind(boxes("word:w-kitab", loading), "usedIn")[0].state).toBe("loading");
    expect(byKind(boxes("word:w-kitab", () => ({ status: "error" })), "usedIn")[0].state).toBe("error");
  });
  it("suggests a split for جمل", () => {
    const n = neighbourhood(g, "word:w-jml", ready({}));
    expect(n.meanings).toHaveLength(1);
    expect(neighbourhood(g, "word:w-ktb", ready({})).meanings).toEqual([]);
  });
});

describe("a word (family) in focus", () => {
  it("puts its meaning above and its forms on the left", () => {
    const bs = boxes("family:book");
    const [meaning] = byKind(bs, "meaning");
    expect(meaning.area).toBe("top");
    expect(keys(meaning)).toEqual(["concept:book"]);
    expect(meaning.accepts).toBe("concept");
    const [forms] = byKind(bs, "forms");
    expect(forms.area).toBe("left");
    expect(keys(forms)).toEqual(["word:w-kitab", "word:w-ktb", "word:w-kitabu"]);
    expect(forms.items.find((i) => i.key === "word:w-ktb")?.tag).toBe("read as another");
  });
  it("rings a missing meaning, and a meaning with no picture", () => {
    expect(byKind(boxes("family:house"), "meaning")[0].missing).toBe(true);
    expect(byKind(boxes("family:house"), "pictures")[0].missing).toBe(false);
    expect(byKind(boxes("family:camel"), "pictures")[0].missing).toBe(true);
  });
  it("gathers the lessons of every form", () => {
    const [u] = byKind(
      boxes("family:book", ready({ "word:w-kitab": [use()], "word:w-ktb": [use(), use({ activity_id: "a3" })] })),
      "usedIn",
    );
    expect(u.activities?.map((a) => [a.activityId, a.wordIds])).toEqual([["a1", ["w-kitab", "w-ktb"]], ["a3", ["w-ktb"]]]);
    expect(usageUnitsFor(g, "family:book")).toEqual(["word:w-kitab", "word:w-ktb", "word:w-kitabu"]);
  });
  it("suggests splitting a family that holds two words", () => {
    expect(neighbourhood(g, "family:camel", ready({})).meanings).toHaveLength(1);
  });
});

describe("a meaning in focus", () => {
  it("shows the words for it, its pictures and, worked out, their spellings", () => {
    const bs = boxes("concept:book");
    expect(bs.map((b) => [b.area, b.title])).toEqual([
      ["left", "Words for it"],
      ["right", "Pictures"],
      ["bottom", "Forms of the word"],
    ]);
    expect(keys(bs[0])).toEqual(["family:book"]);
    expect(bs[2].editable).toBe(false);
  });
  it("rings a meaning no word names", () => {
    expect(boxes("concept:cat")[0].missing).toBe(true);
    expect(boxes("concept:camel")[1].missing).toBe(true);
  });
});

describe("a picture and a letter in focus", () => {
  it("shows a picture's meaning and the words that show it", () => {
    const bs = boxes("picture:pic-book");
    expect(bs[0].title).toBe("Meaning");
    expect(keys(bs[0])).toEqual(["concept:book"]);
    expect(keys(bs[1])).toEqual(["family:book"]);
  });
  it("lists a letter's spellings and says its lessons are not available yet", () => {
    const bs = neighbourhood(g, "letter:jeem", () => ({ status: "unavailable", reason: "later" })).boxes;
    expect(keys(bs[0])).toEqual(["word:w-jamal", "word:w-jml", "word:w-jumal"]);
    expect(bs[1]).toMatchObject({ kind: "usedIn", state: "unavailable", stateText: "later" });
  });
});

describe("unknown focus", () => {
  it("has no boxes", () => {
    expect(boxes("family:nope")).toEqual([]);
    expect(boxes("activity:a1")).toEqual([]);
    expect(existsInGraph(g, "family:book")).toBe(true);
    expect(existsInGraph(g, "activity:a1")).toBe(false);
  });
});

describe("activityRows", () => {
  it("keeps the backend's order and tidies the path", () => {
    const rows = activityRows([{ wordId: "x", items: [use({ activity_id: "b", topic_title: "" }), use({ activity_id: "a" })] }]);
    expect(rows.map((r) => r.activityId)).toEqual(["b", "a"]);
    expect(rows[0].path).toBe("Level 1 › Letter Kaf");
  });
});
