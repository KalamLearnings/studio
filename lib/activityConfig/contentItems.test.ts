/**
 * CM-S6: the content item adapters behind ContentItemEditor and ContentItemGrid.
 * Each kind round-trips through v1's stored shape of its container, and a
 * canonical write carries references only.
 */

import { describe, expect, it } from "vitest";
import { ContentItemWriteSchema, ContentRefWriteSchema } from "@kalam/curriculum-schemas/server";
import {
  cardFromItem,
  cardItem,
  emptied,
  gridKindOf,
  isFilled,
  mcqOptionFromItem,
  mcqOptionItem,
  pairSideFromItem,
  pairSideItem,
  promptKind,
  toContentItemWrite,
  toContentRefWrite,
  withKind,
  withPromptKind,
  writePrompt,
  type EditorItem,
} from "./contentItems";

const ba = { letterId: "ba", form: "isolated" } as const;
const baFatha = { letterId: "ba", form: "initial", haraka: "fatha" } as const;
const glyph = (r: { letterId: string; form: string; haraka?: string }) =>
  `${r.letterId}/${r.form}${r.haraka ? `/${r.haraka}` : ""}`;

const word: EditorItem = { id: "o1", kind: "word", word: { wordId: "w-bab", text: "باب" }, isCorrect: true };
const image: EditorItem = { id: "o2", kind: "image", image: { assetId: "a-1", url: "https://x/cat.png" } };
const numeral: EditorItem = { id: "o3", kind: "numeral", numeral: 3, isCorrect: false };
const letter: EditorItem = { id: "o4", kind: "letter", letter: { ...baFatha }, isCorrect: false };

describe("items", () => {
  it("switching kind clears the other payloads and keeps id, correctness and label", () => {
    expect(withKind({ ...word, label: "door" }, "image")).toEqual({ id: "o1", kind: "image", isCorrect: true, label: "door" });
    expect(withKind(word, "word")).toBe(word);
    expect(emptied(letter)).toEqual({ id: "o4", kind: "letter", isCorrect: false });
  });

  it("knows when an item is filled", () => {
    expect([word, image, numeral, letter].every(isFilled)).toBe(true);
    expect(isFilled({ kind: "numeral", numeral: 0 })).toBe(true);
    expect(isFilled({ kind: "word", word: { text: " " } })).toBe(false);
  });

  it("a grid shows the one kind of its filled items", () => {
    expect(gridKindOf([numeral, { kind: "letter" }], "word")).toBe("numeral");
    expect(gridKindOf([numeral, letter], "word")).toBe("word");
    expect(gridKindOf([], "image")).toBe("image");
  });

  it("a canonical write carries references only (no text or URL hints)", () => {
    expect(toContentItemWrite(word)).toEqual({ id: "o1", kind: "word", word: { wordId: "w-bab" }, isCorrect: true });
    expect(toContentItemWrite(image)).toEqual({ id: "o2", kind: "image", image: { assetId: "a-1" } });
    expect(toContentRefWrite(numeral)).toEqual({ kind: "numeral", numeral: 3 });
    for (const item of [word, image, numeral, letter]) {
      expect(ContentItemWriteSchema.safeParse(toContentItemWrite(item)).success, item.kind).toBe(true);
      expect(ContentRefWriteSchema.safeParse(toContentRefWrite(item)).success, item.kind).toBe(true);
    }
    // a word typed but not picked from the library has no id: the write schema says so
    expect(ContentItemWriteSchema.safeParse(toContentItemWrite({ id: "x", kind: "word", word: { text: "بيت" } })).success).toBe(false);
  });
});

describe("prompt", () => {
  it("sets and clears the kind, keeping a stored target", () => {
    const target = { kind: "letter", letter: ba };
    expect(withPromptKind({ a: 1 } as { a: number; prompt?: unknown }, "count")).toEqual({ a: 1, prompt: { kind: "count" } });
    expect(withPromptKind({ prompt: { kind: "form", target } }, "haraka")).toEqual({ prompt: { kind: "haraka", target } });
    expect(withPromptKind({ prompt: { kind: "form" } }, undefined)).toEqual({});
    expect(promptKind({ prompt: { kind: "meaning" } })).toBe("meaning");
    expect(promptKind({ prompt: { kind: "nope" } })).toBeUndefined();
  });

  it("a written prompt target is a reference only", () => {
    expect(writePrompt({ kind: "meaning", target: { kind: "word", word: { wordId: "w1", text: "باب" } } })).toEqual({
      kind: "meaning",
      target: { kind: "word", word: { wordId: "w1" } },
    });
  });
});

