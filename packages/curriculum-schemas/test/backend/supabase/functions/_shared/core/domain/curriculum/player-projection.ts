/**
 * The player projection: what the app reads from an activity. Letter
 * references become glyphs (with harakat), storage paths become public
 * URLs. Pure: the storage base URL comes in through `StorageUrlResolver`.
 */

import { applyHaraka, type OptionalHaraka } from '../../contracts/curriculum-schemas/harakat.ts';
import {
  isLetterReference,
  type LetterData,
  type LetterForm,
  type LetterReference,
  resolveLetterToCharacter,
} from './letter-reference.ts';

/** Public URLs for relative storage paths of the two curriculum buckets. */
export interface StorageUrlResolver {
  audio(path: string): string | null;
  image(path: string): string | null;
}

import type { StoredInstruction } from '../../contracts/curriculum.ts';

/** The public URL of a stored clip, as the player resolves it: absolute URLs stay as they are. */
export function resolveStoredAudioUrl(audioUrl: string, urls: StorageUrlResolver): string | null {
  return audioUrl.startsWith('http') ? audioUrl : urls.audio(audioUrl);
}

export function resolveActivityStorageUrls<
  T extends {
    instruction?: StoredInstruction | null;
    config?: Record<string, unknown> | null;
  },
>(activity: T, urls: StorageUrlResolver): T {
  const resolved = { ...activity };

  // Resolve audio_url in instruction
  if (resolved.instruction?.audio_url) {
    const audioUrl = resolved.instruction.audio_url;
    if (!audioUrl.startsWith('http')) {
      resolved.instruction = {
        ...resolved.instruction,
        audio_url: resolveStoredAudioUrl(audioUrl, urls),
      };
    }
  }

  // Resolve image URLs in config.options (for multiple choice activities)
  if (resolved.config?.options && Array.isArray(resolved.config.options)) {
    resolved.config = {
      ...resolved.config,
      options: (resolved.config.options as Array<{ image?: string }>).map(
        (option) => {
          if (option.image && !option.image.startsWith('http')) {
            return {
              ...option,
              image: urls.image(option.image),
            };
          }
          return option;
        },
      ),
    };
  }

  // Resolve direct image_url in config
  if (
    resolved.config?.image_url && typeof resolved.config.image_url === 'string'
  ) {
    const imageUrl = resolved.config.image_url as string;
    if (!imageUrl.startsWith('http')) {
      resolved.config = {
        ...resolved.config,
        image_url: urls.image(imageUrl),
      };
    }
  }

  // Resolve audio_url in conditionalAudio rules
  if (resolved.config?.conditionalAudio) {
    const conditionalAudio = resolved.config.conditionalAudio as Record<
      string,
      unknown
    >;
    if (Array.isArray(conditionalAudio.rules)) {
      const resolvedRules = (
        conditionalAudio.rules as Array<{
          response?: { audio_url?: string };
        }>
      ).map((rule) => {
        if (
          rule.response?.audio_url &&
          !rule.response.audio_url.startsWith('http')
        ) {
          return {
            ...rule,
            response: {
              ...rule.response,
              audio_url: urls.audio(rule.response.audio_url),
            },
          };
        }
        return rule;
      });
      resolved.config = {
        ...resolved.config,
        conditionalAudio: {
          ...conditionalAudio,
          rules: resolvedRules,
        },
      };
    }
  }

  return resolved;
}

/**
 * Enrich activity config with resolved letter characters
 * Supports both old format (string) and new format ({ letterId, form })
 *
 * Old format examples:
 *   letter: "ba" or "ب"
 *   targetLetter: "alif"
 *   distractorLetters: ["ba", "ta", "tha"]
 *
 * New format examples:
 *   letter: { letterId: "ba", form: "isolated" }
 *   targetLetter: { letterId: "alif", form: "initial" }
 *   distractorLetters: [
 *     { letterId: "ba", form: "isolated" },
 *     { letterId: "ta", form: "initial" }
 *   ]
 */
