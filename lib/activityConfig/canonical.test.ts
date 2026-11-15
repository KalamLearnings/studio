/**
 * CM-S3: each converted form's output passes the server's write schema.
 *
 * The schema is the backend's own (`@kalam/curriculum-schemas/server`, a
 * byte-for-byte copy kept by `server-schemas-drift.test.ts`). Each case builds
 * the config the way the form does (`{ ...config, ...updates }` from what the
 * form opened with), then sends it through `toSaveConfig`, as the save does.
 */

import { describe, expect, it } from "vitest";
import { getActivityConfigSchema, type ActivityType } from "@kalam/curriculum-schemas/server";
import { normalizeActivityConfig } from "../../components/builder/forms/normalizeActivityConfig";
import {
  CANONICAL_FORM_TYPES,
  isCanonicalFormType,
  openForEdit,
  readConfigForEdit,
  toSaveConfig,
  type Config,
} from "./canonical";

function writeIssues(type: string, config: Config): string[] {
  const result = getActivityConfigSchema(type as ActivityType).safeParse(config);
  return result.success
    ? []
    : result.error.issues.map((i) => `${i.path.join(".") || "(config)"}: ${i.message}`);
}

function expectWritable(type: string, config: Config) {
  expect(writeIssues(type, config), JSON.stringify(config)).toEqual([]);
}

/** Open a stored row, apply the form's edits, save. */
function editAndSave(type: string, stored: Config, edits: Config = {}): Config {
  const { config, canonical } = openForEdit(type, stored);
  return toSaveConfig(type, { ...config, ...edits }, canonical);
}

const ba = { letterId: "ba", form: "isolated" } as const;
const ta = { letterId: "ta", form: "isolated" } as const;
const meemFatha = { letterId: "meem", form: "initial", haraka: "fatha" } as const;

/** The 21 types the backend lists as ready to enforce (`SCHEMA_ENFORCE_CANDIDATES`, policy.ts). */
const ENFORCE_CANDIDATES = [
  "catch_fish_with_letter",
  "tap_dot_position",
  "letter_rain",
  "memory_card_match",
  "color_letter",
  "letter_discrimination",
  "grid_tap",
  "pick_from_tree",
  "pick_flowers",
  "tap_crescent_moons",
  "drag_to_animal_mouth",
  "feed_rabbit",
  "feed_baby",
  "snowflakes",
  "bear_honey",
  "fly_on_flowers",
  "deliver_envelope",
  "plant_seeds",
  "balance_scale",
  "ice_cream_stacking",
  "i_spy",
];

const THEMED_HUNTS = [
  "grid_tap",
  "pick_from_tree",
  "pick_flowers",
  "tap_crescent_moons",
  "drag_to_animal_mouth",
  "feed_rabbit",
  "feed_baby",
  "piggy_bank",
  "snowflakes",
  "bear_honey",
  "fly_on_flowers",
  "deliver_envelope",
  "plant_seeds",
  "balance_scale",
  "ice_cream_stacking",
];

/** Each form's own settings, as its controls write them. */
const FORM_SETTINGS: Record<string, Config> = {
  pop_balloons_with_letter: { balloonSpeed: 1.25 },
  letter_rain: { speed: 0.75 },
  catch_fish_with_letter: { fishSpeed: 1.5 },
  letter_discrimination: { letterPositions: ["isolated", "final"] },
  audio_letter_match: {},
  i_spy: { totalLetters: 12, letterSize: "large" },
};

describe("converted types", () => {
  it("include every enforce candidate, the big legacy types and the answer sets (MCQ, cards, match pairs)", () => {
    for (const t of ENFORCE_CANDIDATES) expect(isCanonicalFormType(t), t).toBe(true);
    for (const t of ["show_letter_or_word", "content_with_cards", "trace_letter", "speech_practice", "pop_balloons_with_letter", "multiple_choice_question", "match_pairs"]) {
      expect(isCanonicalFormType(t), t).toBe(true);
    }
  });

  it("leave other types on the shim, unchanged on save", () => {
    const mcq = { options: [{ id: "a", letter: ba, isCorrect: true }] };
    expect(readConfigForEdit("multiple_choice_question", mcq)).toEqual(
      normalizeActivityConfig("multiple_choice_question", mcq),
    );
    const blend = { word: "باب", wordId: "w1", stages: [] };
    expect(toSaveConfig("sound_blend", blend)).toBe(blend);
  });
});

