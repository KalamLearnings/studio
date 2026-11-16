import { describe, expect, it } from "vitest";
import { connectAccess } from "./access";

describe("who may connect (owner decision 3)", () => {
  it("lets a curriculum lead or a phrase reviewer connect", () => {
    expect(connectAccess({ app_metadata: { curriculum_lead: true } })).toEqual({ canConnect: true, reason: null });
    expect(connectAccess({ app_metadata: { phrase_reviewer: true } }).canConnect).toBe(true);
  });
  it("shows other staff the page read only, with the reason", () => {
    const a = connectAccess({ app_metadata: { role: "staff" } });
    expect(a.canConnect).toBe(false);
    expect(a.reason).toMatch(/curriculum lead or a phrase reviewer/);
    expect(connectAccess(null).canConnect).toBe(false);
    expect(connectAccess({ app_metadata: { curriculum_lead: "true" } }).canConnect).toBe(false);
  });
});
