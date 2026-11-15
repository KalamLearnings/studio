import { describe, expect, it } from "vitest";
import { findingsToFieldErrors } from "./saveFindings";

describe("findingsToFieldErrors", () => {
  it("maps each finding to a field error, dropping the config. prefix", () => {
    expect(
      findingsToFieldErrors({
        findings: [
          { check: "phrase_reviewed", field: "config.sentence", message: "not reviewed", severity: "warning" },
          { check: "config_empty", field: "config", message: "empty" },
        ],
      }),
    ).toEqual([
      { path: "sentence", message: "not reviewed", check: "phrase_reviewed" },
      { path: "", message: "empty", check: "config_empty" },
    ]);
  });

  it("skips malformed entries and tolerates a missing result", () => {
    expect(findingsToFieldErrors(null)).toEqual([]);
    expect(findingsToFieldErrors({})).toEqual([]);
    expect(findingsToFieldErrors({ findings: [null, 3, { field: "config.x" }] })).toEqual([]);
  });
});