describe.each([...THEMED_HUNTS, "pop_balloons_with_letter", "letter_rain", "catch_fish_with_letter", "letter_discrimination", "i_spy"])(
  "%s (letter hunt form)",
  (type) => {
    const settings = FORM_SETTINGS[type] ?? {};

    it("a new activity saves to the write schema", () => {
      // LetterSelector writes the refs; NumberInput writes `value || undefined`.
      const config = toSaveConfig(type, {
        ...readConfigForEdit(type, {}),
        targetLetter: [ba, { ...ba, form: "final" }],
        distractorLetters: [ta, meemFatha],
        targetCount: 5,
        duration: undefined,
        ...settings,
      });
      expectWritable(type, config);
      expect(config).not.toHaveProperty("duration");
    });

    it("a legacy row is converted on edit", () => {
      const stored = {
        targetLetter: "بَ",
        distractorLetters: [
          { letterId: "ta", form: "isolated", haraka: "none", value: "ت", type: "letter" },
          "ـث",
        ],
        ...(type === "piggy_bank" && { showArabicLabels: true }),
        ...(type === "pop_balloons_with_letter" && { correctLetter: "ب" }),
      };
      const saved = editAndSave(type, stored, { targetCount: 3 });
      expectWritable(type, saved);
      expect(saved.targetLetter).toEqual({ letterId: "ba", form: "isolated", haraka: "fatha" });
      expect(saved.distractorLetters).toEqual([ta, { letterId: "tha", form: "final" }]);
      if (type === "piggy_bank") expect(saved.showArabicLabel).toBe(true);
    });
  },
);

describe("pop_balloons_with_letter", () => {
  it("reads the legacy glyph correctLetter as targetLetter, and stops sending it", () => {
    const saved = editAndSave("pop_balloons_with_letter", { correctLetter: "ش", distractorLetters: [ta] });
    expectWritable("pop_balloons_with_letter", saved);
    expect(saved).toEqual({ targetLetter: { letterId: "sheen", form: "isolated" }, distractorLetters: [ta] });
  });
});

describe("color_letter", () => {
  it("new and legacy rows save to the write schema", () => {
    expectWritable("color_letter", toSaveConfig("color_letter", { letter: meemFatha, strokeWidth: 10 }));
    const saved = editAndSave("color_letter", { letter: { letterId: "ba", form: "isolated", display: "ب" } });
    expectWritable("color_letter", saved);
    expect(saved.letter).toEqual(ba);
  });
});

describe("tap_dot_position", () => {
  it("a glyph target takes its form from the legacy position, which is no longer sent", () => {
    const saved = editAndSave("tap_dot_position", { targetLetter: "ب", position: "initial" }, {
      distractorPositions: ["top", "bottom-left"],
    });
    expectWritable("tap_dot_position", saved);
    expect(saved.targetLetter).toEqual({ letterId: "ba", form: "initial" });
    expect(saved).not.toHaveProperty("position");
  });

  it("a new activity saves to the write schema", () => {
    expectWritable("tap_dot_position", toSaveConfig("tap_dot_position", { targetLetter: ba, distractorPositions: ["top"] }));
  });
});

describe("drag_dots_to_letter", () => {
  it("a glyph target takes its form from position; a new activity saves to the write schema", () => {
    const saved = editAndSave("drag_dots_to_letter", { targetLetter: "ت", position: "final" }, { distractorDotsCount: 2 });
    expectWritable("drag_dots_to_letter", saved);
    expect(saved).toEqual({ targetLetter: { letterId: "ta", form: "final" }, distractorDotsCount: 2 });
    expectWritable("drag_dots_to_letter", toSaveConfig("drag_dots_to_letter", { targetLetter: [ta], distractorDotsCount: 0 }));
  });
});

