import type { ActivityConfig } from "./types";

/**
 * Remap legacy activity-config KEYS to the shape the v2 forms read, so editing
 * an existing activity pre-populates correctly.
 *
 * Only handles key/shape renames that differ from what forms expect; legacy
 * VALUE shapes (e.g. a raw glyph string) are tolerated downstream by the shared
 * LetterSelector. Always additive — never overwrites an existing modern value,
 * so activities already in the new shape pass through untouched. Saving rewrites
 * the config into the modern shape, so this is read-time only.
 *
 * See CONFIG_NORMALIZATION_NOTES.md for the audit behind these rules.
 */
export function normalizeActivityConfig(
  type: string | undefined,
  config: ActivityConfig,
): ActivityConfig {
  if (!type || !config) return config;

  const next: ActivityConfig = { ...config };

  switch (type) {
    case "trace_letter": {
      // Legacy: `letterForm` held a raw glyph; forms read `targetLetter`.
      if (next.targetLetter == null && next.letterForm != null) {
        next.targetLetter = next.letterForm;
      }
      break;
    }
    case "show_letter_or_word": {
      // Legacy: `letter` held the LetterReference; forms read `targetLetter`.
      if (next.targetLetter == null && next.letter != null) {
        next.targetLetter = next.letter;
      }
      break;
    }
  }

  return next;
}
