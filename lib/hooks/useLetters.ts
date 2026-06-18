/**
 * useLetters Hook
 *
 * Manages Arabic letters state with React Query caching.
 * Letters are cached globally and rarely change, so we use a long staleTime.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient, getEnvironmentBaseUrl, getEdgeFunctionAuthHeaders } from '@/lib/supabase/client';

export interface LetterForm {
  isolated: string;
  initial: string;
  medial: string;
  final: string;
}

export interface Letter {
  id: string; // 'alif', 'ba', 'ta'
  letter: string; // 'ا', 'ب', 'ت'
  letter_number: number;
  name_english: string;
  name_arabic: string;
  transliteration: string;
  forms: LetterForm;
  diacritics?: {
    count?: number;
    position?: string;
    type?: string;
  };
  phonetics?: {
    ipa?: string;
    englishApproximation?: string;
    articulation?: string;
  };
}

interface UseLettersReturn {
  letters: Letter[];
  loading: boolean;
  error: string | null;
  getLetter: (letterId: string) => Letter | undefined;
  refetch: () => Promise<void>;
}

function getLettersApiUrl() {
  return `${getEnvironmentBaseUrl()}/functions/v1/letters/list`;
}

async function fetchLetters(): Promise<Letter[]> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(getLettersApiUrl(), {
    headers: {
      ...getEdgeFunctionAuthHeaders(session?.access_token || ''),
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to load letters');
  }

  const { data } = await response.json();
  return data || [];
}

/**
 * Letter filter functions for common use cases
 */
/**
 * Haraka (diacritic) character map
 */
export const HARAKA_CHARS: Record<string, string> = {
  fatha: "َ",
  damma: "ُ",
  kasra: "ِ",
  sukoon: "ْ",
  shadda: "ّ",
};

/**
 * Apply a haraka (diacritic) to a letter character
 */
export function applyHaraka(letter: string, haraka?: string): string {
  if (!haraka || haraka === "none") return letter;
  const char = HARAKA_CHARS[haraka];
  return char ? letter + char : letter;
}

/**
 * Get display character for a letter reference
 * Use within a component that has access to getLetter from useLetters
 */
export function getLetterDisplayChar(
  ref: { letterId: string; form: string; haraka?: string } | null | undefined,
  getLetter: (id: string) => Letter | undefined
): string {
  if (!ref) return "";
  const letterData = getLetter(ref.letterId);
  if (!letterData) return "?";
  const form = ref.form as keyof LetterForm;
  const baseChar = letterData.forms?.[form] || letterData.letter;
  return applyHaraka(baseChar, ref.haraka);
}

type LooseLetterReference = {
  letterId?: string;
  form?: string;
  haraka?: string;
};

/**
 * Resolve a possibly-legacy letter value into a normalized LetterReference.
 *
 * Accepts:
 *  - a proper LetterReference object `{ letterId, form, haraka? }` (passed through)
 *  - a raw Arabic glyph string (e.g. "ذ" or a per-form glyph) — matched back to
 *    its letter id + form via the letters table (legacy `letterForm` configs)
 *
 * Returns null when it can't be resolved. Used so letter pickers tolerate old
 * stored shapes without every form having to know about them.
 */
export function resolveLetterReference(
  value: unknown,
  letters: Letter[]
): { letterId: string; form: keyof LetterForm; haraka?: string } | null {
  if (!value) return null;

  // Already a reference-like object.
  if (typeof value === "object") {
    const ref = value as LooseLetterReference;
    if (typeof ref.letterId === "string") {
      return {
        letterId: ref.letterId,
        form: (ref.form as keyof LetterForm) || "isolated",
        ...(ref.haraka ? { haraka: ref.haraka } : {}),
      };
    }
    return null;
  }

  // Legacy: a raw glyph string. Find the letter whose base or any form glyph
  // matches, and report the matching form.
  if (typeof value === "string") {
    const glyph = value.trim();
    if (!glyph) return null;
    const forms: (keyof LetterForm)[] = ["isolated", "initial", "medial", "final"];
    for (const letter of letters) {
      if (letter.letter === glyph) return { letterId: letter.id, form: "isolated" };
      for (const form of forms) {
        if (letter.forms?.[form] === glyph) return { letterId: letter.id, form };
      }
    }
  }

  return null;
}

/**
 * Letter filter functions for common use cases
 */
export const letterFilters = {
  /** Letters with dots (all except alif, dal, thal, ra, zay, seen, sad, ta, za, ain, waw) */
  withDots: (letter: Letter): boolean => {
    const dotCount = letter.diacritics?.count;
    return dotCount !== undefined && dotCount > 0;
  },
  /** Hamza carrier letters (alif, waw, ya) */
  hamzaCarriers: (letter: Letter): boolean => {
    return ['alif', 'waw', 'ya'].includes(letter.id);
  },
  /** All letters (no filter) */
  all: (): boolean => true,
};

export function useLetters(): UseLettersReturn {
  const queryClient = useQueryClient();

  const {
    data: letters = [],
    isLoading: loading,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: ['letters'],
    queryFn: fetchLetters,
    staleTime: 30 * 60 * 1000, // 30 minutes - letters rarely change
    gcTime: 60 * 60 * 1000, // 1 hour cache time (formerly cacheTime)
  });

  const getLetter = (letterId: string): Letter | undefined => {
    return letters.find(l => l.id === letterId);
  };

  const refetch = async () => {
    await queryRefetch();
  };

  return {
    letters,
    loading,
    error: error ? (error instanceof Error ? error.message : 'Failed to load letters') : null,
    getLetter,
    refetch,
  };
}
