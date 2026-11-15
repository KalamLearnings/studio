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
  it("include every enforce candidate, the big legacy types and MCQ; match pairs is blocked for v1", () => {
    for (const t of ENFORCE_CANDIDATES) expect(isCanonicalFormType(t), t).toBe(true);
    for (const t of ["show_letter_or_word", "content_with_cards", "trace_letter", "speech_practice", "pop_balloons_with_letter", "multiple_choice_question"]) {
      expect(isCanonicalFormType(t), t).toBe(true);
    }
    expect(isCanonicalFormType("match_pairs")).toBe(false);
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

  it("a card with no letter yet is refused on cards.N.letter", () => {
    const saved = toSaveConfig("content_with_cards", { cards: [{ id: "c1", text: "", isCorrect: false }] });
    expect(writeIssues("content_with_cards", saved)).toEqual(["cards.0.letter: a letter item needs its letter"]);
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

  it("an empty letter option is refused on options.N.letter", () => {
    const saved = toSaveConfig("multiple_choice_question", {
      ...MCQ_LETTERS,
      options: [...(MCQ_LETTERS.options as Config[]), { id: "option_2", text: { en: "", ar: "" }, isCorrect: false }],
    });
    expect(writeIssues("multiple_choice_question", saved)).toEqual(["options.2.letter: a letter item needs its letter"]);
  });

  it("stays in v1's shape without a prompt kind, with a stimulus, or with other kinds of option", () => {
    const cases: Config[] = [
      { ...MCQ_LETTERS, prompt: undefined },
      { ...MCQ_LETTERS, question: { en: "", ar: "باب" } },
      { ...MCQ_LETTERS, questionImage: "https://x/a.png" },
      { ...MCQ_LETTERS, mode: "word", options: [{ id: "a", text: { en: "", ar: "باب" }, isCorrect: true }] },
      { ...MCQ_LETTERS, mode: "text", options: [{ id: "a", text: { en: "", ar: "3" }, isCorrect: true }] },
      { ...MCQ_LETTERS, mode: "image", options: [{ id: "a", text: { en: "", ar: "" }, image: "https://x/a.png", isCorrect: true }] },
    ];
    for (const c of cases) expect(toSaveConfig("multiple_choice_question", c)).toBe(c);
  });

  it("a legacy row opens on the shim; a canonical row opens canonically", () => {
    const legacy = { prompt: { kind: "form" }, options: [{ id: "a", letter: ba, isCorrect: true }, { id: "b", letter: ta, isCorrect: false }] };
    expect(openForEdit("multiple_choice_question", legacy).canonical).toBe(false);
    const stored = { prompt: { kind: "form" }, options: [{ id: "a", kind: "letter", letter: ba, isCorrect: true }, { id: "b", kind: "letter", letter: ta }] };
    const opened = openForEdit("multiple_choice_question", stored);
    expect(opened.canonical).toBe(true);
    expectWritable("multiple_choice_question", toSaveConfig("multiple_choice_question", opened.config));
  });

  it("a canonical row given a stimulus in the form saves in v1's shape", () => {
    const stored = { prompt: { kind: "form" }, options: [{ id: "a", kind: "letter", letter: ba, isCorrect: true }, { id: "b", kind: "letter", letter: ta }] };
    const saved = editAndSave("multiple_choice_question", stored, { question: { en: "", ar: "ب" } });
    expect(saved.question).toEqual({ en: "", ar: "ب" });
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

  it("numeral cards stay in v1's shape (v1 reads the card text)", () => {
    const row = { cardMode: "word", cards: [{ id: "c1", text: "3", isCorrect: false }] };
    expect(toSaveConfig("content_with_cards", row)).toEqual(row);
  });
});

describe("match_pairs (blocked for v1)", () => {
  it("saves as the form built it", () => {
    const row = { pairs: [{ left: { type: "letter", value: "ب", letterId: "ba", form: "isolated" }, right: { type: "word", value: "باب" } }] };
    expect(toSaveConfig("match_pairs", row)).toBe(row);
  });

  it("its writer, for when the server writes v1's side fields, gives the write schema's shape", () => {
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
