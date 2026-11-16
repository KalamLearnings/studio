/**
 * CM-S12: the reading-type forms (read_and_match, sentence_builder,
 * sound_sort) save to the server's own write schema, and their client-side
 * problems mirror the server's rules.
 */

import { describe, expect, it } from "vitest";
import { getActivityConfigSchema, type ActivityType } from "@kalam/curriculum-schemas/server";
import { openForEdit, toSaveConfig, type Config } from "../activityConfig/canonical";
import { checkTitle } from "../activityConfig/saveErrors";
import type { PhraseWord } from "../phrases/phraseItem";
import { nextId, phraseValue, withHints } from "./common";
import { addOption, markCorrect, readAndMatchOptions, readAndMatchProblems } from "./readAndMatch";
import { distractorChoices, sentenceBuilderProblems } from "./sentenceBuilder";
import {
  binsOf,
  itemsOf,
  letterIdsOf,
  removeBin,
  soundSortConfig,
  labelGivesItAway,
  soundSortProblems,
  soundSortWarnings,
  withBinLetter,
  withSortBy,
  type SortBin,
  type SortItem,
} from "./soundSort";

function writeIssues(type: string, config: Config): string[] {
  const result = getActivityConfigSchema(type as ActivityType).safeParse(config);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join(".") || "(config)"}: ${i.message}`);
}

/** A new activity: open `{}`, apply the form's config, save. */
function newAndSave(type: string, formConfig: Config): Config {
  const { config, canonical } = openForEdit(type, {});
  return toSaveConfig(type, { ...config, ...formConfig }, canonical);
}

const sentence = { kind: "phrase", phrase: { wordIds: ["w_hadhihi", "w_battatun"], isSentence: true } };
const pic = (id: string, assetId: string, isCorrect?: boolean) => ({
  id,
  kind: "image" as const,
  image: { assetId, url: `https://cdn.example/${assetId}.png` },
  ...(isCorrect !== undefined && { isCorrect }),
});

const word = (id: string, over: Partial<PhraseWord> = {}): PhraseWord => ({
  id,
  arabic: id,
  reviewed_at: "2026-11-01",
  retired_at: null,
  is_pseudo: false,
  ...over,
});

describe("common", () => {
  it("nextId takes the smallest free id", () => {
    expect(nextId("o", ["o1", "o3"])).toBe("o2");
    expect(nextId("b", [])).toBe("b1");
  });

  it("a half-built phrase is kept in the item's shape", () => {
    expect(phraseValue(null, { wordIds: ["w_a"], isSentence: false })).toEqual({
      kind: "phrase",
      phrase: { wordIds: ["w_a"], isSentence: false },
    });
  });

  it("withHints fills a stored word's text and picture's URL", () => {
    const hints = { wordText: () => "بَيْتٌ", imageUrl: () => "https://x/y.png" };
    expect(withHints({ kind: "word", word: { wordId: "w1" } }, hints).word).toEqual({ wordId: "w1", text: "بَيْتٌ" });
    expect(withHints({ kind: "image", image: { assetId: "a1" } }, hints).image).toEqual({ assetId: "a1", url: "https://x/y.png" });
  });
});