describe("drag_haraka_to_letter", () => {
  it("single and multi-letter modes save to the write schema", () => {
    const opened = readConfigForEdit("drag_haraka_to_letter", {});
    expectWritable("drag_haraka_to_letter", toSaveConfig("drag_haraka_to_letter", {
      ...opened,
      harakaType: "fatha",
      targetLetter: ba,
      distractorLetters: undefined,
      distractorHarakat: undefined,
    }));
    const saved = editAndSave("drag_haraka_to_letter", {
      targetLetter: { letterId: "ba", form: "isolated", haraka: "none" },
      harakaType: "kasra",
    }, { distractorLetters: [ta, meemFatha], distractorHarakat: ["damma"] });
    expectWritable("drag_haraka_to_letter", saved);
    expect(saved.targetLetter).toEqual(ba);
  });
});

describe("trace_letter", () => {
  it("the legacy glyph letterForm becomes targetLetter on edit and is no longer sent", () => {
    const saved = editAndSave("trace_letter", { letterForm: "ـبـ", mode: "guided" }, { traceCount: 2 });
    expectWritable("trace_letter", saved);
    expect(saved).toEqual({ targetLetter: { letterId: "ba", form: "medial" }, mode: "guided", traceCount: 2 });
  });

  it("a glyph whose form disagrees with position stays on the shim (v1 draws the stored glyph)", () => {
    const stored = { letterForm: "ب", position: "final" };
    const opened = openForEdit("trace_letter", stored);
    expect(opened.canonical).toBe(false);
    expect(toSaveConfig("trace_letter", opened.config, opened.canonical)).toEqual(
      normalizeActivityConfig("trace_letter", stored),
    );
  });

  it("a glyph whose form agrees with position is converted", () => {
    const saved = editAndSave("trace_letter", { letterForm: "ـب", position: "final" });
    expect(saved).toEqual({ targetLetter: { letterId: "ba", form: "final" } });
    expectWritable("trace_letter", saved);
  });

  it("a new activity saves to the write schema", () => {
    expectWritable("trace_letter", toSaveConfig("trace_letter", { targetLetter: ba, mode: "freehand", traceCount: 1 }));
  });
});

describe("memory_card_match", () => {
  it("sends no per-letter audio (letters own their audio)", () => {
    // what the form saved before CM-S3 in letter_to_sound mode
    const stored = {
      matchType: "letter_to_sound",
      letters: [
        { letterId: "ba", form: "isolated", audioId: "a1", audioUrl: "https://x/ba.mp3" },
        { letterId: "ta", form: "initial", matchingForm: "final", audioId: "a2" },
      ],
    };
    const saved = editAndSave("memory_card_match", stored, { showHints: true });
    expectWritable("memory_card_match", saved);
    expect(saved.letters).toEqual([ba, { letterId: "ta", form: "initial", matchingForm: "final" }]);
  });

  it("a new activity saves to the write schema", () => {
    const config = toSaveConfig("memory_card_match", {
      letters: [ba, { ...ta, matchingForm: undefined }],
      matchType: "letter_to_letter",
    });
    expectWritable("memory_card_match", config);
  });
});

describe("show_letter_or_word", () => {
  it("a legacy letter row (letter key, no contentType) is converted on edit", () => {
    const saved = editAndSave("show_letter_or_word", { letter: { letterId: "ba", form: "isolated", value: "ب" } });
    expectWritable("show_letter_or_word", saved);
    expect(saved).toEqual({ contentType: "letter", targetLetter: ba });
  });

  it("letter mode drops what another mode left behind", () => {
    const saved = toSaveConfig("show_letter_or_word", {
      contentType: "letter",
      targetLetter: ba,
      word: "باب",
      image: "",
      imageWidth: 300,
    });
    expectWritable("show_letter_or_word", saved);
    expect(saved).toEqual({ contentType: "letter", targetLetter: ba, imageWidth: 300 });
  });

  it("word and picture rows stay in their legacy shape (v1 reads the strings)", () => {
    const word = { contentType: "word", word: "باب" };
    expect(readConfigForEdit("show_letter_or_word", word)).toEqual(word);
    expect(toSaveConfig("show_letter_or_word", word)).toEqual(word);
    const image = { image: "https://x/cat.png" };
    expect(toSaveConfig("show_letter_or_word", readConfigForEdit("show_letter_or_word", image))).toEqual({
      ...image,
      contentType: "image",
    });
  });
});

