/**
 * Utility functions for resolving template placeholders in instruction text
 */

import type { Letter } from '@/lib/hooks/useLetters';

/**
 * Resolves template placeholders in text with actual letter values
 *
 * Supported placeholders:
 * - {{letter}} -> The Arabic character (e.g., "ب")
 * - {{letter_name}} -> Full name in Arabic (e.g., "باء")
 * - {{letter_sound}} -> Phonetic sound (e.g., "بَ")
 *
 * @param text - The text containing template placeholders
 * @param letter - The letter object with data to substitute
 * @returns The resolved text with placeholders replaced
 */
export function resolveTemplateText(text: string, letter: Letter | null | undefined): string {
  if (!letter || !text) return text;

  let resolved = text;

  // Replace {{letter}} with the Arabic character
  if (letter.letter) {
    resolved = resolved.replace(/\{\{letter\}\}/g, letter.letter);
  }

  // Replace {{letter_name}} with the Arabic name (fallback to English if not available)
  if (letter.name_arabic || letter.name_english) {
    resolved = resolved.replace(/\{\{letter_name\}\}/g, letter.name_arabic || letter.name_english);
  }

  // Replace {{letter_sound}} with transliteration
  if (letter.transliteration) {
    resolved = resolved.replace(/\{\{letter_sound\}\}/g, letter.transliteration);
  }

  return resolved;
}

/**
 * Checks if text contains any template placeholders
 */
export function hasTemplates(text: string): boolean {
  return /\{\{(letter|letter_name|letter_sound)\}\}/.test(text);
}
