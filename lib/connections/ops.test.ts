import { describe, expect, it, vi } from "vitest";
import { fullyUndoable, inverseOps, redoOps, OpsError, planMoveIntoFamily, runOps, type ConnectApi, type Op, type SpellingLookup } from "./ops";

const fakeApi = (fail?: (name: string, args: unknown[]) => boolean) => {
  const calls: string[] = [];
  const handler = (name: string) =>
    vi.fn(async (...args: unknown[]) => {
      calls.push(`${name}(${args.map((a) => JSON.stringify(a)).join(",")})`);
      if (fail?.(name, args)) throw Object.assign(new Error("refused"), { code: "WORD_IS_HEADWORD", status: 409 });
      return {};
    });
  const api: ConnectApi = {
    setWordFamily: handler("setWordFamily"),
    setWordReadsAs: handler("setWordReadsAs"),
    updateWordFamily: handler("updateWordFamily"),
    createWordFamily: handler("createWordFamily"),
    linkFamilyToConcept: handler("linkFamilyToConcept"),
    unlinkFamilyFromConcept: handler("unlinkFamilyFromConcept"),
    attachConceptPicture: handler("attachConceptPicture"),
    detachConceptPicture: handler("detachConceptPicture"),
    setWordPseudo: handler("setWordPseudo"),
    createConcept: handler("createConcept"),
  };
  return { api, calls };
};

const rows: Record<string, { familyId: string | null; readsAsId: string | null }> = {
  jumal: { familyId: "camel", readsAsId: null },
  jml: { familyId: "camel", readsAsId: "jumal" },
  loose: { familyId: null, readsAsId: null },
};
const lookup: SpellingLookup = (id) => rows[id];

describe("planMoveIntoFamily", () => {
  it("takes rows out first, creates, then puts the read-as rows in before their readers", () => {
    const ops = planMoveIntoFamily(lookup, { familyId: "sentences", create: { gloss: "sentences" }, headwordId: "jumal", wordIds: ["jml", "loose"] });
    expect(ops).toEqual([
      { op: "setFamily", wordId: "jumal", familyId: null, prev: "camel" },
      { op: "setFamily", wordId: "jml", familyId: null, prev: "camel" },
      { op: "createFamily", familyId: "sentences", gloss: "sentences", headwordId: "jumal" },
      { op: "setFamily", wordId: "loose", familyId: "sentences", prev: null },
      { op: "setFamily", wordId: "jml", familyId: "sentences", prev: null },
    ]);
  });
  it("sets the headword of an existing family that has none, and the readings", () => {
    const ops = planMoveIntoFamily(lookup, { familyId: "camel", headwordId: "loose", currentHeadwordId: null, wordIds: ["jumal"], readings: [{ wordId: "jml", readsAsId: "loose" }] });
    expect(ops).toEqual([
      { op: "setFamily", wordId: "loose", familyId: "camel", prev: null },
      { op: "setHeadword", familyId: "camel", headwordId: "loose", prev: null },
      { op: "setReadsAs", wordId: "jml", readsAsId: "loose", prev: "jumal" },
    ]);
  });
});

describe("inverseOps", () => {
  it("undoes in reverse, un-heads a created family and leaves it", () => {
    const ops: Op[] = [
      { op: "setFamily", wordId: "a", familyId: null, prev: "x" },
      { op: "createFamily", familyId: "f", gloss: null, headwordId: "a" },
      { op: "linkConcept", familyId: "f", concept: "cat" },
    ];
    expect(inverseOps(ops)).toEqual([
      { op: "unlinkConcept", familyId: "f", concept: "cat" },
      { op: "setHeadword", familyId: "f", headwordId: null, prev: "a" },
      { op: "setFamily", wordId: "a", familyId: null, prev: "f" },
      { op: "setFamily", wordId: "a", familyId: "x", prev: null },
    ]);
    expect(fullyUndoable(ops)).toBe(false);
    expect(redoOps(ops)).toEqual([ops[0], { op: "setHeadword", familyId: "f", headwordId: "a", prev: null }, ops[2]]);
    expect(fullyUndoable([ops[0]])).toBe(true);
  });
});

describe("runOps", () => {
  it("sends in order", async () => {
    const { api, calls } = fakeApi();
    await runOps(api, [
      { op: "setPseudo", wordId: "w", isPseudo: true, prev: false },
      { op: "attachPicture", concept: "cat", assetId: "p1" },
    ]);
    expect(calls).toEqual(['setWordPseudo("w",true)', 'attachConceptPicture("cat","p1")']);
  });
  it("undoes what it sent when a later call is refused, and carries the refusal", async () => {
    const { api, calls } = fakeApi((name) => name === "setWordReadsAs");
    const err = await runOps(api, [
      { op: "setFamily", wordId: "w", familyId: "f", prev: null },
      { op: "setReadsAs", wordId: "w", readsAsId: "t", prev: null },
    ]).catch((e) => e);
    expect(err).toBeInstanceOf(OpsError);
    expect((err as OpsError).rolledBack).toBe(true);
    expect(((err as OpsError).cause as { code: string }).code).toBe("WORD_IS_HEADWORD");
    expect(calls).toEqual(['setWordFamily("w","f")', 'setWordReadsAs("w","t")', 'setWordFamily("w",null)']);
  });
});