describe("speech_practice", () => {
  it("a legacy letter row (letter reference) is converted on edit", () => {
    const saved = editAndSave("speech_practice", { letter: { letterId: "ba", form: "isolated" }, passingScore: 60 });
    expectWritable("speech_practice", saved);
    // contentType stays absent, as stored (v1 reads its presence)
    expect(saved).toEqual({ targetLetter: ba, passingScore: 60 });
  });

  it("letter mode drops the word and focus glyph", () => {
    const saved = toSaveConfig("speech_practice", { contentType: "letter", targetLetter: ba, word: undefined, letter: undefined });
    expectWritable("speech_practice", saved);
  });

  it("word rows stay in their legacy shape", () => {
    const row = { contentType: "letter_in_word", word: "باب", letter: "ب" };
    expect(readConfigForEdit("speech_practice", row)).toEqual(row);
    expect(toSaveConfig("speech_practice", row)).toEqual(row);
  });
});

describe("content_with_cards", () => {
  it("a legacy letter-card row is converted on edit", () => {
    const stored = {
      contentType: "letter",
      targetLetter: { letterId: "ba", form: "isolated" },
      cardMode: "letter",
      interactive: false,
      content: { en: "", ar: "" },
      cards: [
        { id: "c1", text: "بَ", isCorrect: false },
        { id: "c2", text: "ب", letter: { letterId: "ba", form: "final" }, isCorrect: false },
      ],
    };
    const saved = editAndSave("content_with_cards", stored);
    expectWritable("content_with_cards", saved);
    expect(saved).toEqual({
      contentType: "letter",
      targetLetter: ba,
      interactive: false,
      cards: [
        { id: "c1", kind: "letter", letter: { letterId: "ba", form: "isolated", haraka: "fatha" }, isCorrect: false },
        { id: "c2", kind: "letter", letter: { letterId: "ba", form: "final" }, isCorrect: false },
      ],
    });
  });

  it("a new activity (cards added in the form, letters picked) saves to the write schema", () => {
    const opened = readConfigForEdit("content_with_cards", {});
    const saved = toSaveConfig("content_with_cards", {
      ...opened,
      contentType: "letter",
      targetLetter: ba,
      cards: [
        { id: "card_0_1", text: "", isCorrect: false, letter: { ...ba, form: "initial" } },
        { id: "card_1_1", text: "", isCorrect: true, letter: meemFatha },
      ],
    });
    expectWritable("content_with_cards", saved);
  });

  it("a card with no letter yet keeps v1's shape (the server could not show it to v1)", () => {
    const row = { cards: [{ id: "c1", text: "", isCorrect: false }] };
    expect(toSaveConfig("content_with_cards", row)).toBe(row);
  });

  it("word and picture cards stay in their legacy shape", () => {
    const row = { contentType: "letter", targetLetter: ba, cardMode: "word", cards: [{ id: "c1", text: "باب" }] };
    expect(toSaveConfig("content_with_cards", readConfigForEdit("content_with_cards", row))).toEqual(row);
  });
});

describe("every converted type", () => {
  it("is idempotent on save", () => {
    const samples: Record<string, Config> = {
      grid_tap: { targetLetter: ba, distractorLetters: [ta] },
      trace_letter: { targetLetter: ba },
      memory_card_match: { letters: [ba, ta] },
      content_with_cards: { cards: [{ id: "c", kind: "letter", letter: ba }] },
    };
    for (const [type, cfg] of Object.entries(samples)) {
      const once = toSaveConfig(type, cfg);
      expect(toSaveConfig(type, once)).toEqual(once);
    }
    expect(toSaveConfig("multiple_choice_question", MCQ_LETTERS)).toEqual(
      toSaveConfig("multiple_choice_question", toSaveConfig("multiple_choice_question", MCQ_LETTERS)),
    );
    expect(Object.keys(CANONICAL_FORM_TYPES).length).toBe(31);
  });
});

