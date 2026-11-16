import { describe, expect, it } from "vitest";
import { DEFAULT_URL_STATE, parseReviewUrl, reviewUrlSearch } from "./url";

describe("Review URL state", () => {
  it("defaults to Everything, To decide, Most used first", () => {
    expect(parseReviewUrl(new URLSearchParams(""))).toEqual(DEFAULT_URL_STATE);
    expect(reviewUrlSearch(DEFAULT_URL_STATE)).toBe("");
  });
  it("round-trips every field", () => {
    const state = {
      lens: "spelling" as const,
      status: "all" as const,
      sort: "oldest" as const,
      q: "كتاب",
      item: "spelling:word_1",
      family: "book",
      concept: "book",
    };
    expect(parseReviewUrl(new URLSearchParams(reviewUrlSearch(state)))).toEqual(state);
  });
  it("keeps the Flagged by check view and sort", () => {
    const s = parseReviewUrl(new URLSearchParams("lens=v-check&sort=check"));
    expect([s.lens, s.sort]).toEqual(["v-check", "check"]);
    expect(reviewUrlSearch(s)).toBe("?lens=v-check&sort=check");
  });
  it("ignores values it does not know", () => {
    const s = parseReviewUrl(new URLSearchParams("lens=nope&status=maybe&sort=random&item="));
    expect(s).toEqual(DEFAULT_URL_STATE);
  });
});
