import { describe, expect, it, vi } from "vitest";
import { routesSource, type RoutesApi } from "./source";
import { SAMPLE } from "./fixtures";

const api = (o: Partial<RoutesApi> = {}): RoutesApi => ({
  listWords: async () => SAMPLE.words as never,
  listFamilies: async () => SAMPLE.families as never,
  listConceptDetails: async () => SAMPLE.concepts as never,
  listLetters: async () => SAMPLE.letters as never,
  wordUsage: vi.fn(async () => []),
  ...o,
});

describe("routesSource", () => {
  it("reads the library from today's routes", async () => {
    const lib = await routesSource(api()).library();
    expect(lib.words).toHaveLength(SAMPLE.words.length);
    expect(lib.concepts).toHaveLength(SAMPLE.concepts.length);
  });
  it("keeps the words when the concepts or letters fail", async () => {
    const lib = await routesSource(
      api({ listConceptDetails: async () => Promise.reject(new Error("x")), listLetters: async () => Promise.reject(new Error("y")) }),
    ).library();
    expect(lib.concepts).toEqual([]);
    expect(lib.letters).toEqual([]);
    expect(lib.words.length).toBeGreaterThan(0);
  });
  it("fails when the words fail", async () => {
    await expect(routesSource(api({ listWords: async () => Promise.reject(new Error("down")) })).library()).rejects.toThrow("down");
  });
  it("answers usage for a spelling only, until the usage read lands", async () => {
    const a = api();
    const s = routesSource(a);
    await s.usage("word:w-kitab");
    expect(a.wordUsage).toHaveBeenCalledWith("w-kitab");
    expect(s.usage("letter:kaf")).toBeNull();
    expect(s.usage("family:book")).toBeNull();
  });
});