// ---------------------------------------------------------------------------
// CM-S6: answer sets
// ---------------------------------------------------------------------------

/** A new MCQ as the form builds it: letters picked in the grid, a prompt kind. */
const MCQ_LETTERS: Config = {
  mode: "letter",
  prompt: { kind: "sound_to_symbol" },
  options: [
    { id: "option_0", text: { en: "", ar: "" }, letter: ba, isCorrect: true },
    { id: "option_1", text: { en: "", ar: "" }, letter: meemFatha, isCorrect: false },
  ],
};

describe("multiple_choice_question", () => {
  it("a new letter-only question with a prompt kind saves to the write schema", () => {
    const saved = toSaveConfig("multiple_choice_question", { ...readConfigForEdit("multiple_choice_question", {}), ...MCQ_LETTERS });
    expectWritable("multiple_choice_question", saved);
    expect(saved).toEqual({
      prompt: { kind: "sound_to_symbol" },
      options: [
        { id: "option_0", kind: "letter", letter: ba, isCorrect: true },
        { id: "option_1", kind: "letter", letter: meemFatha, isCorrect: false },
      ],
    });
  });

  it("an empty option keeps v1's shape until it is filled (the server could not show it to v1)", () => {
    const row = { ...MCQ_LETTERS, options: [...(MCQ_LETTERS.options as Config[]), { id: "option_2", text: { en: "", ar: "" }, isCorrect: false }] };
    expect(toSaveConfig("multiple_choice_question", row)).toBe(row);
  });

  it("library words, numerals and a letter, numeral or library word stimulus save canonically (R2)", () => {
    const words = {
      mode: "word",
      prompt: { kind: "meaning", target: { kind: "word", word: { wordId: "w-dub", text: "دب" } } },
      question: { en: "", ar: "دب" },
      options: [
        { id: "a", text: { en: "", ar: "باب" }, word: { wordId: "w-bab" }, isCorrect: true },
        { id: "b", text: { en: "", ar: "3" }, isCorrect: false },
      ],
    };
    const saved = toSaveConfig("multiple_choice_question", words);
    expectWritable("multiple_choice_question", saved);
    expect(saved).toEqual({
      prompt: { kind: "meaning", target: { kind: "word", word: { wordId: "w-dub" } } },
      options: [{ id: "a", kind: "word", word: { wordId: "w-bab" }, isCorrect: true }, { id: "b", kind: "numeral", numeral: 3, isCorrect: false }],
    });
    const letterQuestion = toSaveConfig("multiple_choice_question", { ...MCQ_LETTERS, question: { en: "", ar: "بَ" } });
    expect(letterQuestion.prompt).toEqual({ kind: "sound_to_symbol", target: { kind: "letter", letter: { letterId: "ba", form: "isolated", haraka: "fatha" } } });
    const countQuestion = toSaveConfig("multiple_choice_question", { ...MCQ_LETTERS, question: { en: "", ar: "4" } });
    expect(countQuestion.prompt).toEqual({ kind: "sound_to_symbol", target: { kind: "numeral", numeral: 4 } });
  });

  it("stays in v1's shape without a prompt kind, or with what the server cannot show to v1", () => {
    const cases: Config[] = [
      { ...MCQ_LETTERS, prompt: undefined },
      // a typed word (no library id) as the stimulus or an option
      { ...MCQ_LETTERS, question: { en: "", ar: "باب" } },
      { ...MCQ_LETTERS, mode: "word", options: [{ id: "a", text: { en: "", ar: "باب" }, isCorrect: true }] },
      // a stimulus word picked from the library, then retyped
      { ...MCQ_LETTERS, prompt: { kind: "meaning", target: { kind: "word", word: { wordId: "w-dub", text: "دب" } } }, question: { en: "", ar: "باب" } },
      // pictures: v1 reads option.image and questionImage as URLs
      { ...MCQ_LETTERS, questionImage: "https://x/a.png" },
      { ...MCQ_LETTERS, mode: "image", options: [{ id: "a", text: { en: "", ar: "" }, image: "https://x/a.png", isCorrect: true }] },
    ];
    for (const c of cases) expect(toSaveConfig("multiple_choice_question", c)).toBe(c);
  });

  it("a legacy row opens canonically when the server can show it; one with a picture or no prompt kind opens on the shim", () => {
    const legacy = { prompt: { kind: "form" }, options: [{ id: "a", letter: ba, isCorrect: true }, { id: "b", letter: ta, isCorrect: false }] };
    const opened = openForEdit("multiple_choice_question", legacy);
    expect(opened.canonical).toBe(true);
    expectWritable("multiple_choice_question", toSaveConfig("multiple_choice_question", opened.config));
    const stored = { prompt: { kind: "form" }, options: [{ id: "a", kind: "letter", letter: ba, isCorrect: true }, { id: "b", kind: "letter", letter: ta }] };
    expect(openForEdit("multiple_choice_question", stored).canonical).toBe(true);
    expect(openForEdit("multiple_choice_question", { options: legacy.options }).canonical).toBe(false);
    const textAndPicture = { prompt: { kind: "form" }, options: [{ id: "a", text: { en: "", ar: "ب" }, image: "x.png", isCorrect: true }, { id: "b", letter: ta }] };
    expect(openForEdit("multiple_choice_question", textAndPicture).canonical).toBe(false);
    expect(openForEdit("multiple_choice_question", { ...legacy, mode: "image" }).canonical).toBe(false);
  });

  it("a stored canonical row opens with the question and word texts the server wrote, and saves back the same references", () => {
    const stored = {
      mode: "word",
      prompt: { kind: "meaning", target: { kind: "word", word: { wordId: "w-dub" } } },
      question: { en: "", ar: "دب" },
      options: [{ id: "a", kind: "word", word: { wordId: "w-bab" }, isCorrect: true, text: { en: "", ar: "باب" } }, { id: "b", kind: "numeral", numeral: 2, text: { en: "", ar: "2" } }],
    };
    const opened = openForEdit("multiple_choice_question", stored);
    expect(opened.canonical).toBe(true);
    expect(opened.config.question).toEqual({ en: "", ar: "دب" });
    expect((opened.config.options as Config[])[0].word).toEqual({ wordId: "w-bab", text: "باب" });
    expect(toSaveConfig("multiple_choice_question", opened.config)).toEqual({
      prompt: { kind: "meaning", target: { kind: "word", word: { wordId: "w-dub" } } },
      options: [{ id: "a", kind: "word", word: { wordId: "w-bab" }, isCorrect: true }, { id: "b", kind: "numeral", numeral: 2 }],
    });
  });

  it("a canonical row given a letter stimulus in the form saves it as prompt.target", () => {
    const stored = { prompt: { kind: "form" }, options: [{ id: "a", kind: "letter", letter: ba, isCorrect: true }, { id: "b", kind: "letter", letter: ta }] };
    const saved = editAndSave("multiple_choice_question", stored, { question: { en: "", ar: "ب" } });
    expect(saved.question).toBeUndefined();
    expect(saved.prompt).toEqual({ kind: "form", target: { kind: "letter", letter: ba } });
  });
});

