import { describe, expect, it } from "vitest";
import { addCandidates, isRefusal, joinIssue, planAdd, planHeadword, planPseudo, planRemove, planSplit, planStartFamily, readingIssue, splitOffer } from "./connect";
import { SAMPLE } from "./fixtures";
import { buildGraph } from "./graph";
import type { NodeKey } from "./keys";
import { neighbourhood, type Box } from "./neighbourhood";
import { severalMeaningsInFamily, severalMeaningsOfWord } from "./meanings";
import { inverseOps } from "./ops";

const g = buildGraph(SAMPLE);
const ready = () => ({ status: "ready" as const, items: [] });
const boxOf = (focus: NodeKey, kind: Box["kind"]) => neighbourhood(g, focus, ready).boxes.find((b) => b.kind === kind && b.editable)!;
const word = (id: string) => g.words.get(id)!;

describe("refusals before sending", () => {
  it("refuses a drill, a headword leaving, and a reading in another family", () => {
    expect(joinIssue(g, word("w-ba-drill"), "book")).toMatch(/drill/);
    expect(joinIssue(g, word("w-kitab"), "bear")).toMatch(/dictionary form/);
    // كتاب is read as كِتَاب (in "book"): it cannot join "bear" alone.
    expect(joinIssue(g, word("w-ktb"), "bear")).toMatch(/same word/);
    expect(joinIssue(g, word("w-warda"), "book")).toBeNull();
  });
  it("explains readings in plain words", () => {
    expect(readingIssue(g, word("w-jml"), word("w-jamal"))).toBeNull();
    expect(readingIssue(g, word("w-jml"), word("w-kitab"))).toMatch(/same letters/);
    expect(readingIssue(g, word("w-jamal"), word("w-jumal"))).toMatch(/already fully vowelled/);
  });
});

describe("+ Add on a spelling", () => {
  it("offers families, the refused ones last with the reason, and says what it leaves", () => {
    const c = addCandidates(g, "word:w-kitabu", boxOf("word:w-kitabu", "forms"));
    expect(c.every((x) => x.key.startsWith("family:"))).toBe(true);
    expect(c.find((x) => x.key === "family:book")).toBeUndefined();
    expect(c[0].note).toMatch(/leaves "book"/);
  });
  it("offers the readings of an unvowelled spelling, both meanings of جمل", () => {
    const c = addCandidates(g, "word:w-jml", boxOf("word:w-jml", "readings"));
    expect(c.map((x) => [x.key, x.refusal])).toEqual([
      ["word:w-jamal", null],
      ["word:w-jumal", null],
    ]);
    const p = planAdd(g, "word:w-jml", boxOf("word:w-jml", "readings"), "word:w-jamal");
    expect(!isRefusal(p) && p.ops).toEqual([{ op: "setReadsAs", wordId: "w-jml", readsAsId: "w-jamal", prev: null }]);
  });
  it("from a vowelled spelling, offers the unvowelled ones to read as it", () => {
    const c = addCandidates(g, "word:w-jamal", boxOf("word:w-jamal", "readings"));
    expect(c.map((x) => x.key)).toEqual(["word:w-jml"]);
    const p = planAdd(g, "word:w-jamal", boxOf("word:w-jamal", "readings"), "word:w-jml");
    expect(!isRefusal(p) && p.ops).toEqual([{ op: "setReadsAs", wordId: "w-jml", readsAsId: "w-jamal", prev: null }]);
  });
  it("refuses a refused pick even if sent", () => {
    expect(planAdd(g, "word:w-kitab", boxOf("word:w-kitab", "forms"), "family:bear")).toEqual({ refusal: expect.stringMatching(/dictionary form/) });
  });
});