export function enrichActivityConfig(
  activity: { type: string; config: Record<string, unknown> | null },
  lettersMap: Record<string, LetterData>,
  urls: StorageUrlResolver,
): Record<string, unknown> | null {
  const config = activity.config;
  if (!config) return config;

  let enrichedConfig = { ...config };

  // Default form for old format (used when no per-field form is specified)
  // Check letterForm, showInForm, and position (used by drag_dots_to_letter)
  const defaultForm = (config.letterForm as LetterForm) ||
    (config.showInForm as LetterForm) ||
    (config.position as LetterForm) || 'isolated';

  // Resolve letter field (handles both letter and letter_id)
  const letterValue = config.letter ?? config.letter_id;
  if (letterValue) {
    const resolved = resolveLetterToCharacter(
      letterValue,
      lettersMap,
      defaultForm,
    );
    if (resolved) {
      enrichedConfig = { ...enrichedConfig, letter: resolved };
    }
  }

  // Resolve targetLetter (supports both single value and array)
  if (config.targetLetter) {
    if (Array.isArray(config.targetLetter)) {
      // New format: array of LetterReferences - resolve to array of { letter, form, haraka? } objects
      const resolvedTargets = (config.targetLetter as unknown[])
        .map((item) => {
          if (isLetterReference(item)) {
            const letterData = lettersMap[item.letterId];
            if (letterData) {
              const form = item.form || defaultForm;
              const baseChar = letterData.forms?.[form] || letterData.letter;
              // Apply haraka if present
              const resolvedChar = applyHaraka(baseChar, item.haraka);
              // Additive (D7): madd rides along only when set, so older payloads are unchanged.
              return {
                letter: resolvedChar,
                form,
                haraka: item.haraka,
                ...(item.madd === true && { madd: true }),
              };
            }
          }
          // Fallback: if it's already a string, wrap it
          if (typeof item === 'string') {
            return { letter: item, form: defaultForm };
          }
          return null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      if (resolvedTargets.length > 0) {
        enrichedConfig = { ...enrichedConfig, targetLetter: resolvedTargets };
        // For backward compatibility, also set letter to first target
        const firstTarget = resolvedTargets[0];
        enrichedConfig = {
          ...enrichedConfig,
          letter: firstTarget.letter,
          letterForm: firstTarget.letter,
        };
      }
    } else if (isLetterReference(config.targetLetter)) {
      // New format: single LetterReference with possible haraka
      const letterRef = config.targetLetter as LetterReference;
      const letterData = lettersMap[letterRef.letterId];
      if (letterData) {
        // For tap_letter_in_word, always use the base letter character (not form-specific)
        // because Arabic word strings contain base characters, not tatweel-decorated forms
        const isWordActivity = activity.type === 'tap_letter_in_word';
        const baseChar = isWordActivity
          ? letterData.letter
          : (letterData.forms?.[letterRef.form || defaultForm] ||
            letterData.letter);
        const resolvedChar = applyHaraka(baseChar, letterRef.haraka);

        enrichedConfig = {
          ...enrichedConfig,
          targetLetter: resolvedChar,
          targetHaraka: letterRef.haraka || null,
          letter: resolvedChar,
          letterForm: resolvedChar,
        };
      }
    } else {
      // Old format: string value
      const resolved = resolveLetterToCharacter(
        config.targetLetter,
        lettersMap,
        defaultForm,
      );
      if (resolved) {
        enrichedConfig = { ...enrichedConfig, targetLetter: resolved };
        // Also set letter and letterForm for backward compatibility with mobile app
        // Different activities expect different field names
        enrichedConfig = {
          ...enrichedConfig,
          letter: resolved,
          letterForm: resolved,
        };
      }
    }
  }

  // Resolve distractorLetters array
  if (config.distractorLetters && Array.isArray(config.distractorLetters)) {
    // Check if first item is a LetterReference (new format with form info)
    const firstItem = config.distractorLetters[0];
    const isNewFormat = firstItem && isLetterReference(firstItem);

    if (isNewFormat) {
      // New format: array of LetterReferences - resolve to array of { letter, form, haraka? } objects
      const resolvedDistractors = (config.distractorLetters as unknown[])
        .map((item) => {
          if (isLetterReference(item)) {
            const letterData = lettersMap[item.letterId];
            if (letterData) {
              const form = item.form || defaultForm;
              const baseChar = letterData.forms?.[form] || letterData.letter;
              // Apply haraka if present
              const resolvedChar = applyHaraka(baseChar, item.haraka);
              // Additive (D7): madd rides along only when set, so older payloads are unchanged.
              return {
                letter: resolvedChar,
                form,
                haraka: item.haraka,
                ...(item.madd === true && { madd: true }),
              };
            }
          }
          // Fallback: if it's already a string, wrap it
          if (typeof item === 'string') {
            return { letter: item, form: defaultForm };
          }
          return null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      enrichedConfig = {
        ...enrichedConfig,
        distractorLetters: resolvedDistractors,
      };
    } else {
      // Old format: array of strings/IDs - resolve to array of strings
      const resolvedDistractors = (config.distractorLetters as unknown[])
        .map((item) => resolveLetterToCharacter(item, lettersMap, defaultForm))
        .filter((char): char is string => char !== null);

      enrichedConfig = {
        ...enrichedConfig,
        distractorLetters: resolvedDistractors,
      };
    }
  }

  // Resolve confusableLetter
  if (config.confusableLetter) {
    const resolved = resolveLetterToCharacter(
      config.confusableLetter,
      lettersMap,
      defaultForm,
    );
    if (resolved) {
      enrichedConfig = { ...enrichedConfig, confusableLetter: resolved };
    }
  }

  // Resolve letters array (used by memory_card_match)
  // Supports both simple strings and objects with form/matchingForm/audioId
  if (config.letters && Array.isArray(config.letters)) {
    const resolvedLetters = (config.letters as unknown[])
      .map((item) => {
        // Check if item is an object with letterId (new format)
        if (
          typeof item === 'object' &&
          item !== null &&
          'letterId' in item
        ) {
          const letterObj = item as {
            letterId: string;
            form: string;
            haraka?: OptionalHaraka;
            matchingForm?: string;
            audioId?: string;
          };

          // Resolve letter characters
          const card1 = resolveLetterToCharacter(
            {
              letterId: letterObj.letterId,
              form: letterObj.form,
              haraka: letterObj.haraka,
            },
            lettersMap,
            defaultForm,
          );

          // For cross-form matching, resolve the matching form
          if (letterObj.matchingForm) {
            const card2 = resolveLetterToCharacter(
              {
                letterId: letterObj.letterId,
                form: letterObj.matchingForm,
                haraka: letterObj.haraka,
              },
              lettersMap,
              defaultForm,
            );
            if (card1 && card2) {
              return { card1, card2 };
            }
            return null;
          }

          // For letter_to_sound mode with audioPath
          // Resolve audioPath to a public URL
          const letterObjWithAudio = letterObj as {
            letterId: string;
            form: string;
            matchingForm?: string;
            audioId?: string;
            audioPath?: string;
          };
          if (letterObjWithAudio.audioPath) {
            const audioUrl = letterObjWithAudio.audioPath.startsWith('http')
              ? letterObjWithAudio.audioPath
              : urls.audio(letterObjWithAudio.audioPath);
            return {
              letterId: letterObjWithAudio.letterId,
              form: letterObjWithAudio.form,
              card1: card1 || letterObjWithAudio.letterId,
              card2: card1 || letterObjWithAudio.letterId,
              audioUrl,
            };
          }

          // Standard letter
          return card1;
        }
        // Simple resolution for regular letters
        const resolved = resolveLetterToCharacter(
          item,
          lettersMap,
          defaultForm,
        );
        return resolved;
      })
      .filter((
        item,
      ): item is string | { card1: string; card2: string } | {
        letterId: string;
        form: string;
        card1: string;
        card2: string;
        audioUrl: string | null;
      } => item !== null);

    if (resolvedLetters.length > 0) {
      enrichedConfig = { ...enrichedConfig, letters: resolvedLetters };
    }
  }

  // Resolve content_with_cards: populate content.letter from already-resolved letter
  // Dashboard stores targetLetter at config level, mobile app expects content.letter
  if (config.contentType === 'letter' && enrichedConfig.letter) {
    const existingContent = (config.content || {}) as Record<string, unknown>;
    enrichedConfig = {
      ...enrichedConfig,
      content: { ...existingContent, letter: enrichedConfig.letter },
    };
  }

  // Resolve cards array (used by content_with_cards)
  // Each card may have a 'letter' field with { letterId, form }
  if (config.cards && Array.isArray(config.cards)) {
    const resolvedCards = (config.cards as Array<{
      id?: string;
      text?: string;
      letter?: unknown;
      image?: string;
      isCorrect?: boolean;
    }>).map((card) => {
      if (card.letter && isLetterReference(card.letter)) {
        const letterData = lettersMap[card.letter.letterId];
        if (letterData) {
          const form = card.letter.form || defaultForm;
          const baseChar = letterData.forms?.[form] || letterData.letter;
          // Apply the haraka diacritic if set, like the other resolvers do.
          const resolvedChar = applyHaraka(baseChar, card.letter.haraka);
          return {
            ...card,
            // Keep the original letter reference for reference
            // Add resolved 'text' field with the actual character for display
            text: resolvedChar,
            // Also add letterDisplay for explicit resolved character
            letterDisplay: resolvedChar,
          };
        }
      }
      return card;
    });

    enrichedConfig = { ...enrichedConfig, cards: resolvedCards };
  }

  // Resolve content object (used by content_with_cards for main display)
  // Handle case where content.letter is a LetterReference
  if (config.content && typeof config.content === 'object') {
    const content = config.content as {
      letter?: unknown;
      word?: string;
      image?: string;
    };

    if (content.letter && isLetterReference(content.letter)) {
      const letterData = lettersMap[content.letter.letterId];
      if (letterData) {
        const form = content.letter.form || defaultForm;
        const baseChar = letterData.forms?.[form] || letterData.letter;
        const resolvedChar = applyHaraka(baseChar, content.letter.haraka);
        enrichedConfig = {
          ...enrichedConfig,
          content: {
            ...content,
            letter: resolvedChar,
          },
        };
      }
    }
  }

  // Resolve multiple_choice_question options that carry a letter reference
  // ({ letterId, form, haraka }) with empty text. Without this the option has
  // no renderable content and the card shows blank in the app. We resolve the
  // contextual form + haraka into the option's text so the existing text/letter
  // rendering has something to show.
  if (Array.isArray(config.options)) {
    const options = config.options as Array<{
      letter?: unknown;
      text?: { en?: string; ar?: string };
      [key: string]: unknown;
    }>;
    const anyLetterOption = options.some((opt) => isLetterReference(opt.letter));

    if (anyLetterOption) {
      enrichedConfig = {
        ...enrichedConfig,
        options: options.map((opt) => {
          if (!isLetterReference(opt.letter)) return opt;
          // Only fill empty text: a stale letter ref left over from a mode
          // switch in the dashboard must not clobber an authored word.
          if (opt.text?.ar) return opt;
          const ref = opt.letter as LetterReference;
          const letterData = lettersMap[ref.letterId];
          if (!letterData) return opt;

          const baseChar = letterData.forms?.[ref.form || defaultForm] ||
            letterData.letter;
          const resolvedChar = applyHaraka(baseChar, ref.haraka);

          return {
            ...opt,
            // Fill the Arabic text so the option renders; keep any existing
            // English text. Leaves the original `letter` ref intact.
            text: { ...(opt.text ?? {}), ar: resolvedChar },
          };
        }),
      };
    }
  }

  return enrichedConfig;
}
