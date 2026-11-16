import { describe, expect, it } from "vitest";
import {
  checkTitle,
  errorLine,
  errorsAt,
  isConfigSaveError,
  parseConfigSaveError,
  UNKNOWN_LIBRARY_WORD_MESSAGE,
  unplacedErrors,
  V1_DISPLAY_MESSAGE,
} from "./saveErrors";

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

describe("V1_DISPLAY_UNRESOLVED (CM-D3f)", () => {
  it("an unknown wordRef id is a plain message on the word picker's path", () => {
    const refusal = {
      code: "V1_DISPLAY_UNRESOLVED",
      details: [{ field: "config.wordRef.wordId", message: "no word with id w-gone", check: "v1_display" }],
    };
    expect(isConfigSaveError(refusal)).toBe(true);
    const errors = parseConfigSaveError(refusal)!;
    expect(errors).toEqual([{ path: "wordRef", message: UNKNOWN_LIBRARY_WORD_MESSAGE, check: "v1_display" }]);
    expect(errorLine(errors[0]!, "wordRef")).toBe(UNKNOWN_LIBRARY_WORD_MESSAGE);
  });

  it("any other unresolved item keeps its place with a plain message; no details is one whole-config line", () => {
    expect(
      parseConfigSaveError({
        code: "V1_DISPLAY_UNRESOLVED",
        details: [{ field: "config.options.1.word.wordId", message: "unknown word w9", check: "v1_display" }],
      }),
    ).toEqual([{ path: "options.1.word.wordId", message: V1_DISPLAY_MESSAGE, check: "v1_display" }]);
    expect(parseConfigSaveError({ code: "V1_DISPLAY_UNRESOLVED" })).toEqual([{ path: "", message: V1_DISPLAY_MESSAGE }]);
  });
});

describe("save blocks (backend CM-P1)", () => {
  it("are config refusals shown beside their fields, with a short title", () => {
    for (const code of ["CONFIG_INCOMPLETE", "NO_CORRECT_OPTION", "EVERY_OPTION_CORRECT", "DUPLICATE_OPTIONS", "HARMFUL_WORD"]) {
      expect(isConfigSaveError({ code })).toBe(true);
    }
    const message = "Option 3 shows the same thing as option 2. Each option must be different.";
    const errors = parseConfigSaveError({
      code: "DUPLICATE_OPTIONS",
      details: [{ field: "config.options.2", message, check: "duplicate_options" }],
    });
    expect(errors).toEqual([{ path: "options.2", message, check: "duplicate_options" }]);
    expect(checkTitle(errors![0])).toBe("Repeated option");
    expect(errorLine(errors![0], "options")).toBe(`#3: ${message}`);
  });
});
