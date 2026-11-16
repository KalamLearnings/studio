import { describe, expect, it } from "vitest";
import { nextTrail, parseNodeKey, parseWordsUrl, previousOnTrail, TRAIL_MAX, wordsUrlSearch, type NodeKey } from "./keys";

const params = (s: string) => new URLSearchParams(s);

describe("node keys", () => {
  it("parses <type>:<id> and refuses anything else", () => {
    expect(parseNodeKey("family:book")).toEqual({ type: "family", id: "book" });
    expect(parseNodeKey("word:word_17:x")).toEqual({ type: "word", id: "word_17:x" });
    expect(parseNodeKey("thing:book")).toBeNull();
    expect(parseNodeKey("family:")).toBeNull();
    expect(parseNodeKey("book")).toBeNull();
    expect(parseNodeKey(null)).toBeNull();
  });
});

describe("URL state", () => {
  it("reads focus and view", () => {
    expect(parseWordsUrl(params("focus=family:book"))).toEqual({ focus: "family:book", view: "focus" });
    expect(parseWordsUrl(params("focus=concept:cat&view=all"))).toEqual({ focus: "concept:cat", view: "all" });
  });
  it("shows All words when there is nothing to focus", () => {
    expect(parseWordsUrl(params(""))).toEqual({ focus: null, view: "all" });
    expect(parseWordsUrl(params("focus=nope"))).toEqual({ focus: null, view: "all" });
  });
  it("writes back what it reads", () => {
    for (const s of ["?focus=family%3Abook", "?focus=concept%3Acat&view=all", ""]) {
      expect(wordsUrlSearch(parseWordsUrl(params(s.slice(1))))).toBe(s);
    }
  });
});

describe("trail", () => {
  it("adds new places and cuts back to a known one", () => {
    let t: NodeKey[] = [];
    t = nextTrail(t, "family:book");
    t = nextTrail(t, "word:a");
    t = nextTrail(t, "concept:book");
    expect(t).toEqual(["family:book", "word:a", "concept:book"]);
    expect(nextTrail(t, "word:a")).toEqual(["family:book", "word:a"]);
    expect(previousOnTrail(t, "concept:book")).toBe("word:a");
    expect(previousOnTrail(t, "family:book")).toBeNull();
    expect(previousOnTrail(t, null)).toBeNull();
  });
  it("keeps the last TRAIL_MAX places", () => {
    let t: NodeKey[] = [];
    for (let i = 0; i < TRAIL_MAX + 3; i++) t = nextTrail(t, `word:${i}`);
    expect(t).toHaveLength(TRAIL_MAX);
    expect(t[0]).toBe("word:3");
  });
});
