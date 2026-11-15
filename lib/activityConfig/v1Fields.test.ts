/**
 * CM-S3 x CM-B31: opening and saving an activity in Studio must not change
 * any field the v1 app reads.
 *
 * For every converted type (`CANONICAL_FORM_TYPES`), each PROD-shaped stored
 * config (the backend's CM-B7 fixture, one PROD config per distinct shape,
 * plus the legacy rows below) is delivered to v1 twice through the backend's
 * own delivery path (`enrichActivityConfig` and `resolveActivityStorageUrls`,
 * as `makeGetNodeActivities` runs them): as stored, after Studio opens and
 * saves it unchanged (`openForEdit`, then `toSaveConfig`), and after the
 * Studio before CM-S3 did the same (the shim, then the config as the form
 * holds it). The deliveries are compared on the v1 fields with the backend's
 * CM-B31 rule
 * (`compareV1Deliveries`, fixture `tests/golden/v1-fields.json`). Letters come
 * from the backend's letters seed.
 *
 * Every backend file used here is a byte-for-byte copy under
 * packages/curriculum-schemas/test/backend (sync: scripts/sync-server-schemas.mjs;
 * drift: server-schemas-drift.test.ts).
 *
 * The rule: an open-and-save may differ from the stored row on a v1 field only
 * where the Studio before CM-S3 already made the same change (the shim's own
 * mappings, e.g. a missing `contentType` written as `letter`). A type with any
 * other difference must not be converted: it goes to `V1_BLOCKED_TYPES`, opens
 * on the shim and saves exactly as before, until the server writes the fields
 * v1 reads.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  compareV1Deliveries,
  type DeliveredActivity,
  type V1FieldFixture,
} from "../../packages/curriculum-schemas/test/backend/supabase/functions/_shared/core/domain/content-audit/v1-fields.ts";
import {
  enrichActivityConfig,
  resolveActivityStorageUrls,
  type StorageUrlResolver,
} from "../../packages/curriculum-schemas/test/backend/supabase/functions/_shared/core/domain/curriculum/player-projection.ts";
import type { LetterData } from "../../packages/curriculum-schemas/test/backend/supabase/functions/_shared/core/domain/curriculum/letter-reference.ts";
import { normalizeActivityConfig } from "../../components/builder/forms/normalizeActivityConfig";
import {
  CANONICAL_FORM_TYPES,
  openForEdit,
  toSaveConfig,
  V1_BLOCKED_TYPES,
  type Config,
} from "./canonical";

const BACKEND = "../../packages/curriculum-schemas/test/backend/";
const read = (path: string) => readFileSync(fileURLToPath(new URL(BACKEND + path, import.meta.url)), "utf8");

const FIXTURE = JSON.parse(read("tests/golden/v1-fields.json")) as V1FieldFixture;
const PROD_SHAPES = JSON.parse(
  read("supabase/functions/_shared/{tests}/unit/curriculum-schemas/fixtures/prod-activity-shapes.json"),
) as { id: string; type: string; config: Config }[];

/** The letters table from the backend seed: id, base glyph and forms. */
function lettersFromSeed(): Record<string, LetterData> {
  const out: Record<string, LetterData> = {};
  const row = /^\s*\('([a-z_]+)', '([^']*)', \d+, '[^']*', '[^']*', '[^']*', '(\{[^']*\})'/gm;
  for (const m of read("supabase/seed_letters.sql").matchAll(row)) {
    out[m[1]!] = { id: m[1]!, letter: m[2]!, forms: JSON.parse(m[3]!) };
  }
  return out;
}
const LETTERS = lettersFromSeed();

/** Offline storage base, as the backend's golden script uses. */
const URLS: StorageUrlResolver = {
  audio: (p) => `https://golden.invalid/storage/v1/object/public/curriculum-audio/${p}`,
  image: (p) => `https://golden.invalid/storage/v1/object/public/curriculum-images/${p}`,
};

/** One activity as `POST /curriculum/nodes/activities` delivers it to v1. */
function deliver(id: string, type: string, config: Config): DeliveredActivity {
  return resolveActivityStorageUrls(
    {
      id,
      sequence_number: 1,
      type,
      instruction: { en: "Do it" },
      config: enrichActivityConfig({ type, config: structuredClone(config) }, LETTERS, URLS),
    },
    URLS,
  ) as DeliveredActivity;
}

/** What Studio stores after an author opens the row and saves it unchanged. */
function openAndSave(type: string, stored: Config): Config {
  const { config, canonical } = openForEdit(type, structuredClone(stored));
  return toSaveConfig(type, config, canonical);
}

