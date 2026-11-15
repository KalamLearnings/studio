import { describe, expect, it } from "vitest";
import { errorLine, errorsAt, isConfigSaveError, parseConfigSaveError, unplacedErrors } from "./saveErrors";

const refusal = {
  code: "CONFIG_INVALID",
  details: [
    { field: "config.distractorLetters.1.letterId", message: "Required", check: "write_schema" },
    { field: "config.correctLetter", message: "not a pop_balloons_with_letter field", check: "write_schema" },
    { field: "config", message: "config is empty", check: "config_empty" },
    { bad: true },
  ],
};

describe("parseConfigSaveError", () => {
  it("reads the three save validation codes only", () => {
    expect(parseConfigSaveError(null)).toBeNull();
    expect(parseConfigSaveError({ code: "BLEND_INVALID", details: [] })).toBeNull();
    expect(isConfigSaveError({ code: "CONFIG_CHECK_FAILED" })).toBe(true);
    expect(isConfigSaveError({ code: "CONFIG_EMPTY" })).toBe(true);
  });

  it("keeps the field path without the config prefix", () => {
    expect(parseConfigSaveError(refusal)).toEqual([
      { path: "distractorLetters.1.letterId", message: "Required", check: "write_schema" },
      { path: "correctLetter", message: "not a pop_balloons_with_letter field", check: "write_schema" },
      { path: "", message: "config is empty", check: "config_empty" },
    ]);
  });

  it("never returns an empty list for a refusal", () => {
    expect(parseConfigSaveError({ code: "CONFIG_INVALID" })).toEqual([
      { path: "", message: "The server refused this activity." },
    ]);
  });
});

describe("placing errors", () => {
  const errors = parseConfigSaveError(refusal)!;

  it("finds the errors at or inside a field", () => {
    expect(errorsAt(errors, "distractorLetters").map((e) => e.path)).toEqual(["distractorLetters.1.letterId"]);
    expect(errorsAt(errors, "distractor")).toEqual([]);
  });

  it("lists the errors no shown field covers", () => {
    expect(unplacedErrors(errors, ["distractorLetters", "targetLetter"]).map((e) => e.path)).toEqual([
      "correctLetter",
      "",
    ]);
  });

  it("says where inside the field, counting from 1", () => {
    expect(errorLine(errors[0]!, "distractorLetters")).toBe("#2 letterId: Required");
    expect(errorLine(errors[1]!)).toBe("correctLetter: not a pop_balloons_with_letter field");
    expect(errorLine(errors[2]!)).toBe("config is empty");
  });
});
