import { describe, expect, it } from "vitest";
import {
  carryContrast,
  contrastPickerEnabled,
  distractorsNeedingContrast,
  isGradedType,
  serverContrast,
  writeSchemaStoresContrast,
} from "./contrast";

const ba = { letterId: "ba", form: "isolated" };
const baFatha = { ...ba, haraka: "fatha" };

describe("serverContrast (the server's rule)", () => {
  it("derives what it can", () => {
    expect(serverContrast([ba], { letterId: "ta", form: "isolated" })).toBe("dots");
    expect(serverContrast([ba], { letterId: "meem", form: "isolated" })).toBe("shape");
    expect(serverContrast([ba], { letterId: "ba", form: "final" })).toBe("form");
    expect(serverContrast([baFatha], { ...ba, haraka: "kasra" })).toBe("haraka");
  });

  it("prefers the target of the same letter", () => {
    // against ba-fatha this is two differences (null); against ba it is a form contrast
    expect(serverContrast([{ letterId: "ta", form: "isolated" }, ba], { letterId: "ba", form: "final" })).toBe("form");
  });

  it("is null when two things differ at once (the author picks)", () => {
    expect(serverContrast([baFatha], { letterId: "meem", form: "isolated", haraka: "damma" })).toBeNull();
    expect(serverContrast([], ba)).toBeNull();
  });
});

describe("distractorsNeedingContrast", () => {
  it("lists only the distractors with no derived contrast", () => {
    expect(
      distractorsNeedingContrast([baFatha], [
        { letterId: "ta", form: "isolated", haraka: "fatha" },
        { letterId: "meem", form: "isolated", haraka: "damma" },
      ]),
    ).toEqual([1]);
  });
});

describe("the picker", () => {
  it("applies to graded types only", () => {
    expect(isGradedType("letter_discrimination")).toBe(true);
    expect(isGradedType("show_letter_or_word")).toBe(false);
  });

  it("stays hidden while the server's write schema refuses a picked contrast", () => {
    // LetterRefWriteSchema is strict today: `contrast` on a distractor is not a field.
    expect(writeSchemaStoresContrast("letter_discrimination")).toBe(false);
    expect(contrastPickerEnabled("letter_discrimination")).toBe(false);
  });

  it("keeps a picked contrast on its letter and drops it where one is derived", () => {
    const meem = { letterId: "meem", form: "isolated", haraka: "damma" };
    const ta = { letterId: "ta", form: "isolated", haraka: "fatha" };
    const previous = [{ ...meem, contrast: "shape" }];
    expect(carryContrast(true, [baFatha], previous, [ta, meem])).toEqual([ta, { ...meem, contrast: "shape" }]);
    expect(carryContrast(true, [baFatha], [], [{ ...ta, contrast: "shape" }])).toEqual([ta]);
    expect(carryContrast(false, [baFatha], previous, [meem])).toEqual([meem]);
  });
});