/** What the Studio before CM-S3 stored after the same open-and-save. */
function oldOpenAndSave(type: string, stored: Config): Config {
  return JSON.parse(JSON.stringify(normalizeActivityConfig(type, structuredClone(stored))));
}

function v1Diffs(before: DeliveredActivity, after: DeliveredActivity) {
  return compareV1Deliveries(
    [{ nodeId: "n", activities: [before] }],
    [{ nodeId: "n", activities: [after] }],
    FIXTURE,
  ).differences;
}

/** Legacy rows beyond the PROD shapes fixture (each a shape the CM-B7 report names). */
const EXTRA_ROWS: { id: string; type: string; config: Config }[] = [
  { id: "x-trace-1", type: "trace_letter", config: { letterForm: "ـبـ", mode: "guided" } },
  { id: "x-trace-2", type: "trace_letter", config: { letterForm: "ب", position: "final" } },
  { id: "x-pop-1", type: "pop_balloons_with_letter", config: { correctLetter: "ش", distractorLetters: [{ letterId: "seen", form: "isolated" }] } },
  { id: "x-pop-2", type: "pop_balloons_with_letter", config: { correctLetter: "د", targetLetter: [{ letterId: "thal", form: "isolated" }] } },
  { id: "x-piggy", type: "piggy_bank", config: { targetLetter: [{ letterId: "ba", form: "isolated" }], showArabicLabels: true } },
  {
    id: "x-cards",
    type: "content_with_cards",
    config: {
      contentType: "letter",
      targetLetter: { letterId: "ba", form: "isolated" },
      cardMode: "letter",
      interactive: false,
      cards: [{ id: "c1", text: "بَ", isCorrect: false }, { id: "c2", text: "ـبـ", isCorrect: false }],
    },
  },
  { id: "x-show", type: "show_letter_or_word", config: { letter: { letterId: "ba", form: "isolated" } } },
  { id: "x-speech", type: "speech_practice", config: { letter: { letterId: "ba", form: "isolated" }, passingScore: 60 } },
  {
    id: "x-memory",
    type: "memory_card_match",
    config: { matchType: "letter_to_sound", letters: [{ letterId: "ba", form: "isolated", audioId: "a1", audioUrl: "https://x/ba.mp3" }, { letterId: "ta", form: "isolated" }] },
  },
  { id: "x-tapdot", type: "tap_dot_position", config: { targetLetter: "ب", position: "initial", distractorPositions: ["top"] } },
  { id: "x-dragdots", type: "drag_dots_to_letter", config: { targetLetter: "ت", position: "final" } },
  { id: "x-color", type: "color_letter", config: { letter: { letterId: "ba", form: "isolated", display: "ب" } } },
  { id: "x-haraka", type: "drag_haraka_to_letter", config: { targetLetter: { letterId: "ba", form: "isolated", haraka: "none" }, harakaType: "fatha" } },
  // CM-S6: a letter-only MCQ with a prompt kind and no stimulus opens canonically
  // only when it is canonical already (x-mcq-kinded); in the legacy shape it
  // stays on the shim (v1 reads the options array as a whole)
  {
    id: "x-mcq-letters",
    type: "multiple_choice_question",
    config: {
      prompt: { kind: "sound_to_symbol" },
      options: [
        { id: "a", letter: { letterId: "ba", form: "isolated" }, text: { en: "", ar: "" }, isCorrect: true },
        { id: "b", letter: { letterId: "ta", form: "initial", haraka: "fatha" }, text: { en: "", ar: "" }, isCorrect: false },
      ],
    },
  },
  {
    id: "x-mcq-kinded",
    type: "multiple_choice_question",
    config: {
      prompt: { kind: "form" },
      options: [
        { id: "a", kind: "letter", letter: { letterId: "ba", form: "final" }, isCorrect: true },
        { id: "b", kind: "letter", letter: { letterId: "ba", form: "medial" }, isCorrect: false },
      ],
    },
  },
  // ...but not with a stored mode, a stimulus, or other kinds of option
  {
    id: "x-mcq-mode",
    type: "multiple_choice_question",
    config: { mode: "letter", prompt: { kind: "sound_to_symbol" }, options: [{ id: "a", letter: { letterId: "ba", form: "isolated" }, isCorrect: true }, { id: "b", letter: { letterId: "ta", form: "isolated" }, isCorrect: false }] },
  },
  {
    id: "x-mcq-question",
    type: "multiple_choice_question",
    config: { question: { en: "", ar: "باب" }, prompt: { kind: "symbol_to_sound" }, options: [{ id: "a", letter: { letterId: "ba", form: "isolated" }, isCorrect: true }, { id: "b", letter: { letterId: "ta", form: "isolated" }, isCorrect: false }] },
  },
  {
    id: "x-mcq-numerals",
    type: "multiple_choice_question",
    config: { prompt: { kind: "count" }, options: [{ id: "a", text: { en: "", ar: "2" }, isCorrect: true }, { id: "b", text: { en: "", ar: "3" }, isCorrect: false }] },
  },
];

