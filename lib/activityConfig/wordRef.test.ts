import { describe, expect, it } from "vitest";
import { withPickedWord, withServerForm } from "./wordRef";

describe("withPickedWord (CM-D3f)", () => {
  it("a picked library word is sent as wordRef beside its text", () => {
    expect(withPickedWord({ letterDisplayMode: "isolated" }, "targetWord", "باب", { id: "w1", arabic: "باب" })).toEqual({
      letterDisplayMode: "isolated",
      targetWord: "باب",
      wordRef: { wordId: "w1" },
    });
    expect(withPickedWord({ contentType: "word" }, "word", "قلم", { id: "w2", arabic: "قلم" })).toEqual({
      contentType: "word",
      word: "قلم",
      wordRef: { wordId: "w2" },
    });
  });

  it("a typed word drops the wordRef left behind, so the server never writes the old word back", () => {
    const stored = { targetWord: "باب", wordRef: { wordId: "w1", text: "باب" } };
    expect(withPickedWord(stored, "targetWord", "بابا")).toEqual({ targetWord: "بابا" });
    expect(withPickedWord(stored, "targetWord", "")).toEqual({ targetWord: "" });
    // a word object whose spelling is not the text is not that word
    expect(withPickedWord(stored, "targetWord", "بيت", { id: "w1", arabic: "باب" })).toEqual({ targetWord: "بيت" });
  });

  it("does not change the config it is given", () => {
    const stored = { targetWord: "باب", wordRef: { wordId: "w1" } };
    withPickedWord(stored, "targetWord", "قلم");
    expect(stored).toEqual({ targetWord: "باب", wordRef: { wordId: "w1" } });
  });
});

describe("withServerForm (tap_letter_in_word, CM-D3d)", () => {
  it("keeps the stored, server-derived form while the letter is the same", () => {
    expect(withServerForm({ letterId: "ba", form: "isolated", haraka: "fatha" }, { letterId: "ba", form: "final" })).toEqual({
      letterId: "ba",
      form: "final",
      haraka: "fatha",
    });
  });

  it("a different letter, or no stored reference, keeps the picker's placeholder for the server to derive", () => {
    const picked = { letterId: "ta", form: "isolated" };
    expect(withServerForm(picked, { letterId: "ba", form: "final" })).toEqual(picked);
    expect(withServerForm(picked, "ت")).toEqual(picked);
    expect(withServerForm(picked, undefined)).toEqual(picked);
  });
});
