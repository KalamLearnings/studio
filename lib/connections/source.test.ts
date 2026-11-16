import { describe, expect, it, vi } from "vitest";
import { routesSource, type RoutesApi } from "./source";
import { SAMPLE } from "./fixtures";

const api = (o: Partial<RoutesApi> = {}): RoutesApi => ({
  listWords: async () => SAMPLE.words as never,
  listFamilies: async () => SAMPLE.families as never,
  listConceptDetails: async () => SAMPLE.concepts as never,
  listLetters: async () => SAMPLE.letters as never,
  contentUsage: vi.fn(async (unit: string) => ({ unit, activities: [], book_units: [] })),
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
  it("answers usage for spellings, letters and meanings from the content usage read", async () => {
    const a = api({
      contentUsage: vi.fn(async (unit: string) => ({
        unit,
        activities: [],
        book_units: [{ unit_id: "u1", book_id: "b1", book_title: "Bear", book_title_ar: null, item_id: null, role: "exposure" }],
      })),
    });
    const s = routesSource(a);
    expect(await s.usage("word:w-kitab")).toEqual({ activities: [], books: [expect.objectContaining({ book_id: "b1" })] });
    await s.usage("letter:kaf");
    await s.usage("concept:camel");
    expect(a.contentUsage).toHaveBeenCalledWith("word:w-kitab");
    expect(a.contentUsage).toHaveBeenCalledWith("letter:kaf");
    expect(a.contentUsage).toHaveBeenCalledWith("concept:camel");
    expect(s.usage("family:book")).toBeNull();
    expect(s.usage("picture:p1")).toBeNull();
  });
});
