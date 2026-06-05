/**
 * useWords Hook
 *
 * Manages word library state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient, getEnvironmentBaseUrl, getEdgeFunctionAuthHeaders } from '@/lib/supabase/client';

export interface LetterComposition {
  letter_id: string;
  position: number;
  form: 'isolated' | 'initial' | 'medial' | 'final';
  character: string;
}

export interface Word {
  id: string;
  arabic: string;
  transliteration: string | null;
  english: string | null;
  letter_composition: LetterComposition[];
  image_path: string | null;
  audio_path: string | null;
  has_image: boolean;
  has_audio: boolean;
  category: string | null;
  difficulty: number | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface WordWithActivities extends Word {
  activities?: Array<{
    activity_id: string;
    primary_focus: {
      letter_id: string;
      form: string;
    } | null;
  }>;
}

interface UseWordsOptions {
  category?: string;
  search?: string;
  missingAssets?: boolean;
}

interface UseWordsReturn {
  words: Word[];
  loading: boolean;
  error: string | null;
  selectedCategory?: string;
  searchQuery: string;
  missingAssetsOnly: boolean;
  loadWords: () => Promise<void>;
  getWord: (wordId: string) => Promise<WordWithActivities | null>;
  updateWordAssets: (wordId: string, assets: { image_path?: string; audio_path?: string }) => Promise<Word>;
  setCategory: (category: string | undefined) => void;
  setSearchQuery: (query: string) => void;
  setMissingAssetsOnly: (value: boolean) => void;
  refetch: () => Promise<void>;
}

function getWordsApiUrl() {
  return `${getEnvironmentBaseUrl()}/functions/v1/words`;
}

export function useWords(options?: UseWordsOptions): UseWordsReturn {
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(options?.category);
  const [searchQuery, setSearchQuery] = useState(options?.search || '');
  const [missingAssetsOnly, setMissingAssetsOnly] = useState(options?.missingAssets || false);

  const supabase = createClient();

  /**
   * Load words from API
   */
  const loadWords = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get auth session
      const { data: { session } } = await supabase.auth.getSession();

      // Build query params
      const params = new URLSearchParams();
      if (selectedCategory) {
        params.append('category', selectedCategory);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      if (missingAssetsOnly) {
        params.append('missing_assets', 'true');
      }

      const queryString = params.toString();
      const url = `${getWordsApiUrl()}${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        headers: {
          ...getEdgeFunctionAuthHeaders(session?.access_token || ''),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load words');
      }

      const { data } = await response.json();
      setWords(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load words';
      setError(message);
      console.error('Error loading words:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery, missingAssetsOnly, supabase]);

  /**
   * Get a single word with activities
   */
  const getWord = useCallback(async (wordId: string): Promise<WordWithActivities | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${getWordsApiUrl()}/${wordId}`, {
        headers: {
          ...getEdgeFunctionAuthHeaders(session?.access_token || ''),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get word');
      }

      const { data } = await response.json();
      return data;
    } catch (err) {
      console.error('Error getting word:', err);
      return null;
    }
  }, [supabase]);

  /**
   * Update word assets (image/audio paths)
   */
  const updateWordAssets = useCallback(async (
    wordId: string,
    assets: { image_path?: string; audio_path?: string }
  ): Promise<Word> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${getWordsApiUrl()}/${wordId}/assets`, {
        method: 'PUT',
        headers: {
          ...getEdgeFunctionAuthHeaders(session?.access_token || ''),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assets),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update word assets');
      }

      const { data } = await response.json();

      // Update local state
      setWords(prev => prev.map(w => w.id === wordId ? data : w));

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update word assets';
      throw new Error(message);
    }
  }, [supabase]);

  /**
   * Refetch words
   */
  const refetch = useCallback(async () => {
    await loadWords();
  }, [loadWords]);

  /**
   * Set category filter
   */
  const setCategory = useCallback((category: string | undefined) => {
    setSelectedCategory(category);
  }, []);

  /**
   * Set search query filter
   */
  const setSearchQueryFilter = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  /**
   * Toggle missing assets filter
   */
  const setMissingAssetsOnlyFilter = useCallback((value: boolean) => {
    setMissingAssetsOnly(value);
  }, []);

  // Load words on mount and when filters change
  useEffect(() => {
    loadWords();
  }, [loadWords]);

  return {
    words,
    loading,
    error,
    selectedCategory,
    searchQuery,
    missingAssetsOnly,
    loadWords,
    getWord,
    updateWordAssets,
    setCategory,
    setSearchQuery: setSearchQueryFilter,
    setMissingAssetsOnly: setMissingAssetsOnlyFilter,
    refetch,
  };
}