describe("read_and_match", () => {
  it("a new activity with hinted pictures saves to the write schema, references only", () => {
    const saved = newAndSave("read_and_match", {
      sentence,
      options: [pic("o1", "a_duck", true), pic("o2", "a_bunny", false), pic("o3", "a_kitten")],
      playSentenceFirst: undefined,
    });
    expect(writeIssues("read_and_match", saved)).toEqual([]);
    expect(saved).toEqual({
      sentence,
      options: [
        { id: "o1", kind: "image", image: { assetId: "a_duck" }, isCorrect: true },
        { id: "o2", kind: "image", image: { assetId: "a_bunny" } },
        { id: "o3", kind: "image", image: { assetId: "a_kitten" } },
      ],
    });
  });

  it("a stored row opens and saves unchanged", () => {
    const stored = {
      sentence,
      options: [
        { id: "o1", kind: "image", image: { assetId: "a_duck" }, isCorrect: true },
        { id: "o2", kind: "image", image: { assetId: "a_bunny" } },
      ],
      playSentenceFirst: true,
    };
    const { config, canonical } = openForEdit("read_and_match", stored);
    expect(canonical).toBe(true);
    expect(toSaveConfig("read_and_match", config, canonical)).toEqual(stored);
  });

  it("starts with three empty pictures and adds a fourth with a fresh id", () => {
    const options = readAndMatchOptions({});
    expect(options.map((o) => o.id)).toEqual(["o1", "o2", "o3"]);
    expect(addOption(options).map((o) => o.id)).toEqual(["o1", "o2", "o3", "o4"]);
  });

  it("marking one picture correct unmarks the others", () => {
    const options = markCorrect([pic("o1", "a", true), pic("o2", "b"), pic("o3", "c")], 2);
    expect(options.map((o) => o.isCorrect)).toEqual([false, false, true]);
  });

  it("problems: the count, exactly one match, a repeated picture, a picture not in the registry", () => {
    expect(readAndMatchProblems([pic("o1", "a", true), pic("o2", "b")])).toEqual([]);
    const problems = readAndMatchProblems([
      pic("o1", "a", true),
      pic("o2", "a", true),
      { id: "o3", kind: "image", image: { url: "https://x/raw.png" } },
      pic("o4", "d"),
      pic("o5", "e"),
    ]);
    expect(problems).toEqual([
      "Give 2 to 4 pictures (there are 5).",
      "Mark exactly one picture as the match (2 marked).",
      "Options 1 and 2 are the same picture.",
      "Option 3: the picture is not in the asset registry; pick a registered picture.",
    ]);
    expect(readAndMatchProblems([pic("o1", "a"), { id: "o2", kind: "image" }])).toEqual([
      "Mark exactly one picture as the match (0 marked).",
      "Option 2 has no picture yet.",
    ]);
  });
});

describe("sentence_builder", () => {
  it("extra tiles and the prompt picture save to the write schema, references only", () => {
    const saved = newAndSave("sentence_builder", {
      sentence,
      distractorWords: [{ kind: "word", word: { wordId: "w_bab", text: "بابٌ" } }],
      promptImage: { kind: "image", image: { assetId: "a_duck", url: "https://x/duck.png" } },
    });
    expect(writeIssues("sentence_builder", saved)).toEqual([]);
    expect(saved).toEqual({
      sentence,
      distractorWords: [{ kind: "word", word: { wordId: "w_bab" } }],
      promptImage: { kind: "image", image: { assetId: "a_duck" } },
    });
  });

  it("no extra tiles and no picture are left out", () => {
    const saved = newAndSave("sentence_builder", { sentence, distractorWords: undefined, promptImage: undefined });
    expect(saved).toEqual({ sentence });
    expect(writeIssues("sentence_builder", saved)).toEqual([]);
  });

  it("offers reviewed words that are not in the sentence or already added", () => {
    const words = [
      word("w_hadhihi"),
      word("w_bab"),
      word("w_new", { reviewed_at: null }),
      word("w_old", { retired_at: "2026-01-01" }),
      word("w_drill", { is_pseudo: true }),
      word("w_bayt"),
    ];
    const choices = distractorChoices(words, ["w_hadhihi", "w_battatun"], [{ kind: "word", word: { wordId: "w_bab" } }]);
    expect(choices.map((w) => w.id)).toEqual(["w_bayt"]);
  });

  it("problems: too many tiles, a sentence word, a repeat, an unreviewed word, an unregistered picture", () => {
    const byId = new Map([word("w_bab"), word("w_new", { reviewed_at: null })].map((w) => [w.id, w]));
    const tile = (id: string) => ({ kind: "word" as const, word: { wordId: id } });
    const problems = sentenceBuilderProblems(
      ["w_hadhihi", "w_battatun"],
      [tile("w_bab"), tile("w_hadhihi"), tile("w_bab"), tile("w_new")],
      { kind: "image", image: { url: "https://x/raw.png" } },
      (id) => byId.get(id),
    );
    expect(problems).toEqual([
      "At most 3 extra word tiles (there are 4).",
      "Extra word 2 is a word of the sentence; it would fit a slot.",
      "Extra word 3 is added twice.",
      "Extra word 4 is not reviewed yet.",
      "Prompt picture: the picture is not in the asset registry; pick a registered picture.",
    ]);
  });
});