describe("content_with_cards prompt (CM-S6)", () => {
  it("letter cards keep a prompt kind", () => {
    const saved = toSaveConfig("content_with_cards", {
      interactive: true,
      prompt: { kind: "form" },
      cards: [{ id: "c1", text: "", letter: ba, isCorrect: true }, { id: "c2", text: "", letter: { ...ba, form: "final" }, isCorrect: false }],
    });
    expectWritable("content_with_cards", saved);
    expect(saved.prompt).toEqual({ kind: "form" });
  });

  it("numeral and library word cards save canonically (the server writes the card text, R2)", () => {
    const saved = toSaveConfig("content_with_cards", {
      cardMode: "word",
      cards: [{ id: "c1", text: "3", isCorrect: false }, { id: "c2", text: "باب", word: { wordId: "w-bab" }, isCorrect: false }],
    });
    expectWritable("content_with_cards", saved);
    expect(saved).toEqual({
      cards: [{ id: "c1", kind: "numeral", numeral: 3, isCorrect: false }, { id: "c2", kind: "word", word: { wordId: "w-bab" }, isCorrect: false }],
    });
  });

  it("a stored canonical word card opens with its text as the word hint", () => {
    const opened = openForEdit("content_with_cards", { cards: [{ id: "c1", kind: "word", word: { wordId: "w-bab" }, text: "باب" }] });
    expect(opened.canonical).toBe(true);
    expect((opened.config.cards as Config[])[0].word).toEqual({ wordId: "w-bab", text: "باب" });
  });

  it("a card with a picture stays on the shim", () => {
    expect(openForEdit("content_with_cards", { cards: [{ id: "c1", text: "", letter: ba, image: "https://x/a.png" }] }).canonical).toBe(false);
  });
});

