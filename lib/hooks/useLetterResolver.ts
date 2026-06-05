/**
 * useLetterResolver Hook
 *
 * A convenience hook that combines useLetters with letter resolution utilities.
 * Use this when you need to resolve LetterReference objects to display characters.
 */

import { useCallback, useMemo } from 'react';
import { useLetters, type Letter } from './useLetters';
import {
  type LetterReference,
  type LetterForm,
  isLetterReference,
  isLetterReferenceArray,
  resolveLetterToChar,
  resolveLetterWithForm,
  resolveLettersToChars,
  getLetterData,
  normalizeToLetterReference,
  createLetterReference,
} from '@/lib/utils/letterReference';

interface UseLetterResolverReturn {
  /** Whether letters are still loading */
  loading: boolean;
  /** All available letters */
  letters: Letter[];
  /**
   * Resolve a LetterReference or string to the display character (base letter)
   */
  resolveToChar: (value: unknown, defaultValue?: string | null) => string | null;
  /**
   * Resolve a LetterReference to the form-specific display character
   */
  resolveWithForm: (value: unknown, defaultValue?: string | null) => string | null;
  /**
   * Resolve an array of LetterReferences to characters
   */
  resolveArrayToChars: (values: unknown[]) => string[];
  /**
   * Get the full Letter data object
   */
  getLetterData: (value: unknown) => Letter | undefined;
  /**
   * Normalize any value to a LetterReference
   */
  normalize: (value: unknown, defaultForm?: LetterForm) => LetterReference | null;
  /**
   * Type guard for LetterReference
   */
  isLetterReference: typeof isLetterReference;
  /**
   * Type guard for LetterReference array
   */
  isLetterReferenceArray: typeof isLetterReferenceArray;
  /**
   * Create a new LetterReference
   */
  createRef: typeof createLetterReference;
}

export function useLetterResolver(): UseLetterResolverReturn {
  const { letters, loading } = useLetters();

  const resolveToChar = useCallback(
    (value: unknown, defaultValue: string | null = null) => {
      return resolveLetterToChar(value, letters, defaultValue);
    },
    [letters]
  );

  const resolveWithForm = useCallback(
    (value: unknown, defaultValue: string | null = null) => {
      return resolveLetterWithForm(value, letters, defaultValue);
    },
    [letters]
  );

  const resolveArrayToChars = useCallback(
    (values: unknown[]) => {
      return resolveLettersToChars(values, letters);
    },
    [letters]
  );

  const getLetterDataFn = useCallback(
    (value: unknown) => {
      return getLetterData(value, letters);
    },
    [letters]
  );

  const normalize = useCallback(
    (value: unknown, defaultForm: LetterForm = 'isolated') => {
      return normalizeToLetterReference(value, letters, defaultForm);
    },
    [letters]
  );

  return useMemo(
    () => ({
      loading,
      letters,
      resolveToChar,
      resolveWithForm,
      resolveArrayToChars,
      getLetterData: getLetterDataFn,
      normalize,
      isLetterReference,
      isLetterReferenceArray,
      createRef: createLetterReference,
    }),
    [loading, letters, resolveToChar, resolveWithForm, resolveArrayToChars, getLetterDataFn, normalize]
  );
}

// Re-export types for convenience
export type { LetterReference, LetterForm };