describe("removing and the dictionary form", () => {
  it("takes a spelling out of its word, except the dictionary form", () => {
    const forms = boxOf("word:w-kitabu", "forms");
    const p = planRemove(g, "word:w-kitabu", forms, "family:book");
    expect(p && !isRefusal(p) && p.ops).toEqual([{ op: "setFamily", wordId: "w-kitabu", familyId: null, prev: "book" }]);
    expect(planRemove(g, "word:w-kitab", boxOf("word:w-kitab", "forms"), "family:book")).toEqual({ refusal: expect.stringMatching(/dictionary form/) });
  });
  it("clears a reading either way", () => {
    const p = planRemove(g, "word:w-kitab", boxOf("word:w-kitab", "readings"), "word:w-ktb");
    expect(p && !isRefusal(p) && p.ops).toEqual([{ op: "setReadsAs", wordId: "w-ktb", readsAsId: null, prev: "w-kitab" }]);
  });
  it("unlinks a meaning, and has no remove on a worked-out box", () => {
    const p = planRemove(g, "family:book", boxOf("family:book", "meaning"), "concept:book");
    expect(p && !isRefusal(p) && inverseOps(p.ops)).toEqual([{ op: "linkConcept", familyId: "book", concept: "book" }]);
    const locked = neighbourhood(g, "word:w-ktb", ready).boxes.find((b) => b.kind === "meaning")!;
    expect(planRemove(g, "word:w-ktb", locked, "concept:book")).toBeUndefined();
  });
  it("makes another form the dictionary form", () => {
    const forms = boxOf("family:book", "forms");
    expect(planHeadword(g, "family:book", forms, "word:w-kitab")).toBeUndefined();
    expect(planHeadword(g, "family:book", forms, "word:w-kitabu")?.ops).toEqual([{ op: "setHeadword", familyId: "book", headwordId: "w-kitabu", prev: "w-kitab" }]);
  });
});

describe("practice words", () => {
  it("refuses a spelling in a family or with a reading, and clears a drill", () => {
    expect(planPseudo(g, "w-kitab")).toEqual({ refusal: expect.stringMatching(/no family/) });
    expect(planPseudo(g, "w-warda")).toMatchObject({ ops: [{ op: "setPseudo", isPseudo: true }] });
    expect(planPseudo(g, "w-ba-drill")).toMatchObject({ ops: [{ op: "setPseudo", isPseudo: false, prev: true }] });
  });
});

describe("starting a family and splitting meanings", () => {
  it("starts a family with the spelling as its dictionary form", () => {
    const p = planStartFamily(g, "w-warda", { id: "rose", gloss: "rose" });
    expect(!isRefusal(p) && p.ops).toEqual([{ op: "createFamily", familyId: "rose", gloss: "rose", headwordId: "w-warda" }]);
    expect(planStartFamily(g, "w-warda", { id: "book", gloss: null })).toEqual({ refusal: expect.stringMatching(/already exists/) });
  });
  it("moves the meaning without the dictionary form out of a mixed family", () => {
    const [m] = severalMeaningsInFamily(g, "camel");
    const head = m.meanings.find((x) => x.words.some((w) => w.id === "w-jamal"))!;
    const other = m.meanings.find((x) => x !== head)!;
    expect(splitOffer(g, m, head)).toBeNull();
    expect(splitOffer(g, m, other)).toBe("move");
    const p = planSplit(g, other, { id: "sentences", gloss: "sentences" });
    expect(!isRefusal(p) && p.ops).toEqual([
      { op: "setFamily", wordId: "w-jumal", familyId: null, prev: "camel" },
      { op: "createFamily", familyId: "sentences", gloss: "sentences", headwordId: "w-jumal" },
    ]);
    expect(planSplit(g, head, { id: "x", gloss: null })).toEqual({ refusal: expect.stringMatching(/dictionary form/) });
  });
  it("for an unvowelled spelling, offers nothing while the families are mixed in one", () => {
    const m = severalMeaningsOfWord(g, "w-jml")!;
    expect(m.needsSplit).toBe(true);
    expect(m.meanings.map((x) => splitOffer(g, m, x)).sort()).toEqual(["move", null].sort());
  });
});
