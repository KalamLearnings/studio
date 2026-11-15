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
 *  - a missing `contentType` inferred from the data
 *
 * A missing MCQ `mode` is left missing (content model R2): v1 renders an MCQ
 * with no mode as text (`config.mode || 'text'`), and the form picks its
 * answer grid from the options themselves (`gridKindOf`). The old inference
 * (letter, then image, then text) wrote `mode: 'image'` into rows whose
 * options carry both text and a picture, which switched v1 to image-only on
 * save (activity_1765418206671, activity_1772663694035).
 *  - glyph-string letter fields left for the shared LetterSelector to resolve
 *
 * Always additive: never overwrites an existing modern value, so configs already
 * in the new shape pass through untouched. Read-time only — saving rewrites the
 * config into the modern shape.
 *
 * Content model CM-S3: for the types in `CANONICAL_FORM_TYPES`
 * (lib/activityConfig/canonical.ts) the activity form reads a stored row with
 * the server's own read schema first and uses this shim only when that read
 * fails or the row is in a mode v1 still reads from display strings.
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
  }

  return next;
}