describe("match_pairs (R2: the server writes every side's type, value and audioUrl)", () => {
  it("a typed word (no library id), a picture or a URL-only clip keeps v1's shape", () => {
    const rows = [
      { pairs: [{ left: { type: "letter", value: "ب", letterId: "ba", form: "isolated" }, right: { type: "word", value: "باب" } }] },
      { pairs: [{ left: { type: "letter", value: "ب", letterId: "ba", form: "isolated" }, right: { type: "image", value: "https://x/a.png" } }] },
      { pairs: [{ left: { type: "letter", value: "ب", letterId: "ba", form: "isolated" }, right: { type: "audio", value: "https://x/a.mp3", audioUrl: "https://x/a.mp3" } }] },
    ];
    for (const row of rows) expect(toSaveConfig("match_pairs", row)).toBe(row);
  });

  it("a legacy letter and audio row opens canonically with its clip URLs as hints", () => {
    const stored = {
      pairs: [
        { left: { type: "letter", value: "بِ", letterId: "ba", form: "isolated", haraka: "kasra" }, right: { type: "audio", audioId: "au-1", audioUrl: "https://x/bi.mp3" } },
        { left: { type: "word", value: "باب", word: { wordId: "w-bab" } }, right: { type: "letter", value: "ـب", letterId: "ba", form: "final" } },
      ],
    };
    const opened = openForEdit("match_pairs", stored);
    expect(opened.canonical).toBe(true);
    expect(((opened.config.pairs as Config[])[0].right as Config).audio).toEqual({ assetId: "au-1", url: "https://x/bi.mp3" });
  });

  it("its writer gives the write schema's shape", () => {
    const written = CANONICAL_FORM_TYPES.match_pairs.write({
      prompt: { kind: "symbol_to_sound" },
      shuffleItems: true,
      pairs: [
        { left: { type: "letter", value: "بَ", letterId: "ba", form: "isolated", haraka: "fatha" }, right: { type: "audio", value: "https://x/ba.mp3", audioUrl: "https://x/ba.mp3", audioId: "f19c9c92-e369-472e-9888-fcc4cd89d2d2" } },
        { left: { type: "letter", value: "ت", letterId: "ta", form: "isolated", label: "ta" }, right: { type: "letter", value: "ـت", letterId: "ta", form: "final" } },
      ],
    }, "match_pairs");
    expectWritable("match_pairs", written);
    expect((written.pairs as Config[])[0]).toEqual({
      left: { kind: "letter", letter: { letterId: "ba", form: "isolated", haraka: "fatha" } },
      right: { kind: "audio", audio: { assetId: "f19c9c92-e369-472e-9888-fcc4cd89d2d2" } },
    });
  });
});
