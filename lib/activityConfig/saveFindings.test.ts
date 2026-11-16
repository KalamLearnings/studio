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

  it("keeps decodability out of the warnings and returns it as a note", () => {
    const result = {
      findings: [
        { check: "phrase_reviewed", field: "config.sentence", message: "not reviewed", severity: "warning" },
        { check: "decodable", field: "config.sentence.phrase.wordIds.0", message: "untaught", severity: "info" },
        // a server from before CM-C11a labels it a warning; still a note
        { check: "decodable", field: "config.sentence", message: "old label", severity: "warning" },
        { check: "some_future_note", field: "config", message: "fyi", severity: "info" },
      ],
    };
    expect(findingsToFieldErrors(result)).toEqual([
      { path: "sentence", message: "not reviewed", check: "phrase_reviewed" },
    ]);
    expect(findingsToFieldErrors(result, "note")).toEqual([
      { path: "sentence.phrase.wordIds.0", message: "untaught", check: "decodable" },
      { path: "sentence", message: "old label", check: "decodable" },
      { path: "", message: "fyi", check: "some_future_note" },
    ]);
  });

  it("skips malformed entries and tolerates a missing result", () => {
    expect(findingsToFieldErrors(null)).toEqual([]);
    expect(findingsToFieldErrors({})).toEqual([]);
    expect(findingsToFieldErrors({ findings: [null, 3, { field: "config.x" }] })).toEqual([]);
  });
});