describe("MCQ options in v1's shape", () => {
  it("each kind stores what v1 reads: text.ar for a word (its library id beside it) or numeral, the image URL, the letter reference", () => {
    expect(mcqOptionFromItem(word)).toEqual({ id: "o1", isCorrect: true, text: { en: "", ar: "باب" }, word: { wordId: "w-bab" } });
    expect(mcqOptionFromItem(numeral)).toEqual({ id: "o3", isCorrect: false, text: { en: "", ar: "3" } });
    expect(mcqOptionFromItem(image)).toEqual({ id: "o2", isCorrect: false, text: { en: "", ar: "" }, image: "https://x/cat.png" });
    expect(mcqOptionFromItem(letter)).toEqual({ id: "o4", isCorrect: false, text: { en: "", ar: "" }, letter: baFatha });
  });

  it("an edit keeps the option's other keys and replaces its content", () => {
    const prev = { id: "o1", letter: ba, text: { en: "", ar: "" }, isCorrect: true, hint: "door" };
    expect(mcqOptionFromItem(word, prev)).toEqual({ id: "o1", isCorrect: true, text: { en: "", ar: "باب" }, word: { wordId: "w-bab" }, hint: "door" });
  });

  it("reads stored options as v1 renders them", () => {
    expect(mcqOptionItem({ id: "a", text: { ar: "3" }, isCorrect: true }, "text")).toEqual({ id: "a", kind: "numeral", numeral: 3, isCorrect: true });
    expect(mcqOptionItem({ id: "a", text: { ar: "باب" } }, undefined)).toEqual({ id: "a", kind: "word", word: { text: "باب" } });
    expect(mcqOptionItem({ id: "a", text: { ar: "باب" }, image: "https://x/b.png" }, "image")).toEqual({ id: "a", kind: "image", image: { url: "https://x/b.png" } });
    expect(mcqOptionItem({ id: "a", letter: ba, text: { ar: "" } }, "letter")).toEqual({ id: "a", kind: "letter", letter: ba });
    expect(mcqOptionItem({ id: "a", text: { ar: "" } }, "image")).toEqual({ id: "a", kind: "image" });
    expect(mcqOptionItem({ id: "a", kind: "numeral", numeral: 2 }, undefined)).toEqual({ id: "a", kind: "numeral", numeral: 2 });
  });

  it("round-trips every kind it stores (a word keeps its library id; an asset id lives only in a canonical save)", () => {
    for (const item of [numeral, letter, word]) {
      expect(mcqOptionItem(mcqOptionFromItem(item), "text")).toEqual(item);
    }
    expect(mcqOptionItem(mcqOptionFromItem(image), "image")).toEqual({ ...image, isCorrect: false, image: { url: "https://x/cat.png" } });
  });
});

describe("cards in v1's shape", () => {
  it("each kind stores the card text or image", () => {
    expect(cardFromItem(word)).toEqual({ id: "o1", text: "باب", isCorrect: true, word: { wordId: "w-bab" } });
    expect(cardFromItem(numeral)).toEqual({ id: "o3", text: "3", isCorrect: false });
    expect(cardFromItem(image)).toEqual({ id: "o2", text: "", image: "https://x/cat.png", isCorrect: false });
    expect(cardFromItem(letter)).toEqual({ id: "o4", text: "", letter: baFatha, isCorrect: false });
  });

  it("reads stored cards", () => {
    expect(cardItem({ id: "c", text: "٢" }, "word")).toEqual({ id: "c", kind: "numeral", numeral: 2 });
    expect(cardItem({ id: "c", text: "", letter: ba }, "letter")).toEqual({ id: "c", kind: "letter", letter: ba });
    expect(cardItem({ id: "c", text: "" }, "image")).toEqual({ id: "c", kind: "image" });
    expect(cardItem(cardFromItem(numeral), "word")).toEqual(numeral);
    expect(cardItem(cardFromItem(word), "word")).toEqual(word);
  });
});

describe("match pair sides in v1's shape", () => {
  it("a letter stores type, its glyph value (with haraka) and the flat reference, as MatchItemEditor did", () => {
    expect(pairSideFromItem({ kind: "letter", letter: { ...baFatha }, label: "ba" }, glyph)).toEqual({
      type: "letter",
      value: "ba/initial/fatha",
      letterId: "ba",
      form: "initial",
      haraka: "fatha",
      label: "ba",
    });
    expect(pairSideFromItem({ kind: "letter" }, glyph)).toEqual({ type: "letter", value: "" });
  });

  it("word, numeral, image and audio sides", () => {
    expect(pairSideFromItem(word, glyph)).toEqual({ type: "word", value: "باب", word: { wordId: "w-bab" } });
    expect(pairSideItem(pairSideFromItem(word, glyph))).toEqual({ kind: "word", word: { wordId: "w-bab", text: "باب" } });
    expect(pairSideFromItem(numeral, glyph)).toEqual({ type: "word", value: "3" });
    expect(pairSideFromItem(image, glyph)).toEqual({ type: "image", value: "https://x/cat.png" });
    expect(pairSideFromItem({ kind: "audio", audio: { assetId: "au-1", url: "https://x/ba.mp3" } }, glyph)).toEqual({
      type: "audio",
      value: "https://x/ba.mp3",
      audioUrl: "https://x/ba.mp3",
      audioId: "au-1",
    });
  });

  it("reads stored sides and round-trips", () => {
    const sides = [
      { type: "letter", value: "بَـ", letterId: "ba", form: "initial", haraka: "fatha", label: "x" },
      { type: "word", value: "باب" },
      { type: "word", value: "4" },
      { type: "image", value: "https://x/cat.png" },
      { type: "audio", value: "https://x/ba.mp3", audioUrl: "https://x/ba.mp3", audioId: "au-1" },
    ];
    expect(pairSideItem(sides[0])).toEqual({ kind: "letter", letter: baFatha, label: "x" });
    expect(pairSideItem(sides[2])).toEqual({ kind: "numeral", numeral: 4 });
    expect(pairSideItem(sides[4])).toEqual({ kind: "audio", audio: { assetId: "au-1", url: "https://x/ba.mp3" } });
    // the glyph comes from the letters table in the form; here the stored one stands in
    const keepGlyph = () => "بَـ";
    for (const side of sides) expect(pairSideFromItem(pairSideItem(side), keepGlyph)).toEqual(side);
    // a legacy glyph-only letter side reads as a reference
    expect(pairSideItem({ type: "letter", value: "ب" })).toEqual({ kind: "letter", letter: ba });
  });
});
