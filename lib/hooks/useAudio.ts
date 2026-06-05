/**
 * useAudio Hook
 *
 * Custom hook for managing audio library state and operations.
 * Provides a clean API for components to interact with audio assets.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AudioAsset, AudioCategory, AudioUploadData } from '@/lib/types/audio';
import {
  getAudioAssets,
  uploadAudioAsset,
  deleteAudioAsset,
  updateAudioAsset,
  type AudioFilters,
} from '@/lib/services/audioService';

interface UseAudioOptions {
  initialCategory?: AudioCategory;
  autoLoad?: boolean;
}

interface UseAudioReturn {
  audioAssets: AudioAsset[];
  loading: boolean;
  error: string | null;
  selectedCategory: AudioCategory | undefined;
  searchQuery: string;

  loadAudio: () => Promise<void>;
  uploadNewAudio: (data: AudioUploadData) => Promise<AudioAsset>;
  removeAudio: (audioId: string) => Promise<void>;
  updateAudio: (id: string, updates: Partial<Pick<AudioAsset, 'displayName' | 'tags' | 'metadata'>>) => Promise<AudioAsset>;
  setCategory: (category: AudioCategory | undefined) => void;
  setSearchQuery: (query: string) => void;
  refetch: () => Promise<void>;
}

/**
 * Hook for managing audio assets with filtering, search, and CRUD operations
 */
export function useAudio(options: UseAudioOptions = {}): UseAudioReturn {
  const { initialCategory, autoLoad = true } = options;

  const [audioAssets, setAudioAssets] = useState<AudioAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AudioCategory | undefined>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');

  const loadAudio = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const filters: AudioFilters = {
        category: selectedCategory,
        searchQuery: searchQuery || undefined,
      };

      const fetchedAudio = await getAudioAssets(filters);
      setAudioAssets(fetchedAudio);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load audio';
      setError(errorMessage);
      console.error('Error loading audio:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  const uploadNewAudio = useCallback(async (data: AudioUploadData): Promise<AudioAsset> => {
    setError(null);

    try {
      const newAudio = await uploadAudioAsset(data);

      if (!selectedCategory || selectedCategory === data.category) {
        setAudioAssets(prev => [newAudio, ...prev]);
      }

      return newAudio;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload audio';
      setError(errorMessage);
      throw err;
    }
  }, [selectedCategory]);

  const removeAudio = useCallback(async (audioId: string): Promise<void> => {
    setError(null);

    try {
      await deleteAudioAsset(audioId);
      setAudioAssets(prev => prev.filter(audio => audio.id !== audioId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete audio';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const updateAudio = useCallback(async (
    id: string,
    updates: Partial<Pick<AudioAsset, 'displayName' | 'tags' | 'metadata'>>
  ): Promise<AudioAsset> => {
    setError(null);

    try {
      const updated = await updateAudioAsset(id, updates);
      setAudioAssets(prev => prev.map(audio => audio.id === id ? updated : audio));
      return updated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update audio';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const setCategory = useCallback((category: AudioCategory | undefined) => {
    setSelectedCategory(category);
  }, []);

  const refetch = useCallback(() => loadAudio(), [loadAudio]);

  useEffect(() => {
    if (autoLoad) {
      loadAudio();
    }
  }, [autoLoad, loadAudio]);

  return {
    audioAssets,
    loading,
    error,
    selectedCategory,
    searchQuery,
    loadAudio,
    uploadNewAudio,
    removeAudio,
    updateAudio,
    setCategory,
    setSearchQuery,
    refetch,
  };
}