describe("sound_sort", () => {
  const letterBin = (id: string, letterId: string): SortBin => ({
    id,
    letterId,
    label: { kind: "letter", letter: { letterId, form: "isolated" } },
  });
  const clipBin = (id: string, letterId: string, assetId: string): SortBin => ({
    id,
    letterId,
    label: { kind: "audio", audio: { assetId, url: `https://x/${assetId}.mp3` } },
  });
  const wordItem = (id: string, wordId: string, binId: string): SortItem => ({
    id,
    kind: "word",
    word: { wordId, text: wordId },
    binId,
  });

  it("a first-sound sort the form built saves to the write schema", () => {
    const bins = [letterBin("b1", "ba"), letterBin("b2", "ta")];
    const items = [
      wordItem("i1", "w_bab", "b1"),
      wordItem("i2", "w_bayt", "b1"),
      wordItem("i3", "w_tin", "b2"),
      { id: "i4", kind: "image" as const, image: { assetId: "a_tut", url: "https://x/t.png" }, binId: "b2" },
    ];
    const saved = newAndSave("sound_sort", soundSortConfig({ sortBy: "first_sound" }, bins, items));
    expect(writeIssues("sound_sort", saved)).toEqual([]);
    expect(saved.items).toEqual([
      { id: "i1", kind: "word", word: { wordId: "w_bab" }, binId: "b1" },
      { id: "i2", kind: "word", word: { wordId: "w_bayt" }, binId: "b1" },
      { id: "i3", kind: "word", word: { wordId: "w_tin" }, binId: "b2" },
      { id: "i4", kind: "image", image: { assetId: "a_tut" }, binId: "b2" },
    ]);
    expect(saved.bins).toEqual([
      { id: "b1", letterId: "ba", label: { kind: "letter", letter: { letterId: "ba", form: "isolated" } } },
      { id: "b2", letterId: "ta", label: { kind: "letter", letter: { letterId: "ta", form: "isolated" } } },
    ]);
  });

  it("a contrast with clip baskets saves, and a stored row reopens and saves unchanged", () => {
    const bins = [clipBin("b1", "haa", "c_haa"), clipBin("b2", "heh", "c_heh")];
    const items = [
      wordItem("i1", "w_hut", "b1"),
      wordItem("i2", "w_hulm", "b1"),
      wordItem("i3", "w_hudhud", "b2"),
      wordItem("i4", "w_hiwa", "b2"),
    ];
    const saved = newAndSave("sound_sort", { ...soundSortConfig({ sortBy: "contrast" }, bins, items), playItemAudio: false });
    expect(writeIssues("sound_sort", saved)).toEqual([]);
    const { config, canonical } = openForEdit("sound_sort", saved);
    expect(toSaveConfig("sound_sort", config, canonical)).toEqual(saved);
  });

  it("a new sort starts with two baskets and four items", () => {
    const bins = binsOf({});
    expect(bins.map((b) => b.id)).toEqual(["b1", "b2"]);
    expect(itemsOf({}, bins).map((i) => [i.id, i.binId])).toEqual([
      ["i1", "b1"],
      ["i2", "b2"],
      ["i3", "b1"],
      ["i4", "b2"],
    ]);
  });

  it("picking a basket's sound shows its letter in a first-sound sort, not in a contrast", () => {
    const empty: SortBin = { id: "b1", letterId: "", label: { kind: "letter" } };
    expect(withBinLetter(empty, "ba", "first_sound").label).toEqual({ kind: "letter", letter: { letterId: "ba", form: "isolated" } });
    const clip = clipBin("b1", "", "c1");
    expect(withBinLetter(clip, "haa", "contrast")).toEqual({ ...clip, letterId: "haa" });
  });

  it("switching to a contrast clears letter labels", () => {
    const bins = withSortBy([letterBin("b1", "ba"), clipBin("b2", "ta", "c1")], "contrast");
    expect(bins[0]!.label).toEqual({ kind: "audio" });
    expect(bins[1]!.label.kind).toBe("audio");
  });

  it("removing a basket moves its items to the first other basket", () => {
    const next = removeBin(
      [letterBin("b1", "ba"), letterBin("b2", "ta"), letterBin("b3", "tha")],
      [wordItem("i1", "w1", "b1"), wordItem("i2", "w2", "b3")],
      2,
    );
    expect(next.bins.map((b) => b.id)).toEqual(["b1", "b2"]);
    expect(next.items.map((i) => i.binId)).toEqual(["b1", "b1"]);
  });

  it("problems mirror the schema and distractors_differ", () => {
    const problems = soundSortProblems(
      "contrast",
      [letterBin("b1", "haa"), clipBin("b2", "haa", "c1"), clipBin("b3", "kaf", "c2")],
      [wordItem("i1", "w1", "b1"), wordItem("i2", "w1", "b2"), wordItem("i3", "w3", "bX")],
    );
    expect(problems).toEqual([
      "A listening contrast sorts into exactly 2 baskets (there are 3).",
      "Basket 1: a listening contrast shows no letter or word on a basket.",
      "Baskets 1 and 2 stand for the same sound.",
      "Give 4 to 8 items (there are 3).",
      "Items 1 and 2 are the same word in two baskets.",
      "Item 3 (w3) is in no basket.",
      "Basket 3 has no item.",
    ]);
  });

  it("problems mirror sort_item_sound for a first sound and for a contrast", () => {
    const letters: Record<string, string> = { "ب": "ba", "ت": "ta", "ح": "haa", "ه": "heh", "و": "waw", "ي": "ya" };
    const texts: Record<string, string> = { w_bab: "بَاب", w_tut: "تُوت", w_bayt: "بَيْت", w_hut: "حُوت", w_hayh: "حَيَه" };
    const ctx = {
      wordLetters: (id: string) => letterIdsOf(texts[id] ?? "", (ch) => letters[ch] ?? (ch === "ا" ? "alif" : undefined)),
    };
    const first = soundSortProblems(
      "first_sound",
      [letterBin("b1", "ba"), letterBin("b2", "ta")],
      [wordItem("i1", "w_bab", "b1"), wordItem("i2", "w_tut", "b1"), wordItem("i3", "w_bayt", "b2"), wordItem("i4", "w_tut", "b2")],
      ctx,
    );
    expect(first).toEqual([
      "Item 2 (w_tut) does not start with the sound of its basket (ba).",
      "Item 3 (w_bayt) does not start with the sound of its basket (ta).",
      "Items 2 and 4 are the same word in two baskets.",
    ]);
    const contrast = soundSortProblems(
      "contrast",
      [clipBin("b1", "haa", "c1"), clipBin("b2", "heh", "c2")],
      [wordItem("i1", "w_hut", "b1"), wordItem("i2", "w_hayh", "b1"), wordItem("i3", "w_bab", "b2"), wordItem("i4", "w_bayt", "b2")],
      ctx,
    );
    expect(contrast).toEqual([
      "Item 2 (w_hayh) has both sounds (haa and heh); a child cannot sort it.",
      "Item 3 (w_bab) does not have the sound of its basket (heh).",
      "Item 4 (w_bayt) does not have the sound of its basket (heh).",
    ]);
  });

  it("warns when an item label has Arabic letters or is the word's text, never for a plain note", () => {
    expect(labelGivesItAway("بيت")).toBe(true);
    expect(labelGivesItAway("بَيْت", null)).toBe(true);
    expect(labelGivesItAway("house", "house")).toBe(true);
    expect(labelGivesItAway("a house photo", "بَيْت")).toBe(false);
    expect(labelGivesItAway("  ")).toBe(false);
    expect(labelGivesItAway(undefined)).toBe(false);
    const items = [
      { ...wordItem("i1", "w1", "b1"), label: "بيت" },
      { ...wordItem("i2", "w2", "b1"), label: "staff note" },
      wordItem("i3", "w3", "b1"),
    ];
    expect(soundSortWarnings(items)).toEqual(["Item 1: The child must hear this item, not read it."]);
  });

  it("letterIdsOf is null when a letter is not known", () => {
    expect(letterIdsOf("بَاب", (ch) => (ch === "ب" ? "ba" : undefined))).toBeNull();
  });
});

describe("save findings", () => {
  it("the reading checks get a short name before their message", () => {
    expect(checkTitle({ path: "sentence", message: "m", check: "phrase_reviewed" })).toBe("Phrase review");
    expect(checkTitle({ path: "items.0", message: "m", check: "sort_item_sound" })).toBe("Basket sound");
    expect(checkTitle({ path: "sentence.phrase.wordIds.0", message: "m", check: "decodable" })).toBe("Decodability");
    expect(checkTitle({ path: "sentence.phrase.wordIds.1", message: "m", check: "phrase_words" })).toBe("Phrase words");
    expect(checkTitle({ path: "x", message: "m", check: "write_schema" })).toBeNull();
  });
});
