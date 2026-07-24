import type { ActivityConfig } from "./types";

/**
 * Normalize a stored activity config into the shape the v2 forms read, so
 * editing an existing activity pre-populates correctly.
 *
 * Years of authoring tools wrote letters/options in many shapes. This is the
 * single, central place that maps every known legacy variant to the canonical
 * modern shape. Forms then read ONE shape. See CONFIG_NORMALIZATION_NOTES.md for
 * the full DB audit behind these rules.
 *
 * Scope of THIS function (key/shape remaps that forms can't infer themselves):
 *  - legacy KEYS → modern keys (letterForm/letter → targetLetter)
 *  - missing discriminators (mode / contentType) inferred from the data
 *  - glyph-string letter fields left for the shared LetterSelector to resolve
 *
 * Always additive: never overwrites an existing modern value, so configs already
 * in the new shape pass through untouched. Read-time only — saving rewrites the
 * config into the modern shape.
 */

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function normalizeActivityConfig(
  type: string | undefined,
  config: ActivityConfig,
): ActivityConfig {
  if (!type || !config) return config;

  const next: ActivityConfig = { ...config };

  switch (type) {
    case "trace_letter": {
      // Legacy `letterForm` held a raw glyph; forms read `targetLetter`.
      // The shared LetterSelector resolves the glyph → reference.
      if (next.targetLetter == null && next.letterForm != null) {
        next.targetLetter = next.letterForm;
      }
      break;
    }

    case "show_letter_or_word": {
      // Legacy `letter` (reference) → `targetLetter`. Infer contentType from
      // which field is populated when it's absent.
      if (next.targetLetter == null && next.letter != null) {
        next.targetLetter = next.letter;
      }
      if (next.contentType == null) {
        next.contentType = next.word
          ? "word"
          : next.image
            ? "image"
            : "letter";
      }
      break;
    }

    case "speech_practice": {
      // Standalone letter is mostly a reference under `letter`; the form's
      // LetterSelector reads `targetLetter`. A string `letter` is the in-word
      // focus letter (WordLetterPicker) and must be left alone.
      if (isObject(next.letter)) {
        if (next.targetLetter == null) next.targetLetter = next.letter;
        delete next.letter;
      }
      break;
    }

    case "pop_balloons_with_letter": {
      // Legacy `correctLetter` held a glyph; forms read `targetLetter`.
      if (next.targetLetter == null && next.correctLetter != null) {
        next.targetLetter = next.correctLetter;
      }
      break;
    }

    case "multiple_choice_question": {
      // `mode` discriminates how options render (letter / word / image / text).
      // When absent, infer it from the first option's populated field so the
      // grid shows the right control instead of defaulting to letter and hiding
      // text/image options.
      if (next.mode == null && Array.isArray(next.options)) {
        next.mode = inferOptionMode(next.options);
      }
      break;
    }
  }

  return next;
}

/**
 * Infer the option display mode from the populated fields of the options.
 * Order of preference: a real letter ref → image → arabic text → default text.
 */
function inferOptionMode(
  options: unknown[],
): "letter" | "word" | "image" | "text" {
  for (const opt of options) {
    if (!isObject(opt)) continue;
    if (opt.letter != null) return "letter";
    if (typeof opt.image === "string" && opt.image) return "image";
    const text = opt.text;
    if (isObject(text) && typeof text.ar === "string" && text.ar) return "text";
    if (typeof text === "string" && text) return "text";
  }
  return "text";
}