function rowsOf(types: readonly string[]) {
  const wanted = new Set(types);
  return [...PROD_SHAPES, ...EXTRA_ROWS].filter((r) => wanted.has(r.type) && Object.keys(r.config ?? {}).length > 0);
}

const line = (id: string, d: { at?: string; path?: string; kind: string; before?: unknown; after?: unknown }) =>
  `${id} ${d.at ?? d.path ?? d.kind}: ${JSON.stringify(d.before)} -> ${JSON.stringify(d.after)}`;

/**
 * The v1 field differences an open-and-save makes against the stored row that
 * the Studio before CM-S3 did not already make, by type.
 */
function newDifferencesByType(types: readonly string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const row of rowsOf(types)) {
    const stored = deliver(row.id, row.type, row.config);
    const now = v1Diffs(stored, deliver(row.id, row.type, openAndSave(row.type, row.config)));
    const before = new Set(
      v1Diffs(stored, deliver(row.id, row.type, oldOpenAndSave(row.type, row.config))).map((d) => line(row.id, d)),
    );
    for (const d of now) {
      if (!before.has(line(row.id, d))) (out[row.type] ??= []).push(line(row.id, d));
    }
  }
  return out;
}

/** Every v1 difference against the stored row, made the same way before and after CM-S3. */
function sharedDifferences(types: readonly string[]): string[] {
  const out: string[] = [];
  for (const row of rowsOf(types)) {
    const stored = deliver(row.id, row.type, row.config);
    for (const d of v1Diffs(stored, deliver(row.id, row.type, openAndSave(row.type, row.config)))) {
      out.push(`${row.type} ${line(row.id, d)}`);
    }
  }
  return out;
}

describe("v1 fields after an open-and-save in Studio (CM-B31)", () => {
  it("loads the letters seed and the PROD shapes", () => {
    expect(Object.keys(LETTERS).length).toBeGreaterThanOrEqual(28);
    expect(LETTERS.ba?.forms?.medial).toBe("ـبـ");
    expect(PROD_SHAPES.length).toBeGreaterThan(200);
  });

  it("checks real PROD shapes of every converted type", () => {
    const covered = new Set(PROD_SHAPES.map((r) => r.type));
    for (const type of Object.keys(CANONICAL_FORM_TYPES)) {
      expect(covered.has(type) || EXTRA_ROWS.some((r) => r.type === type), type).toBe(true);
    }
  });

  it("no converted type changes a field v1 reads beyond what Studio already did", () => {
    expect(newDifferencesByType(Object.keys(CANONICAL_FORM_TYPES))).toEqual({});
  });

  it("the changes Studio already made before CM-S3 are only the shim's known mappings", () => {
    // A missing contentType written as `letter` (show_letter_or_word), a
    // glyph correctLetter copied to targetLetter when the row has none, and a
    // missing MCQ `mode` inferred from the options (`inferOptionMode`; MCQ rows
    // with a stimulus, a stored mode or no prompt kind stay on the shim).
    const shared = sharedDifferences(Object.keys(CANONICAL_FORM_TYPES));
    if (process.env.V1_REPORT) console.log(shared.join("\n"));
    for (const d of shared) {
      expect(d).toMatch(/^(show_letter_or_word \S+ contentType: "\(absent\)" -> "letter"|pop_balloons_with_letter x-pop-1 targetLetter(\[\])?: |multiple_choice_question \S+ mode: "\(absent\)" -> "(letter|text|image)"$)/);
    }
  });

  it("the blocked types are on the shim: an open-and-save leaves the row as it was", () => {
    for (const row of PROD_SHAPES.filter((r) => V1_BLOCKED_TYPES.includes(r.type))) {
      if (Object.keys(row.config ?? {}).length === 0) continue;
      expect(openAndSave(row.type, row.config), row.id).toEqual(oldOpenAndSave(row.type, row.config));
    }
  });

  it("the comparison catches a dropped v1 field", () => {
    // Guard on the guard: removing the legacy glyph v1 reads must show up.
    const before = deliver("g", "trace_letter", { letterForm: "ب" });
    const after = deliver("g", "trace_letter", { mode: "guided" });
    expect(v1Diffs(before, after).length).toBeGreaterThan(0);
  });
});
